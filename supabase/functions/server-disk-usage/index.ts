import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getDeviceState, logEvent } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, volume } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke server-disk-usage { volume: "${volume}" }`)

  const device = await getDeviceState(volume, 'WindowsServer')
  const result = {
    used_pct: device.state.used_pct,
    threshold_pct: device.state.threshold_pct,
    temp_size_gb: device.state.temp_size_gb,
    old_logs_size_gb: device.state.old_logs_size_gb,
    growth_pattern: device.state.growth_pattern,
    above_threshold: device.state.used_pct > device.state.threshold_pct,
  }

  await logEvent(ticket_id, 'WINDOWSSERVER', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
