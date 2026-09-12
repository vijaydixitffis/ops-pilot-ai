import { LiveTicketsTable } from '../../components/LiveTicketsTable'
import { useLiveTickets } from '../../lib/useLiveTickets'

export function RunHistory() {
  const { tickets: liveTickets, loading } = useLiveTickets()

  return (
    <>
      <div style={{ font: 'var(--t-h2)', color: 'var(--fg-2)', marginBottom: 4 }}>Run history</div>
      <div style={{ font: 'var(--t-small)', color: 'var(--fg-3)', marginBottom: 24 }}>
        Every ticket, every L1, every source.
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
          <LiveTicketsTable tickets={liveTickets} emptyLabel="No tickets yet." />
        )}
      </div>
    </>
  )
}
