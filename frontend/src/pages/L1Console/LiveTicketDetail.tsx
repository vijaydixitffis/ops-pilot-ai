import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { ConfidenceBadge, RiskTierPill } from '../../components/badges'
import type { RiskTier } from '../../data/useCases'

interface Ticket {
  id: string
  source: string
  external_id: string | null
  short_description: string | null
  long_description: string | null
  raw_alert: string | null
  use_case: string | null
  confidence_score: number | null
  confidence_band: string | null
  risk_tier: string | null
  mode: string | null
  status: string
  ci: string | null
  pending_action: { step_index: number; step_name: string } | null
}

interface ExecEvent {
  id: string
  source: string
  direction: string | null
  message: string
  payload: unknown
  created_at: string
}

const SOURCE_COLOR: Record<string, string> = {
  AGENT: '#2f8fdb',
  EXECUTOR: '#8a5c12',
  IDRAC: '#9a3226',
  POWERFLEX: '#382f70',
  VCENTER: '#0f4570',
  AVAMAR: '#2f8f6b',
}

export function LiveTicketDetail({ showControls = true }: { showControls?: boolean }) {
  const { id } = useParams()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [events, setEvents] = useState<ExecEvent[]>([])
  const [busy, setBusy] = useState(false)
  const [flagReason, setFlagReason] = useState('')
  const [flagMsg, setFlagMsg] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function loadTicket() {
      const { data } = await supabase.from('tickets').select('*').eq('id', id).single()
      if (!cancelled) setTicket(data as Ticket)
    }
    async function loadEvents() {
      const { data } = await supabase
        .from('execution_events')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true })
      if (!cancelled) setEvents((data ?? []) as ExecEvent[])
    }

    loadTicket()
    loadEvents()

    const channel = supabase
      .channel(`ticket-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'execution_events', filter: `ticket_id=eq.${id}` },
        (payload) => setEvents((prev) => [...prev, payload.new as ExecEvent]),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `id=eq.${id}` },
        (payload) => setTicket(payload.new as Ticket),
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [id])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [events])

  if (!ticket) {
    return <div style={{ font: 'var(--t-small)', color: 'var(--fg-4)' }}>Loading ticket…</div>
  }

  const invokeOrchestrator = async (action: 'approve' | 'reject') => {
    setBusy(true)
    try {
      await supabase.functions.invoke('orchestrator', { body: { ticket_id: ticket.id, action } })
    } finally {
      setBusy(false)
    }
  }

  const flag = async () => {
    if (!flagReason.trim()) return
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) {
      setFlagMsg('Sign in to flag a ticket for review.')
      return
    }
    const { error } = await supabase.from('feedback').insert({
      ticket_id: ticket.id,
      flagged_by: userId,
      reason: flagReason,
    })
    setFlagMsg(error ? `Failed: ${error.message}` : 'Flagged for review.')
    if (!error) setFlagReason('')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ font: 'var(--t-mono)', color: 'var(--fg-2)' }}>
          {ticket.external_id ?? ticket.id.slice(0, 8)}
        </span>
        {ticket.confidence_band && (
          <ConfidenceBadge
            band={
              (ticket.confidence_band.charAt(0).toUpperCase() + ticket.confidence_band.slice(1)) as
                | 'High'
                | 'Medium'
                | 'Low'
            }
          />
        )}
        {ticket.risk_tier && <RiskTierPill tier={ticket.risk_tier as RiskTier} />}
        <span style={{ fontSize: 12, color: 'var(--fg-4)', textTransform: 'uppercase' }}>{ticket.status}</span>
      </div>
      <div style={{ font: 'var(--t-h2)', color: 'var(--fg-2)', marginBottom: 6 }}>
        {ticket.short_description ?? ticket.use_case ?? 'Ticket'}
      </div>
      {ticket.raw_alert && (
        <div style={{ font: 'var(--t-mono)', fontSize: 12, color: 'var(--fg-3)', marginBottom: 16 }}>
          {ticket.raw_alert}
        </div>
      )}

      {ticket.status === 'needs_approval' && showControls && (
        <div
          style={{
            background: '#faf1e0',
            border: '1px solid #e8cf9c',
            borderRadius: 'var(--r-md)',
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 13, color: '#5a3d0a' }}>
            Approval gate: <strong>{ticket.pending_action?.step_name ?? 'pending step'}</strong> — execution
            is paused, awaiting your decision.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              disabled={busy}
              onClick={() => invokeOrchestrator('approve')}
              style={{
                background: 'var(--sky)', color: '#fff', border: 'none',
                padding: '8px 16px', borderRadius: 'var(--r-sm)', fontSize: 13, cursor: 'pointer',
              }}
            >
              Approve
            </button>
            <button
              disabled={busy}
              onClick={() => invokeOrchestrator('reject')}
              style={{
                background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)',
                padding: '8px 16px', borderRadius: 'var(--r-sm)', fontSize: 13, cursor: 'pointer',
              }}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      <div style={{ font: 'var(--t-small)', fontWeight: 600, color: 'var(--fg-3)', marginBottom: 8 }}>
        Execution — live console log
      </div>
      <div
        ref={logRef}
        style={{
          background: '#0d1117',
          borderRadius: 'var(--r-md)',
          padding: '16px 18px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12.5,
          color: '#c7ccd2',
          maxHeight: 360,
          overflowY: 'auto',
          marginBottom: 20,
        }}
      >
        {events.length === 0 && <div style={{ color: '#6c757d' }}>Waiting for agent activity…</div>}
        {events.map((e) => (
          <div key={e.id} style={{ marginBottom: 4 }}>
            <span style={{ color: '#6c757d' }}>
              [{new Date(e.created_at).toLocaleTimeString()}]{' '}
            </span>
            <span style={{ color: SOURCE_COLOR[e.source] ?? '#c7ccd2', fontWeight: 700 }}>
              {e.source.padEnd(9)}
            </span>
            <span style={{ color: '#6c757d' }}>{e.direction === 'in' ? ' ← ' : ' → '}</span>
            <span>{e.message}</span>
          </div>
        ))}
      </div>

      {showControls && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            placeholder="Flag reason (optional review note)"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            style={{
              flex: 1, padding: '9px 12px', border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)', fontSize: 13,
            }}
          />
          <button
            onClick={flag}
            style={{
              background: 'transparent', border: '1px solid var(--border-strong)', color: 'var(--fg-2)',
              padding: '9px 14px', borderRadius: 'var(--r-sm)', fontSize: 13, cursor: 'pointer',
            }}
          >
            Flag for review
          </button>
        </div>
      )}
      {flagMsg && (
        <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 8 }}>{flagMsg}</div>
      )}
    </div>
  )
}
