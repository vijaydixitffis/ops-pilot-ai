import { CONF_BG, OUTCOME_BG, TIER_META } from '../data/useCases'
import type { ConfidenceBand, OutcomeType, RiskTier } from '../data/useCases'

export function ConfidenceBadge({
  band,
  suffix,
}: {
  band: ConfidenceBand
  suffix?: string
}) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: '#fff',
        background: CONF_BG[band],
        padding: '4px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
      }}
    >
      {band}
      {suffix ? ` ${suffix}` : ''}
    </span>
  )
}

export function RiskTierPill({ tier }: { tier: RiskTier }) {
  const m = TIER_META[tier]
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: m.color,
        background: m.bg,
        padding: '3px 9px',
        borderRadius: 999,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {m.label}
    </span>
  )
}

export function OutcomeBadge({ type, label }: { type: OutcomeType; label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 12,
        fontWeight: 700,
        padding: '5px 12px',
        borderRadius: 999,
        color: '#fff',
        background: OUTCOME_BG[type],
      }}
    >
      {label}
    </span>
  )
}

export function NeutralPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 12,
        color: 'var(--fg-3)',
        background: 'var(--surface-sunk)',
        padding: '6px 12px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
