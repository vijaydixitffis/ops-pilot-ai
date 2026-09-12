import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export interface LiveFeedback {
  id: string
  ticket_id: string
  reason: string
  reviewed: boolean
  created_at: string
}

export function useLiveFeedback() {
  const [items, setItems] = useState<LiveFeedback[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('reviewed', false)
      .order('created_at', { ascending: false })
    if (!error) setItems(data as LiveFeedback[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('feedback-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function markReviewed(id: string) {
    await supabase.from('feedback').update({ reviewed: true }).eq('id', id)
  }

  return { items, loading, markReviewed }
}
