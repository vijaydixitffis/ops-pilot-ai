import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getDeviceState, logEvent, updateDeviceState } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, mailbox, minimal } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke mailbox-purge-deleted { mailbox: "${mailbox}" }`)

  const device = await getDeviceState(mailbox, 'ExchangeOnline')
  const reclaimed = minimal ? Math.min(1, device.state.deleted_items_gb) : device.state.deleted_items_gb
  const newSize = Math.max(0, device.state.size_gb - reclaimed)

  const updated = await updateDeviceState(mailbox, 'ExchangeOnline', {
    size_gb: newSize,
    deleted_items_gb: Math.max(0, device.state.deleted_items_gb - reclaimed),
  })
  const result = { size_gb: updated.state.size_gb, reclaimed_gb: reclaimed }

  await logEvent(ticket_id, 'EXCHANGEONLINE', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
