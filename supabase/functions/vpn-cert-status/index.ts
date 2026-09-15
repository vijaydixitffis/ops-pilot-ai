import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getDeviceState, logEvent } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, username } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke vpn-cert-status { username: "${username}" }`)

  const device = await getDeviceState(username, 'VPNGateway')
  const expiry = new Date(device.state.cert_expiry as string)
  const daysToExpiry = Math.round((expiry.getTime() - Date.now()) / 86_400_000)
  const result = {
    cert_expiry: device.state.cert_expiry,
    days_to_expiry: daysToExpiry,
    client_version: device.state.client_version,
    min_required_version: device.state.min_required_version,
    client_outdated: device.state.client_version < device.state.min_required_version,
  }

  await logEvent(ticket_id, 'VPNGATEWAY', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
