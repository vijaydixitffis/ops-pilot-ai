import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getDeviceState, logEvent } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, node } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke idrac-virtual-disk { node: "${node}" }`)

  const device = await getDeviceState(node, 'iDRAC')
  const result = {
    status: device.state.virtual_disk_health,
    disk_id: device.state.disk_id,
  }

  await logEvent(ticket_id, 'IDRAC', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
