import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { logEvent, serviceClient } from '../_shared/db.ts'

const RISK_ORDER = ['read_only', 'diagnostic_only', 'write', 'write_downtime', 'write_reboot']
const AUTONOMOUS_RISK_TIERS = new Set(['read_only', 'diagnostic_only'])

function band(score: number): 'high' | 'medium' | 'low' {
  if (score > 0.85) return 'high'
  if (score >= 0.5) return 'medium'
  return 'low'
}

// Confidence gate + risk-tier ceiling per §3: read-only/diagnostic can go fully
// autonomous at high confidence; write/downtime/reboot actions are capped at
// "guided" regardless of confidence.
Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, classification_confidence, steps, execution_confidence } = await req.json()
  const supabase = serviceClient()

  const execConf = execution_confidence ?? 0.95
  const score = classification_confidence * execConf
  const confBand = band(score)

  const riskTier = steps.reduce(
    (worst: string, step: { risk_tier: string }) =>
      RISK_ORDER.indexOf(step.risk_tier) > RISK_ORDER.indexOf(worst) ? step.risk_tier : worst,
    'read_only',
  )

  let mode: 'auto' | 'guided' | 'escalated'
  if (confBand === 'low') {
    mode = 'escalated'
  } else if (confBand === 'medium') {
    mode = 'guided'
  } else {
    mode = AUTONOMOUS_RISK_TIERS.has(riskTier) ? 'auto' : 'guided'
  }

  const plan = {
    confidence_score: score,
    confidence_band: confBand,
    risk_tier: riskTier,
    mode,
    steps,
  }

  await supabase.from('agent_runs').insert({ ticket_id, agent: 'planner', input: { steps }, output: plan })
  await supabase.from('tickets').update({
    confidence_score: score,
    confidence_band: confBand,
    risk_tier: riskTier,
    mode,
    status: mode === 'escalated' ? 'escalated' : mode === 'guided' ? 'needs_approval' : 'in_progress',
  }).eq('id', ticket_id)

  await logEvent(
    ticket_id, 'AGENT', 'info',
    `Plan: confidence=${score.toFixed(2)} (${confBand.toUpperCase()}), risk_tier=${riskTier}, mode=${mode}`,
  )

  return jsonResponse(plan)
})
