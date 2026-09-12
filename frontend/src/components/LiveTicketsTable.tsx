import { useNavigate } from 'react-router-dom'
import { ConfidenceBadge, RiskTierPill } from './badges'
import type { LiveTicket } from '../lib/useLiveTickets'
import type { RiskTier } from '../data/useCases'

const GRID = '110px 1fr 100px 160px 160px 1fr'

export function LiveTicketsTable({ tickets, emptyLabel }: { tickets: LiveTicket[]; emptyLabel: string }) {
  const navigate = useNavigate()

  if (tickets.length === 0) {
    return (
      <div style={{ padding: '18px 20px', font: 'var(--t-small)', color: 'var(--fg-4)' }}>
        {emptyLabel}
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: GRID,
          padding: '12px 20px',
          background: 'var(--surface-sunk)',
          font: 'var(--t-small)',
          fontWeight: 600,
          color: 'var(--fg-3)',
        }}
      >
        <div>Ticket</div>
        <div>Use case</div>
        <div>Confidence</div>
        <div>Risk tier</div>
        <div>Status</div>
        <div>Source</div>
      </div>
      {tickets.map((t) => (
        <div
          key={t.id}
          onClick={() => navigate(`/l1/ticket/live/${t.id}`)}
          style={{
            display: 'grid',
            gridTemplateColumns: GRID,
            padding: '16px 20px',
            borderTop: '1px solid var(--border)',
            cursor: 'pointer',
            alignItems: 'center',
          }}
        >
          <div style={{ font: 'var(--t-mono)', color: 'var(--fg-2)' }}>
            {t.external_id ?? t.id.slice(0, 8)}
          </div>
          <div style={{ fontSize: 14, color: 'var(--fg-1)' }}>{t.use_case ?? '—'}</div>
          <div>
            {t.confidence_band ? (
              <ConfidenceBadge
                band={
                  (t.confidence_band.charAt(0).toUpperCase() + t.confidence_band.slice(1)) as
                    | 'High'
                    | 'Medium'
                    | 'Low'
                }
              />
            ) : (
              '—'
            )}
          </div>
          <div>{t.risk_tier ? <RiskTierPill tier={t.risk_tier as RiskTier} /> : '—'}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>{t.status}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-4)', textTransform: 'capitalize' }}>{t.source}</div>
        </div>
      ))}
    </div>
  )
}
