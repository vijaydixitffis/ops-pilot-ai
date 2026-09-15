import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { logEvent, updateDeviceState } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, username } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke ad-account-unlock { username: "${username}" }`)

  const updated = await updateDeviceState(username, 'ActiveDirectory', {
    locked_out: false,
    bad_pwd_count: 0,
    lockout_time: null,
  })
  const result = { locked_out: updated.state.locked_out, bad_pwd_count: updated.state.bad_pwd_count }

  await logEvent(ticket_id, 'ACTIVEDIRECTORY', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
