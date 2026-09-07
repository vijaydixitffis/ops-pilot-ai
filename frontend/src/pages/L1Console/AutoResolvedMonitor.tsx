import { useNavigate } from 'react-router-dom'
import { useDemo } from '../../state/DemoStore'
import { ConfidenceBadge } from '../../components/badges'
import { USE_CASES } from '../../data/useCases'

export function AutoResolvedMonitor() {
  const demo = useDemo()
  const navigate = useNavigate()
  const cpu = USE_CASES.cpu
  const flagged = !!demo.flagged['ALT-CPU']

  return (
    <>
      <div style={{ font: 'var(--t-h2)', color: 'var(--fg-2)', marginBottom: 4 }}>
        Auto-resolved monitor
      </div>
      <div style={{ font: 'var(--t-small)', color: 'var(--fg-3)', marginBottom: 24 }}>
        Tickets the agent fully resolved on its own. Flag anything that looks wrong.
      </div>
      <div
        style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 20,
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ font: 'var(--t-mono)', color: 'var(--fg-2)' }}>ALT-CPU</span>
            <ConfidenceBadge band={cpu.confBand} />
            <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>2h ago</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>
            {cpu.label}
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 6 }}>
            Runbook cited: {cpu.citation}
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-1)' }}>{cpu.outcome.text}</div>
          {flagged && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: '#9a3226',
                background: '#fbe4e0',
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: 'var(--r-pill)',
              }}
            >
              Flagged for review
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'flex-end',
          }}
        >
          <button
            onClick={() => {
              demo.selectUseCase('cpu')
              navigate('/l1/ticket')
            }}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              color: 'var(--fg-2)',
              padding: '7px 14px',
              borderRadius: 'var(--r-sm)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            View trace
          </button>
          <button
            onClick={() => demo.flagTicket('ALT-CPU')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--danger)',
              fontSize: 12,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Flag for review
          </button>
        </div>
      </div>
    </>
  )
}
