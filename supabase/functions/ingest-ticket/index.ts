import { createClient } from 'jsr:@supabase/supabase-js@2'
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

  // Assign the ticket to whoever is signed in and firing it from the
  // simulator — the simulator is now only reachable from inside a logged-in
  // session (opened in a new tab, sharing that session), so the caller's own
  // JWT identifies them.
  const authHeader = req.headers.get('Authorization') ?? ''
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: userData } = await callerClient.auth.getUser()
  let assignedTo = userData?.user?.id ?? null

  // Fallback for unauthenticated calls (e.g. direct API testing): pick any L1.
  if (!assignedTo) {
    const { data: l1Profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'l1')
      .limit(1)
      .maybeSingle()
    assignedTo = l1Profile?.id ?? null
  }

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
    assigned_to: assignedTo,
  }).select().single()

  if (error) return jsonResponse({ error: error.message }, 400)

  // Fire-and-forget: don't block the caller on the full agent pipeline.
  invokeFn('orchestrator', { ticket_id: ticket.id }).catch((e) => console.error('orchestrator failed', e))

  return jsonResponse({ ticket })
})
