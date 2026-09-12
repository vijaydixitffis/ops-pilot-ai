import { LiveTicketsTable } from '../../components/LiveTicketsTable'
import { useLiveTickets } from '../../lib/useLiveTickets'

export function AutoResolvedMonitor() {
  const { tickets: liveTickets, loading } = useLiveTickets(['auto_resolved', 'resolved'])

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
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '18px 20px', font: 'var(--t-small)', color: 'var(--fg-4)' }}>Loading…</div>
        ) : (
          <LiveTicketsTable tickets={liveTickets} emptyLabel="Nothing auto-resolved yet." />
        )}
      </div>
    </>
  )
}
