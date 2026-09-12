import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data as { id: string; full_name: string; role: 'l1' | 'admin' }
}
