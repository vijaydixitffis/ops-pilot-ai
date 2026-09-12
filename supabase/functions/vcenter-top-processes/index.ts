import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { logEvent } from '../_shared/db.ts'

// Extension beyond the source document (§9e) — identifies the top CPU consumer
// when usage is sustained above threshold, to support the vMotion/restart proposal.
Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, host } = await req.json()
  await logEvent(ticket_id, 'EXECUTOR', 'out', `invoke vcenter-top-processes { host: "${host}" }`)

  const result = {
    top_process: 'batch-reindex-worker',
    pid: 4821,
    cpu_pct: 61,
  }

  await logEvent(ticket_id, 'VCENTER', 'in', JSON.stringify(result), result)
  return jsonResponse(result)
})
