import { useDemo } from '../../state/DemoStore'
import { ConfidenceBadge } from '../../components/badges'
import { UC_ORDER, USE_CASES, type ConfidenceBand } from '../../data/useCases'

const STATS = [
  { value: '4', label: 'Total tickets (POC scenarios)' },
  { value: '1', label: 'Auto-resolved' },
  { value: '2', label: 'Guided (pending/completed)' },
  { value: '1', label: 'Escalated' },
]

const BAND_ROWS: { band: ConfidenceBand; score: string; action: string }[] = [
  { band: 'High', score: '>85%', action: 'Auto-resolve or answer; notify user; log outcome' },
  { band: 'Medium', score: '50–85%', action: 'Present plan; confirm before each write action' },
  { band: 'Low', score: '<50%', action: 'Escalate to human agent with full context packaged' },
]

export function Overview() {
  const demo = useDemo()

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
        <button
          onClick={demo.resetDemo}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-strong)',
            color: 'var(--fg-2)',
            padding: '8px 16px',
            borderRadius: 'var(--r-sm)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Reset demo state
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {STATS.map((s) => (
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
              {s.value}
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
        {UC_ORDER.map((id) => (
          <div
            key={id}
            style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}
          >
            <span
              style={{ width: 170, fontSize: 13, color: 'var(--fg-2)', flexShrink: 0 }}
            >
              {USE_CASES[id].label}
            </span>
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
                  width: '25%',
                  background: 'var(--sky)',
                  borderRadius: 'var(--r-pill)',
                }}
              />
            </div>
            <span style={{ width: 20, fontSize: 13, color: 'var(--fg-3)' }}>1</span>
          </div>
        ))}
      </div>
    </>
  )
}
