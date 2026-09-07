import { useDemo } from '../../state/DemoStore'

export function FeedbackReview() {
  const demo = useDemo()
  const entries = Object.keys(demo.flagged).filter((id) => !demo.reviewed[id])

  return (
    <>
      <div style={{ font: 'var(--t-h2)', color: 'var(--fg-2)', marginBottom: 4 }}>
        Feedback review
      </div>
      <div style={{ font: 'var(--t-small)', color: 'var(--fg-3)', marginBottom: 24 }}>
        Items L1 professionals flagged from the auto-resolved monitor.
      </div>
      {entries.length > 0 ? (
        entries.map((id) => (
          <div
            key={id}
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '18px 22px',
              marginBottom: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)' }}>
                CPU usage alert — {id}
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 4 }}>
                Flagged: {demo.flagged[id].reason} · {demo.flagged[id].at}
              </div>
            </div>
            <button
              onClick={() => demo.markReviewed(id)}
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
              Mark reviewed
            </button>
          </div>
        ))
      ) : (
        <div
          style={{
            background: 'var(--white)',
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--r-md)',
            padding: 40,
            textAlign: 'center',
            color: 'var(--fg-3)',
            fontSize: 14,
          }}
        >
          Nothing flagged yet. Flag a ticket from the auto-resolved monitor to see it here.
        </div>
      )}
    </>
  )
}
