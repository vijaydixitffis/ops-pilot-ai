import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getDeviceState, logEvent } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, mailbox } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke mailbox-usage { mailbox: "${mailbox}" }`)

  const device = await getDeviceState(mailbox, 'ExchangeOnline')
  const result = {
    size_gb: device.state.size_gb,
    quota_gb: device.state.quota_gb,
    deleted_items_gb: device.state.deleted_items_gb,
    archive_available: device.state.archive_available,
    large_attachments: device.state.large_attachments,
    over_quota: device.state.size_gb > device.state.quota_gb,
  }

  await logEvent(ticket_id, 'EXCHANGEONLINE', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
