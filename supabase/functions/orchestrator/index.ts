import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { logEvent, serviceClient } from '../_shared/db.ts'
import { invokeFn } from '../_shared/invoke.ts'

const supabase = serviceClient()

// inject_failure values meant to represent the "escalate variant" of a
// scenario short-circuit straight to escalation (low confidence, no
// execution attempted) — matching how the original 5 use cases' inject
// toggles work. Other inject_failure values (e.g. "cleanup_insufficient")
// are "ambiguous variant" markers the executor itself branches on after
// actually running its steps — those are NOT in this set, so confidence
// stays high and execution proceeds normally.
const HARD_ESCALATE_INJECTS = new Set([
  'dc_unreachable', 'vdisk_degraded', 'nic_persists', 'cpu_high',
  'repeat_lockout_unrecognized_ip', 'disk_rapid_growth', 'vpn_gateway_outage', 'mailbox_rapid_growth',
])

// Runs the full triage -> retrieval -> planner -> executor pipeline for a
// freshly ingested ticket/alert.
async function runPipeline(ticketId: string) {
  const triage = await invokeFn('triage-agent', { ticket_id: ticketId })

  const { data: ticket } = await supabase.from('tickets').select('*').eq('id', ticketId).single()

  const retrieval = await invokeFn('retrieval-agent', { ticket_id: ticketId, use_case: triage.use_case })

  const executionConfidence = HARD_ESCALATE_INJECTS.has(ticket.inject_failure) ? 0.3 : 0.95

  const plan = await invokeFn('planner-agent', {
    ticket_id: ticketId,
    classification_confidence: triage.confidence,
    execution_confidence: executionConfidence,
    steps: retrieval.steps,
  })

  if (plan.mode === 'escalated') {
    await supabase.from('tickets').update({ status: 'escalated' }).eq('id', ticketId)
    await logEvent(ticketId, 'AGENT', 'info', 'Confidence too low — escalated to human agent with full context')
    return { plan }
  }

  const exec = await invokeFn('executor-agent', { ticket_id: ticketId, resume: false })
  return { plan, exec }
}

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, action } = await req.json()

  if (action === 'approve') {
    await logEvent(ticket_id, 'AGENT', 'info', 'Approval received — resuming execution')
    const exec = await invokeFn('executor-agent', { ticket_id, resume: true })
    return jsonResponse({ exec })
  }

  if (action === 'reject') {
    await supabase.from('tickets').update({ status: 'escalated', pending_action: null }).eq('id', ticket_id)
    await logEvent(ticket_id, 'AGENT', 'info', 'Step rejected by human reviewer — ticket escalated')
    return jsonResponse({ escalated: true })
  }

  // No action specified: run the pipeline from scratch (new ticket/alert).
  const result = await runPipeline(ticket_id)
  return jsonResponse(result)
})
