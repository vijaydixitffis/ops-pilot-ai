import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { delay, getDeviceState, logEvent, updateDeviceState } from '../_shared/db.ts'

// Handles the cert precheck (read-only) and, when action === "renew", the
// backup -> delete -> import -> MCS restart write/downtime sequence (§9e).
Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, device_id, action } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke avamar-keystore { device_id: "${device_id}", action: "${action}" }`)

  const device = await getDeviceState(device_id, 'Avamar')

  if (action === 'precheck') {
    const result = {
      cert_expiry: device.state.cert_expiry,
      dc_reachable: device.state.dc_reachable,
    }
    await logEvent(ticket_id, 'AVAMAR', 'in', JSON.stringify(result), result)
    return jsonResponse(result)
  }

  if (action === 'renew') {
    if (!device.state.dc_reachable) {
      await logEvent(ticket_id, 'AVAMAR', 'info', 'DC unreachable — cannot proceed with renewal')
      return jsonResponse({ error: 'dc_unreachable' })
    }
    await delay(1500)
    const renewed = new Date()
    renewed.setFullYear(renewed.getFullYear() + 1)
    const updated = await updateDeviceState(device_id, 'Avamar', {
      cert_expiry: renewed.toISOString().slice(0, 10),
      mcs_status: 'running',
    })
    const result = { cert_expiry: updated.state.cert_expiry, mcs_status: updated.state.mcs_status }
    await logEvent(ticket_id, 'AVAMAR', 'in', JSON.stringify(result), result)
    return jsonResponse(result)
  }

  return jsonResponse({ error: 'unknown action' }, 400)
})
