import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { logEvent, serviceClient } from '../_shared/db.ts'

// get_runbook(use_case) -> Document — the single interface boundary that lets a
// vector store replace this lookup later without touching the rest of the
// architecture (§5).
Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const { ticket_id, use_case } = await req.json()
  const supabase = serviceClient()

  const { data: runbook, error } = await supabase
    .from('runbooks').select('*').eq('use_case', use_case).single()
  if (error) return jsonResponse({ error: error.message }, 404)

  const { data: steps } = await supabase
    .from('runbook_steps').select('*').eq('runbook_id', runbook.id).order('step_number')

  await supabase.from('agent_runs').insert({
    ticket_id, agent: 'retrieval', input: { use_case }, output: { runbook_id: runbook.id },
    runbook_id: runbook.id,
  })

  await logEvent(ticket_id, 'AGENT', 'info', `KB lookup: runbook cited — ${runbook.title}`)

  return jsonResponse({ runbook, steps })
})
