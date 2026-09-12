import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { delay, getDeviceState, logEvent, updateDeviceState } from '../_shared/db.ts'

// Simulated port flap. Hardware NIC faults do not resolve via software —
// the inject-failure toggle keeps the port "down" to demonstrate this (§9e).
Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, node, port } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke idrac-nic-flap { node: "${node}", port: "${port}" }`)

  await delay(2000)

  const device = await getDeviceState(node, 'iDRAC')
  const nicPorts = { ...device.state.nic_ports }
  // Hardware faults never resolve from a flap in this simulation.
  nicPorts[port] = 'down'
  await updateDeviceState(node, 'iDRAC', { nic_ports: nicPorts, flap_attempted: true })

  const result = { port, status: nicPorts[port], flap_attempted: true }
  await logEvent(ticket_id, 'IDRAC', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
