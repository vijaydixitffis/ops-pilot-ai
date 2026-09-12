import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/db.ts'
import { invokeFn } from '../_shared/invoke.ts'

// Mock ticket generator (§6) posts here instead of inserting directly, so the
// orchestrator kicks off automatically the moment a ticket/alert "arrives."
Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const payload = await req.json()
  const supabase = serviceClient()

  // POC has a single L1 account — auto-assign every incoming ticket/alert to
  // it so RLS (assigned_to = auth.uid()) lets the L1 console see it.
  const { data: l1Profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'l1')
    .limit(1)
    .maybeSingle()

  const { data: ticket, error } = await supabase.from('tickets').insert({
    source: payload.source,
    external_id: payload.ticket_id ?? payload.alert_id,
    short_description: payload.short_description,
    long_description: payload.long_description,
    raw_alert: payload.raw_alert,
    requester: payload.requester,
    priority: payload.priority,
    ci: payload.ci ?? payload.host,
    product: payload.product,
    inject_failure: payload.inject_failure ?? null,
    assigned_to: l1Profile?.id ?? null,
  }).select().single()

  if (error) return jsonResponse({ error: error.message }, 400)

  // Fire-and-forget: don't block the caller on the full agent pipeline.
  invokeFn('orchestrator', { ticket_id: ticket.id }).catch((e) => console.error('orchestrator failed', e))

  return jsonResponse({ ticket })
})
