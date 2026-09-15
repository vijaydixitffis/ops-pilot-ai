import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { delay, getDeviceState, logEvent, updateDeviceState } from '../_shared/db.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, mailbox } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke mailbox-archive-move { mailbox: "${mailbox}" }`)

  await delay(1500)
  const device = await getDeviceState(mailbox, 'ExchangeOnline')
  // Moves enough aged mail to archive to bring the mailbox comfortably under quota.
  const target = Math.max(0, device.state.quota_gb - 5)
  const updated = await updateDeviceState(mailbox, 'ExchangeOnline', { size_gb: target })
  const result = { size_gb: updated.state.size_gb }

  await logEvent(ticket_id, 'EXCHANGEONLINE', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
