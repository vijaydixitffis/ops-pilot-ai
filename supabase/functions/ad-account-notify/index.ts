import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { logEvent } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, username } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke ad-account-notify { username: "${username}" }`)

  const result = { notified: true }
  await logEvent(ticket_id, 'ACTIVEDIRECTORY', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
