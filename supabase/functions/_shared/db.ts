import { createClient } from 'jsr:@supabase/supabase-js@2'

// Service-role client — used server-side only, inside Edge Functions.
// Bypasses RLS, so every function using this must scope queries itself.
export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

export async function logEvent(
  ticketId: string,
  source: string,
  direction: 'out' | 'in' | 'info',
  message: string,
  payload?: unknown,
) {
  const supabase = serviceClient()
  await supabase.from('execution_events').insert({
    ticket_id: ticketId,
    source,
    direction,
    message,
    payload: payload ?? null,
  })
}

export async function getDeviceState(deviceId: string, product: string) {
  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('mock_device_state')
    .select('*')
    .eq('device_id', deviceId)
    .eq('product', product)
    .single()
  if (error) throw error
  return data
}

export async function updateDeviceState(
  deviceId: string,
  product: string,
  patch: Record<string, unknown>,
) {
  const supabase = serviceClient()
  const current = await getDeviceState(deviceId, product)
  const nextState = { ...current.state, ...patch }
  const { data, error } = await supabase
    .from('mock_device_state')
    .update({ state: nextState })
    .eq('device_id', deviceId)
    .eq('product', product)
    .select()
    .single()
  if (error) throw error
  return data
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
