import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getDeviceState, logEvent } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, node, port } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke idrac-nic-status { node: "${node}", port: "${port}" }`)

  const device = await getDeviceState(node, 'iDRAC')
  const status = device.state.nic_ports?.[port] ?? 'unknown'
  const result = { port, status }

  await logEvent(ticket_id, 'IDRAC', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
