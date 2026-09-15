import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getDeviceState, logEvent } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, username } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke vpn-gateway-status { username: "${username}" }`)

  const device = await getDeviceState(username, 'VPNGateway')
  const result = {
    gateway_status: device.state.gateway_status,
    last_auth_result: device.state.last_auth_result,
  }

  await logEvent(ticket_id, 'VPNGATEWAY', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
