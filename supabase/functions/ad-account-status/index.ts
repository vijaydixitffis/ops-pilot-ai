import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getDeviceState, logEvent } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, username } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke ad-account-status { username: "${username}" }`)

  const device = await getDeviceState(username, 'ActiveDirectory')
  const result = {
    locked_out: device.state.locked_out,
    bad_pwd_count: device.state.bad_pwd_count,
    recent_failed_logons: device.state.recent_failed_logons,
    account_status: device.state.account_status,
    lockout_count_24h: device.state.lockout_count_24h,
  }

  await logEvent(ticket_id, 'ACTIVEDIRECTORY', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
