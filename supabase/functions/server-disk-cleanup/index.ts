import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { delay, getDeviceState, logEvent, updateDeviceState } from '../_shared/db.ts'

// Delayed-completion pattern (§2 note) — real elapsed time, then a state
// mutation. `minimal` simulates the "cleanup insufficient" ambiguous variant
// (only a small amount reclaimed, still above threshold afterward).
Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, volume, minimal } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke server-disk-cleanup { volume: "${volume}" }`)
  await logEvent(ticket_id, 'WINDOWSSERVER', 'info', 'Clearing temp files, browser caches, Windows Update cache…')

  await delay(3000)

  const device = await getDeviceState(volume, 'WindowsServer')
  const reclaimPct = minimal ? 2 : Math.round(device.state.temp_size_gb + device.state.old_logs_size_gb)
  const newUsedPct = Math.max(0, device.state.used_pct - reclaimPct)

  const updated = await updateDeviceState(volume, 'WindowsServer', { used_pct: newUsedPct })
  const result = { used_pct: updated.state.used_pct, reclaimed_pct: reclaimPct }

  await logEvent(ticket_id, 'WINDOWSSERVER', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
