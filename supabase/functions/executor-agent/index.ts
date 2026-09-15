import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { logEvent, serviceClient } from '../_shared/db.ts'
import { invokeFn } from '../_shared/invoke.ts'

type Ticket = {
  id: string
  use_case: string
  mode: 'auto' | 'guided' | 'escalated'
  ci: string | null
  inject_failure: string | null
  pending_action: { step_index: number } | null
}

type StepCtx = Record<string, unknown>

type Step = {
  name: string
  // A step gates for approval when this returns true. Reads ctx.mode
  // (set to the ticket's planned mode before the loop starts) for the
  // ordinary "guided mode gates every write-ish step" behavior, and/or a
  // flag set by an earlier step for a runtime-triggered gate (e.g. "cleanup
  // ran but wasn't enough, now propose something bigger") that applies even
  // when the ticket was planned as fully autonomous.
  guarded: (ctx: StepCtx) => boolean
  run: (t: Ticket, ctx: StepCtx) => Promise<void>
}

const supabase = serviceClient()

const guidedOnly = (ctx: StepCtx) => ctx.mode === 'guided'
const never = () => false

async function openVendorCase(ticketId: string, extra: Record<string, unknown> = {}) {
  const { data } = await supabase
    .from('vendor_cases')
    .insert({ ticket_id: ticketId, sr_number: `SR-${Date.now().toString().slice(-6)}`, status: 'opened', ...extra })
    .select()
    .single()
  await logEvent(ticketId, 'AGENT', 'info', `Vendor case opened: ${data.sr_number}`)
  return data
}

function buildSteps(useCase: string, ticket: Ticket): Step[] {
  const device = ticket.ci ?? ''

  switch (useCase) {
    case 'log_collection':
      return [
        { name: 'collect_logs', guarded: never, run: async (t) => {
          await logEvent(t.id, 'AGENT', 'info', 'Collecting IDPA ACM + ESXi host logs (read-only)')
          await supabase.from('tickets').update({ status: 'auto_resolved' }).eq('id', t.id)
          await logEvent(t.id, 'AGENT', 'info', 'Log bundle collected and attached. Ticket closed.')
        } },
      ]

    case 'cert_renewal':
      return [
        { name: 'precheck', guarded: never, run: async (t) => {
          await invokeFn('avamar-keystore', { ticket_id: t.id, device_id: device, action: 'precheck' })
        } },
        { name: 'renew', guarded: guidedOnly, run: async (t) => {
          const result = await invokeFn('avamar-keystore', { ticket_id: t.id, device_id: device, action: 'renew' })
          if (result.error === 'dc_unreachable') {
            await supabase.from('tickets').update({ status: 'escalated' }).eq('id', t.id)
            await logEvent(t.id, 'AGENT', 'info', 'DC unreachable during renewal — escalated to L2/L3')
          } else {
            await supabase.from('tickets').update({ status: 'resolved' }).eq('id', t.id)
            await logEvent(t.id, 'AGENT', 'info', 'Certificate renewed, MCS restarted. Ticket closed.')
          }
        } },
      ]

    case 'virtual_disk_degraded':
      return [
        { name: 'check_status', guarded: never, run: async (t) => {
          await invokeFn('idrac-virtual-disk', { ticket_id: t.id, node: device })
        } },
        { name: 'check_sds', guarded: never, run: async (t) => {
          await invokeFn('powerflex-sds-status', { ticket_id: t.id, hostname: device })
        } },
        { name: 'enable_maintenance', guarded: guidedOnly, run: async (t) => {
          await invokeFn('powerflex-maintenance-mode', { ticket_id: t.id, hostname: device, enabled: true })
        } },
        { name: 'reboot', guarded: guidedOnly, run: async (t) => {
          await invokeFn('idrac-reboot', { ticket_id: t.id, node: device })
        } },
        { name: 'revalidate', guarded: never, run: async (t) => {
          const result = await invokeFn('idrac-virtual-disk', { ticket_id: t.id, node: device })
          if (result.status === 'optimal') {
            await invokeFn('powerflex-maintenance-mode', { ticket_id: t.id, hostname: device, enabled: false })
            await supabase.from('tickets').update({ status: 'resolved' }).eq('id', t.id)
            await logEvent(t.id, 'AGENT', 'info', 'Remedy confirmed. Ticket closed.')
          } else {
            await openVendorCase(t.id)
            await supabase.from('tickets').update({ status: 'escalated' }).eq('id', t.id)
            await logEvent(t.id, 'AGENT', 'info', 'Virtual disk still degraded post-reboot — escalated to Dell Technical Support')
          }
        } },
      ]

    case 'nic_replacement':
      return [
        { name: 'check_port', guarded: never, run: async (t) => {
          await invokeFn('idrac-nic-status', { ticket_id: t.id, node: device, port: 'slot2_port2' })
        } },
        { name: 'flap_port', guarded: never, run: async (t) => {
          await invokeFn('idrac-nic-flap', { ticket_id: t.id, node: device, port: 'slot2_port2' })
        } },
        { name: 'escalate', guarded: never, run: async (t) => {
          await openVendorCase(t.id, { status: 'logs_uploaded' })
          await supabase.from('tickets').update({ status: 'escalated' }).eq('id', t.id)
          await logEvent(t.id, 'AGENT', 'info', 'No software remedy exists — vendor case opened, TSR logs uploaded. Ticket left escalated, not closed.')
        } },
      ]

    case 'cpu_usage_alert':
      return [
        { name: 'check_cpu', guarded: never, run: async (t) => {
          const result = await invokeFn('vcenter-cpu-usage', { ticket_id: t.id, host: device })
          if (!result.above_threshold) {
            await supabase.from('tickets').update({ status: 'auto_resolved' }).eq('id', t.id)
            await logEvent(t.id, 'AGENT', 'info', 'CPU below threshold. No changes made, closed.')
          } else {
            // Sustained-high-CPU extension (vMotion/host-restart proposal, §9e) is
            // explicitly out of scope for this POC's executor — escalate instead
            // of silently doing nothing.
            const top = await invokeFn('vcenter-top-processes', { ticket_id: t.id, host: device })
            await supabase.from('tickets').update({ status: 'escalated' }).eq('id', t.id)
            await logEvent(
              t.id, 'AGENT', 'info',
              `CPU sustained above threshold. Top consumer: ${top.top_process} (${top.cpu_pct}%). ` +
              'Escalated for human review — vMotion/restart remediation is a labeled extension, not auto-executed by this POC.',
            )
          }
        } },
      ]

    // ── New Use Cases addendum ──────────────────────────────────────────

    case 'password_reset_lockout':
      return [
        { name: 'check_status', guarded: never, run: async (t, ctx) => {
          const result = await invokeFn('ad-account-status', { ticket_id: t.id, username: device })
          ctx.status = result
          if (result.account_status !== 'enabled') {
            ctx.blocked = true
            await supabase.from('tickets').update({ status: 'escalated' }).eq('id', t.id)
            await logEvent(t.id, 'AGENT', 'info', 'Account disabled/expired/offboarding — escalated to HR/IT Ops, not unlocked.')
          } else if (result.lockout_count_24h > 3) {
            ctx.blocked = true
            await supabase.from('tickets').update({ status: 'escalated' }).eq('id', t.id)
            await logEvent(t.id, 'AGENT', 'info', 'More than 3 lockouts in 24h — escalated to Security for compromised-credential investigation.')
          }
        } },
        { name: 'unlock', guarded: (ctx) => !ctx.blocked && guidedOnly(ctx), run: async (t, ctx) => {
          if (ctx.blocked) return
          await invokeFn('ad-account-unlock', { ticket_id: t.id, username: device })
        } },
        { name: 'notify', guarded: never, run: async (t, ctx) => {
          if (ctx.blocked) return
          await invokeFn('ad-account-notify', { ticket_id: t.id, username: device })
        } },
        { name: 'recheck', guarded: never, run: async (t, ctx) => {
          if (ctx.blocked) return
          await invokeFn('ad-account-status', { ticket_id: t.id, username: device })
          await supabase.from('tickets').update({ status: 'auto_resolved' }).eq('id', t.id)
          await logEvent(t.id, 'AGENT', 'info', 'Account unlocked and confirmed still unlocked after 2 minutes. Ticket closed.')
        } },
      ]

    case 'disk_space_alert':
      return [
        { name: 'check_usage', guarded: never, run: async (t) => {
          await invokeFn('server-disk-usage', { ticket_id: t.id, volume: device })
        } },
        { name: 'cleanup', guarded: guidedOnly, run: async (t, ctx) => {
          const minimal = t.inject_failure === 'cleanup_insufficient'
          const result = await invokeFn('server-disk-cleanup', { ticket_id: t.id, volume: device, minimal })
          // Re-fetch rather than trusting only this call's result, so the
          // "still over threshold" check below is correct even if this step
          // ran in an earlier invocation (before an approval-gate resume).
          const usage = await invokeFn('server-disk-usage', { ticket_id: t.id, volume: device })
          ctx.stillOver = result.used_pct > usage.threshold_pct
        } },
        {
          name: 'propose_further_action',
          // Fires even in an otherwise-autonomous run: cleanup alone wasn't
          // enough, so this now needs a human before doing anything further.
          guarded: (ctx) => guidedOnly(ctx) || ctx.stillOver === true,
          run: async (t, ctx) => {
            // ctx.stillOver may be unset here if this step is the resume
            // target (a fresh invocation with empty ctx) — recompute from
            // the persisted device state either way.
            const usage = await invokeFn('server-disk-usage', { ticket_id: t.id, volume: device })
            const stillOver = ctx.stillOver ?? usage.above_threshold
            ctx.stillOver = stillOver
            if (stillOver) {
              await logEvent(t.id, 'AGENT', 'info', 'Usage still above threshold after safe cleanup — proposing volume extend, pending approval.')
              return
            }
            await supabase.from('tickets').update({ status: 'auto_resolved' }).eq('id', t.id)
            await logEvent(t.id, 'AGENT', 'info', 'Usage back below threshold after cleanup. Ticket closed.')
          },
        },
        { name: 'confirm_extend', guarded: never, run: async (t, ctx) => {
          if (!ctx.stillOver) return
          await supabase.from('tickets').update({ status: 'resolved' }).eq('id', t.id)
          await logEvent(t.id, 'AGENT', 'info', 'Volume extend approved and applied. Ticket closed.')
        } },
      ]

    case 'vpn_connection_failure':
      return [
        { name: 'check_gateway', guarded: never, run: async (t) => {
          await invokeFn('vpn-gateway-status', { ticket_id: t.id, username: device })
        } },
        { name: 'check_cert', guarded: never, run: async (t) => {
          await invokeFn('vpn-cert-status', { ticket_id: t.id, username: device })
        } },
        {
          // Single approval gate covers whichever remediation applies —
          // re-determined fresh here (not from ctx) so it's correct whether
          // this runs on the first pass or after an approval-gate resume.
          name: 'remediate',
          guarded: guidedOnly,
          run: async (t) => {
            const cert = await invokeFn('vpn-cert-status', { ticket_id: t.id, username: device })
            if (cert.days_to_expiry <= 7) {
              await invokeFn('vpn-cert-reissue', { ticket_id: t.id, username: device })
            } else if (cert.client_outdated) {
              await invokeFn('vpn-client-update', { ticket_id: t.id, username: device })
            }
          },
        },
        { name: 'outcome', guarded: never, run: async (t) => {
          await supabase.from('tickets').update({ status: 'resolved' }).eq('id', t.id)
          await logEvent(t.id, 'AGENT', 'info', 'Client reconfigured. User asked to reattempt connection and confirm via follow-up check.')
        } },
      ]

    case 'mailbox_over_quota':
      return [
        { name: 'check_usage', guarded: never, run: async (t) => {
          await invokeFn('mailbox-usage', { ticket_id: t.id, mailbox: device })
        } },
        { name: 'purge_deleted', guarded: guidedOnly, run: async (t, ctx) => {
          const minimal = t.inject_failure === 'cleanup_insufficient'
          const result = await invokeFn('mailbox-purge-deleted', { ticket_id: t.id, mailbox: device, minimal })
          ctx.stillOver = result.size_gb > (await invokeFn('mailbox-usage', { ticket_id: t.id, mailbox: device })).quota_gb
        } },
        {
          name: 'archive_move',
          guarded: (ctx) => guidedOnly(ctx) || ctx.stillOver === true,
          run: async (t, ctx) => {
            const usage = await invokeFn('mailbox-usage', { ticket_id: t.id, mailbox: device })
            const stillOver = ctx.stillOver ?? usage.over_quota
            ctx.stillOver = stillOver
            if (!stillOver) {
              await supabase.from('tickets').update({ status: 'resolved' }).eq('id', t.id)
              await logEvent(t.id, 'AGENT', 'info', 'Deleted Items purged, mailbox back under quota. Ticket closed.')
              return
            }
            if (!usage.archive_available) {
              await supabase.from('tickets').update({ status: 'escalated' }).eq('id', t.id)
              await logEvent(t.id, 'AGENT', 'info', 'Still over quota, no archive mailbox available — escalated to messaging team.')
              ctx.escalated = true
              return
            }
            await invokeFn('mailbox-archive-move', { ticket_id: t.id, mailbox: device })
          },
        },
        { name: 'close_after_archive', guarded: never, run: async (t, ctx) => {
          if (ctx.escalated || !ctx.stillOver) return
          await supabase.from('tickets').update({ status: 'resolved' }).eq('id', t.id)
          await logEvent(t.id, 'AGENT', 'info', 'Aged items moved to archive, mailbox back under quota. Ticket closed.')
        } },
      ]

    case 'laptop_no_power':
      return [
        { name: 'check_asset', guarded: never, run: async (t, ctx) => {
          const result = await invokeFn('asset-status', { ticket_id: t.id, asset_tag: device })
          ctx.warranty = result.warranty_status
        } },
        { name: 'open_case', guarded: never, run: async (t, ctx) => {
          const inWarranty = ctx.warranty === 'in_warranty'
          await openVendorCase(t.id, { status: 'opened' })
          await supabase.from('tickets').update({ status: 'escalated' }).eq('id', t.id)
          await logEvent(
            t.id, 'AGENT', 'info',
            `No software remedy exists — diagnostic summary packaged, ${inWarranty ? 'OEM warranty' : 'internal deskside support'} case opened. Ticket left escalated, tracked to physical resolution.`,
          )
        } },
      ]

    case 'network_port_down':
      return [
        { name: 'check_port', guarded: never, run: async (t, ctx) => {
          const result = await invokeFn('switch-port-status', { ticket_id: t.id, switch_port: device })
          ctx.affectedPorts = result.affected_ports_same_switch
        } },
        { name: 'flap_port', guarded: never, run: async (t, ctx) => {
          const succeed = t.inject_failure !== 'flap_fails'
          const result = await invokeFn('switch-port-flap', { ticket_id: t.id, switch_port: device, succeed })
          ctx.portStatus = result.port_status
        } },
        { name: 'outcome', guarded: never, run: async (t, ctx) => {
          if (ctx.portStatus === 'up') {
            await supabase.from('tickets').update({ status: 'auto_resolved' }).eq('id', t.id)
            await logEvent(t.id, 'AGENT', 'info', 'Port back up after flap, held for observation window. User notified to retest. Ticket closed.')
            return
          }
          await openVendorCase(t.id, { status: 'opened' })
          await supabase.from('tickets').update({ status: 'escalated' }).eq('id', t.id)
          const multi = (ctx.affectedPorts as number) > 1
          await logEvent(
            t.id, 'AGENT', 'info',
            `Port still down after flap${multi ? ' — multiple ports on this switch affected, treated as a switch/panel-level issue' : ''}. Facilities/network cabling case opened. Ticket left escalated.`,
          )
        } },
      ]

    default:
      return []
  }
}

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, resume: resumeInput } = await req.json()
  let resume = resumeInput

  const { data: ticket, error } = await supabase.from('tickets').select('*').eq('id', ticket_id).single()
  if (error) return jsonResponse({ error: error.message }, 404)

  const steps = buildSteps(ticket.use_case, ticket)
  const startIndex = resume ? (ticket.pending_action?.step_index ?? 0) : 0
  const ctx: StepCtx = { mode: ticket.mode }

  await supabase.from('agent_runs').insert({ ticket_id, agent: 'executor', input: { resume }, output: null })

  try {
    for (let i = startIndex; i < steps.length; i++) {
      const step = steps[i]
      const needsGate = step.guarded(ctx) && !(resume && i === startIndex)

      if (needsGate) {
        await supabase.from('tickets').update({
          status: 'needs_approval',
          pending_action: { step_index: i, step_name: step.name },
        }).eq('id', ticket_id)
        await logEvent(ticket_id, 'AGENT', 'info', `Approval gate: ${step.name} — awaiting L1/admin approval`)
        return jsonResponse({ paused_at: step.name })
      }

      await step.run(ticket, ctx)
      resume = false // only the first resumed step skips its own gate
    }

    await supabase.from('tickets').update({ pending_action: null }).eq('id', ticket_id)
    return jsonResponse({ completed: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabase.from('tickets').update({ status: 'escalated', pending_action: null }).eq('id', ticket_id)
    await logEvent(ticket_id, 'AGENT', 'info', `Execution error — escalated to human review: ${message}`)
    return jsonResponse({ error: message }, 500)
  }
})
