import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { logEvent, updateDeviceState } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, mailbox } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke mailbox-quota-increase { mailbox: "${mailbox}" }`)

  const updated = await updateDeviceState(mailbox, 'ExchangeOnline', { quota_gb: 75 })
  const result = { quota_gb: updated.state.quota_gb }

  await logEvent(ticket_id, 'EXCHANGEONLINE', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
