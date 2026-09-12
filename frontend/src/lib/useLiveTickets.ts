import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export interface LiveTicket {
  id: string
  source: string
  external_id: string | null
  short_description: string | null
  use_case: string | null
  confidence_band: string | null
  risk_tier: string | null
  mode: string | null
  status: string
  created_at: string
}

// Live tickets visible under RLS to the current session (own/assigned for l1,
// all for admin). Refetches on any insert/update so new alerts/tickets and
// agent-driven status changes show up without a manual refresh.
export function useLiveTickets(filterStatuses?: string[]) {
  const [tickets, setTickets] = useState<LiveTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      let query = supabase.from('tickets').select('*').order('created_at', { ascending: false })
      if (filterStatuses?.length) query = query.in('status', filterStatuses)
      const { data, error } = await query
      if (!cancelled && !error) setTickets(data as LiveTicket[])
      if (!cancelled) setLoading(false)
    }

    load()

    const channel = supabase
      .channel('tickets-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, load)
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filterStatuses)])

  return { tickets, loading }
}
