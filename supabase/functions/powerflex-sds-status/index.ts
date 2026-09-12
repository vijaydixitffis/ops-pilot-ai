import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getDeviceState, logEvent } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, hostname } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke powerflex-sds-status { hostname: "${hostname}" }`)

  const device = await getDeviceState(hostname, 'PowerFlex')
  const result = { is_sds_node: device.state.is_sds_node }

  await logEvent(ticket_id, 'POWERFLEX', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
