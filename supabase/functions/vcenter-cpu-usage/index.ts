import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getDeviceState, logEvent } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, host } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke vcenter-cpu-usage { host: "${host}" }`)

  const device = await getDeviceState(host, 'vCenter')
  const result = {
    cpu_usage_pct: device.state.cpu_usage_pct,
    cpu_threshold_pct: device.state.cpu_threshold_pct,
    cpu_trend: device.state.cpu_trend,
    above_threshold: device.state.cpu_usage_pct > device.state.cpu_threshold_pct,
  }

  await logEvent(ticket_id, 'VCENTER', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
