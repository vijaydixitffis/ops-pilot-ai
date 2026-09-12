import { LiveTicketsTable } from '../../components/LiveTicketsTable'
import { useLiveTickets } from '../../lib/useLiveTickets'

export function MyQueue() {
  const { tickets: liveTickets, loading } = useLiveTickets([
    'new', 'triaging', 'needs_approval', 'needs_input', 'in_progress', 'escalated',
  ])

  return (
    <>
      <div style={{ font: 'var(--t-h2)', color: 'var(--fg-2)', marginBottom: 4 }}>My queue</div>
      <div style={{ font: 'var(--t-small)', color: 'var(--fg-3)', marginBottom: 24 }}>
        Tickets routed to guided or escalated mode that need your action.
      </div>
      <div
        style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '18px 20px', font: 'var(--t-small)', color: 'var(--fg-4)' }}>Loading…</div>
        ) : (
          <LiveTicketsTable tickets={liveTickets} emptyLabel="No tickets yet — fire one from the external systems simulator." />
        )}
      </div>
    </>
  )
}
