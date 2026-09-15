import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { delay, getDeviceState, logEvent, updateDeviceState } from '../_shared/db.ts'

// Delayed-completion pattern — disable/re-enable takes real elapsed time.
// `succeed` decides whether this flap resolves the port (clean variant) or
// the port stays down (escalate variant), matching the ticket's scenario.
Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, switch_port, succeed } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke switch-port-flap { switch_port: "${switch_port}" }`)
  await logEvent(ticket_id, 'NETWORKSWITCH', 'info', 'Disabling port…')

  await delay(2500)

  const device = await getDeviceState(switch_port, 'NetworkSwitch')
  const newStatus = succeed ? 'up' : 'down'
  const updated = await updateDeviceState(switch_port, 'NetworkSwitch', {
    port_status: newStatus,
    flap_attempted: true,
    last_up: succeed ? new Date().toISOString() : device.state.last_up,
  })
  const result = { port_status: updated.state.port_status, flap_attempted: true }

  await logEvent(ticket_id, 'NETWORKSWITCH', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
