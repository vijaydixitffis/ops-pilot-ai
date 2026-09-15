import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getDeviceState, logEvent } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, switch_port } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke switch-port-status { switch_port: "${switch_port}" }`)

  const device = await getDeviceState(switch_port, 'NetworkSwitch')
  const result = {
    port_status: device.state.port_status,
    error_counters: device.state.error_counters,
    affected_ports_same_switch: device.state.affected_ports_same_switch,
  }

  await logEvent(ticket_id, 'NETWORKSWITCH', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
