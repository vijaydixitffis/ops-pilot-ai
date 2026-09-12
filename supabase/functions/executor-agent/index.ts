import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { logEvent, serviceClient } from '../_shared/db.ts'
import { invokeFn } from '../_shared/invoke.ts'

type Ticket = {
  id: string
  use_case: string
  mode: 'auto' | 'guided' | 'escalated'
  ci: string | null
  pending_action: { step_index: number } | null
}

type Step = {
  name: string
  guarded: boolean // requires an explicit approval click in guided mode
  run: (t: Ticket) => Promise<void>
}

const supabase = serviceClient()

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
        { name: 'collect_logs', guarded: false, run: async (t) => {
          await logEvent(t.id, 'AGENT', 'info', 'Collecting IDPA ACM + ESXi host logs (read-only)')
          await supabase.from('tickets').update({ status: 'auto_resolved' }).eq('id', t.id)
          await logEvent(t.id, 'AGENT', 'info', 'Log bundle collected and attached. Ticket closed.')
        } },
      ]

    case 'cert_renewal':
      return [
        { name: 'precheck', guarded: false, run: async (t) => {
          await invokeFn('avamar-keystore', { ticket_id: t.id, device_id: device, action: 'precheck' })
        } },
        { name: 'renew', guarded: true, run: async (t) => {
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
        { name: 'check_status', guarded: false, run: async (t) => {
          await invokeFn('idrac-virtual-disk', { ticket_id: t.id, node: device })
        } },
        { name: 'check_sds', guarded: false, run: async (t) => {
          await invokeFn('powerflex-sds-status', { ticket_id: t.id, hostname: device })
        } },
        { name: 'enable_maintenance', guarded: true, run: async (t) => {
          await invokeFn('powerflex-maintenance-mode', { ticket_id: t.id, hostname: device, enabled: true })
        } },
        { name: 'reboot', guarded: true, run: async (t) => {
          await invokeFn('idrac-reboot', { ticket_id: t.id, node: device })
        } },
        { name: 'revalidate', guarded: false, run: async (t) => {
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
        { name: 'check_port', guarded: false, run: async (t) => {
          await invokeFn('idrac-nic-status', { ticket_id: t.id, node: device, port: 'slot2_port2' })
        } },
        { name: 'flap_port', guarded: false, run: async (t) => {
          await invokeFn('idrac-nic-flap', { ticket_id: t.id, node: device, port: 'slot2_port2' })
        } },
        { name: 'escalate', guarded: false, run: async (t) => {
          await openVendorCase(t.id, { status: 'logs_uploaded' })
          await supabase.from('tickets').update({ status: 'escalated' }).eq('id', t.id)
          await logEvent(t.id, 'AGENT', 'info', 'No software remedy exists — vendor case opened, TSR logs uploaded. Ticket left escalated, not closed.')
        } },
      ]

    case 'cpu_usage_alert':
      return [
        { name: 'check_cpu', guarded: false, run: async (t) => {
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
  let startIndex = resume ? (ticket.pending_action?.step_index ?? 0) : 0

  await supabase.from('agent_runs').insert({ ticket_id, agent: 'executor', input: { resume }, output: null })

  try {
  for (let i = startIndex; i < steps.length; i++) {
    const step = steps[i]
    const needsGate = ticket.mode === 'guided' && step.guarded && !(resume && i === startIndex)

    if (needsGate) {
      await supabase.from('tickets').update({
        status: 'needs_approval',
        pending_action: { step_index: i, step_name: step.name },
      }).eq('id', ticket_id)
      await logEvent(ticket_id, 'AGENT', 'info', `Approval gate: ${step.name} — awaiting L1/admin approval`)
      return jsonResponse({ paused_at: step.name })
    }

    await step.run(ticket)
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
