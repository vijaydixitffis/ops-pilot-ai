import { useState } from 'react'
import { ConfidenceBadge } from '../../components/badges'
import type { ConfidenceBand } from '../../data/useCases'
import { useLiveTickets } from '../../lib/useLiveTickets'
import { supabase } from '../../lib/supabaseClient'

const BAND_ROWS: { band: ConfidenceBand; score: string; action: string }[] = [
  { band: 'High', score: '>85%', action: 'Auto-resolve or answer; notify user; log outcome' },
  { band: 'Medium', score: '50–85%', action: 'Present plan; confirm before each write action' },
  { band: 'Low', score: '<50%', action: 'Escalate to human agent with full context packaged' },
]

export function Overview() {
  const { tickets: liveTickets, loading } = useLiveTickets()
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState<string | null>(null)

  const liveAuto = liveTickets.filter((t) => t.status === 'auto_resolved' || t.status === 'resolved').length
  const liveGuided = liveTickets.filter((t) => t.status === 'needs_approval' || t.status === 'in_progress').length
  const liveEscalated = liveTickets.filter((t) => t.status === 'escalated').length
  const liveByUseCase = liveTickets.reduce<Record<string, number>>((acc, t) => {
    if (t.use_case) acc[t.use_case] = (acc[t.use_case] ?? 0) + 1
    return acc
  }, {})
  const maxLiveCount = Math.max(1, ...Object.values(liveByUseCase))

  const resetMockState = async () => {
    setResetting(true)
    setResetMsg(null)
    try {
      const { error } = await supabase.functions.invoke('admin-reset-demo', { body: {} })
      setResetMsg(error ? `Failed: ${error.message}` : 'Mock device state reset to initial condition.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ font: 'var(--t-h2)', color: 'var(--fg-2)', marginBottom: 4 }}>Overview</div>
          <div style={{ font: 'var(--t-small)', color: 'var(--fg-3)' }}>
            All tickets, all L1s, all sources
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {resetMsg && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{resetMsg}</span>}
          <button
            onClick={resetMockState}
            disabled={resetting}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              color: 'var(--fg-2)',
              padding: '8px 16px',
              borderRadius: 'var(--r-sm)',
              fontSize: 13,
              cursor: resetting ? 'default' : 'pointer',
              opacity: resetting ? 0.6 : 1,
            }}
          >
            {resetting ? 'Resetting…' : 'Reset mock device state'}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {[
          { value: String(liveTickets.length), label: 'Total tickets' },
          { value: String(liveAuto), label: 'Auto-resolved' },
          { value: String(liveGuided), label: 'Guided (pending/in progress)' },
          { value: String(liveEscalated), label: 'Escalated' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: 20,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 32,
                color: 'var(--sky)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.03em',
              }}
            >
              {loading ? '…' : s.value}
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          padding: 24,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 16 }}>
          Confidence / risk / action mapping
        </div>
        {BAND_ROWS.map((b) => (
          <div
            key={b.band}
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 100px 1fr',
              gap: 16,
              padding: '10px 0',
              borderTop: '1px solid var(--border)',
              alignItems: 'center',
            }}
          >
            <span>
              <ConfidenceBadge band={b.band} />
            </span>
            <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{b.score}</span>
            <span style={{ fontSize: 13, color: 'var(--fg-1)' }}>{b.action}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          padding: 24,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 16 }}>
          Volume by use case
        </div>
        {Object.keys(liveByUseCase).length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--fg-4)' }}>No tickets yet.</div>
        ) : (
          Object.entries(liveByUseCase).map(([useCase, count]) => (
            <div key={useCase} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ width: 170, fontSize: 13, color: 'var(--fg-2)', flexShrink: 0 }}>{useCase}</span>
              <div
                style={{
                  flex: 1,
                  background: 'var(--surface-sunk)',
                  borderRadius: 'var(--r-pill)',
                  height: 10,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(count / maxLiveCount) * 100}%`,
                    background: 'var(--sky)',
                    borderRadius: 'var(--r-pill)',
                  }}
                />
              </div>
              <span style={{ width: 20, fontSize: 13, color: 'var(--fg-3)' }}>{count}</span>
            </div>
          ))
        )}
      </div>
    </>
  )
}
