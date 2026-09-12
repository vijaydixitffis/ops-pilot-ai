import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { delay, getDeviceState, logEvent, updateDeviceState } from '../_shared/db.ts'

// Delayed-completion pattern (§9a): "online" -> "rebooting" -> "online" over real elapsed time.
Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, node } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke idrac-reboot { node: "${node}" }`)

  await updateDeviceState(node, 'iDRAC', { host_status: 'rebooting' })
  await logEvent(ticket_id, 'IDRAC', 'in', '{ "status": "rebooting", "eta_seconds": 8 }', {
    status: 'rebooting',
    eta_seconds: 8,
  })

  await delay(8000)

  const device = await getDeviceState(node, 'iDRAC')
  // Inject-failure toggle keeps virtual_disk_health pinned to "degraded" — see mock_device_state.
  const resolvedHealth = device.state.virtual_disk_health === 'degraded_pinned' ? 'degraded' : 'optimal'
  const updated = await updateDeviceState(node, 'iDRAC', {
    host_status: 'online',
    virtual_disk_health: resolvedHealth,
  })

  await logEvent(ticket_id, 'IDRAC', 'in', 'state changed: host_status "rebooting" -> "online"')
  const result = { status: updated.state.virtual_disk_health === 'optimal' ? 'optimal' : 'degraded' }
  await logEvent(ticket_id, 'IDRAC', 'in', JSON.stringify(result), result)

  return jsonResponse({ status: 'online', virtual_disk_health: updated.state.virtual_disk_health })
})
