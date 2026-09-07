const GRID = '1fr 140px 100px 100px 160px'

const VENDOR_ROWS = [
  {
    label: 'NIC port down — ALT-NIC',
    sr: 'SR-4471182',
    wo: '—',
    change: '—',
    status: 'Logs uploaded',
  },
]

export function VendorCases() {
  return (
    <>
      <div style={{ font: 'var(--t-h2)', color: 'var(--fg-2)', marginBottom: 4 }}>
        Vendor case tracker
      </div>
      <div style={{ font: 'var(--t-small)', color: 'var(--fg-3)', marginBottom: 24 }}>
        SR / WO / Change status, populated by diagnose-then-escalate use cases.
      </div>
      {VENDOR_ROWS.length > 0 ? (
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            overflow: 'hidden',
          }}
        >
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
          {VENDOR_ROWS.map((row) => (
            <div
              key={row.sr}
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
              <div>{row.label}</div>
              <div style={{ font: 'var(--t-mono)' }}>{row.sr}</div>
              <div>{row.wo}</div>
              <div>{row.change}</div>
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
          No vendor cases yet — will populate once the NIC use case escalates.
        </div>
      )}
    </>
  )
}
