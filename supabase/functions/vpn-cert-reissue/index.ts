import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { delay, logEvent, updateDeviceState } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, username } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke vpn-cert-reissue { username: "${username}" }`)

  await delay(1500)
  const renewed = new Date()
  renewed.setFullYear(renewed.getFullYear() + 1)
  const updated = await updateDeviceState(username, 'VPNGateway', {
    cert_expiry: renewed.toISOString().slice(0, 10),
    last_auth_result: 'success',
  })
  const result = { cert_expiry: updated.state.cert_expiry }

  await logEvent(ticket_id, 'VPNGATEWAY', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
