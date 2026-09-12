import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { logEvent, updateDeviceState } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, hostname, enabled } = await req.json()
  await logEvent(
    ticket_id,
    'EXECUTOR',
    'out',
    `invoke powerflex-maintenance-mode { enabled: ${enabled} }`,
  )

  const updated = await updateDeviceState(hostname, 'PowerFlex', { maintenance_mode: enabled })
  const result = { maintenance_mode: updated.state.maintenance_mode }

  await logEvent(ticket_id, 'POWERFLEX', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
