import { useLiveVendorCases } from '../../lib/useLiveVendorCases'

const GRID = '1fr 140px 100px 100px 160px'

export function VendorCases() {
  const { cases: liveCases, loading } = useLiveVendorCases()
  return (
    <>
      <div style={{ font: 'var(--t-h2)', color: 'var(--fg-2)', marginBottom: 4 }}>
        Vendor case tracker
      </div>
      <div style={{ font: 'var(--t-small)', color: 'var(--fg-3)', marginBottom: 24 }}>
        SR / WO / Change status, populated by diagnose-then-escalate use cases.
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
        ) : liveCases.length === 0 ? (
          <div style={{ padding: '18px 20px', font: 'var(--t-small)', color: 'var(--fg-4)' }}>
            No vendor cases yet — will populate once the NIC use case escalates.
          </div>
        ) : (
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
              <div>SR</div>
              <div>WO</div>
              <div>Change</div>
              <div>Status</div>
            </div>
            {liveCases.map((row) => (
              <div
                key={row.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: GRID,
                  padding: '16px 20px',
                  borderTop: '1px solid var(--border)',
                  alignItems: 'center',
                  fontSize: 13,
                  color: 'var(--fg-1)',
                }}
              >
                <div style={{ font: 'var(--t-mono)' }}>{row.ticket_id.slice(0, 8)}</div>
                <div style={{ font: 'var(--t-mono)' }}>{row.sr_number ?? '—'}</div>
                <div>{row.wo_number ?? '—'}</div>
                <div>{row.change_ref ?? '—'}</div>
                <div>
                  <span
                    style={{
                      background: '#f7e6c8',
                      color: '#5a3d0a',
                      padding: '4px 10px',
                      borderRadius: 'var(--r-pill)',
                      fontSize: 12,
                    }}
                  >
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
