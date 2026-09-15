import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getDeviceState, logEvent } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, asset_tag } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke asset-status { asset_tag: "${asset_tag}" }`)

  const device = await getDeviceState(asset_tag, 'EndpointAsset')
  const result = {
    last_seen: device.state.last_seen,
    battery_health_pct: device.state.battery_health_pct,
    warranty_status: device.state.warranty_status,
    related_tickets_90d: device.state.related_tickets_90d,
  }

  await logEvent(ticket_id, 'ENDPOINTASSET', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
