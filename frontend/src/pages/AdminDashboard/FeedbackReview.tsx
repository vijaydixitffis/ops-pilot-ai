import { useLiveFeedback } from '../../lib/useLiveFeedback'

export function FeedbackReview() {
  const { items, loading, markReviewed } = useLiveFeedback()

  return (
    <>
      <div style={{ font: 'var(--t-h2)', color: 'var(--fg-2)', marginBottom: 4 }}>
        Feedback review
      </div>
      <div style={{ font: 'var(--t-small)', color: 'var(--fg-3)', marginBottom: 24 }}>
        Items L1 professionals flagged from the auto-resolved monitor.
      </div>
      {loading ? (
        <div style={{ font: 'var(--t-small)', color: 'var(--fg-4)' }}>Loading…</div>
      ) : items.length === 0 ? (
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
          Nothing flagged yet. Flag a ticket from its detail view to see it here.
        </div>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
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
                Ticket {item.ticket_id.slice(0, 8)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 4 }}>
                Flagged: {item.reason} · {new Date(item.created_at).toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => markReviewed(item.id)}
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
      )}
    </>
  )
}
