import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { delay, logEvent, updateDeviceState } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, username } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke vpn-client-update { username: "${username}" }`)

  await delay(2000)
  const updated = await updateDeviceState(username, 'VPNGateway', {
    client_version: '5.4.0',
    last_auth_result: 'success',
  })
  const result = { client_version: updated.state.client_version }

  await logEvent(ticket_id, 'VPNGATEWAY', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
