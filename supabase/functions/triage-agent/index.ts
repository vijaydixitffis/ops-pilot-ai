import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { callLLM } from '../_shared/llm.ts'
import { logEvent, serviceClient } from '../_shared/db.ts'

const USE_CASES = [
  'cert_renewal', 'log_collection', 'virtual_disk_degraded', 'nic_replacement', 'cpu_usage_alert',
  'password_reset_lockout', 'disk_space_alert', 'vpn_connection_failure', 'mailbox_over_quota',
  'laptop_no_power', 'network_port_down',
] as const

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id } = await req.json()
  const supabase = serviceClient()

  const { data: ticket, error } = await supabase.from('tickets').select('*').eq('id', ticket_id).single()
  if (error) return jsonResponse({ error: error.message }, 404)

  const text = ticket.raw_alert || `${ticket.short_description}\n${ticket.long_description}`
  await logEvent(ticket_id, 'AGENT', 'out', `Alert received: ${text.slice(0, 200)}`)

  const result = await callLLM({
    system: `You are the triage agent for an ops-automation platform. Classify the incoming ticket
or monitoring alert text into exactly one of these use cases: ${USE_CASES.join(', ')}.

Distinguishing guidance for the end-user-facing use cases:
- "can't log in", "account locked out", "password not working" -> password_reset_lockout
- "disk full", "volume at X% used", "low disk space" on a server -> disk_space_alert
- "can't connect to VPN", "VPN times out", "certificate error connecting to VPN" -> vpn_connection_failure
- "mailbox full", "can't send/receive email", "over quota" -> mailbox_over_quota
- "laptop won't turn on", "no lights/fan, won't power on" -> laptop_no_power
- "no network at my desk", switch port down alert -> network_port_down

Also extract the affected device/host/username/mailbox identifier and product if present.
Return a confidence score between 0 and 1 for how certain you are of the classification.`,
    userText: text,
    schema: {
      type: 'object',
      properties: {
        use_case: { type: 'string', enum: USE_CASES },
        device_id: { type: 'string' },
        product: { type: 'string' },
        confidence: { type: 'number' },
      },
      required: ['use_case', 'confidence'],
    },
  })

  await supabase.from('agent_runs').insert({
    ticket_id, agent: 'triage', input: { text }, output: result,
  })

  await supabase.from('tickets').update({
    use_case: result.use_case,
    status: 'triaging',
  }).eq('id', ticket_id)

  await logEvent(
    ticket_id, 'AGENT', 'info',
    `Triage: use_case=${result.use_case}, confidence=${result.confidence.toFixed(2)}`,
  )

  return jsonResponse(result)
})
