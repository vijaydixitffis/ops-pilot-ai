// Calls a sibling Edge Function using the service role key, server-side.
export async function invokeFn(name: string, body: Record<string, unknown>) {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${name}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${name} failed: ${res.status} ${await res.text()}`)
  return res.json()
}
