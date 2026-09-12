import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export interface LiveVendorCase {
  id: string
  ticket_id: string
  sr_number: string | null
  wo_number: string | null
  change_ref: string | null
  status: string
}

export function useLiveVendorCases() {
  const [cases, setCases] = useState<LiveVendorCase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('vendor_cases')
        .select('*')
        .order('created_at', { ascending: false })
      if (!cancelled && !error) setCases(data as LiveVendorCase[])
      if (!cancelled) setLoading(false)
    }

    load()

    const channel = supabase
      .channel('vendor-cases-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_cases' }, load)
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  return { cases, loading }
}
