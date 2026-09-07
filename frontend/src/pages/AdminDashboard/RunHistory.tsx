import { useNavigate } from 'react-router-dom'
import { useDemo } from '../../state/DemoStore'
import { ConfidenceBadge } from '../../components/badges'
import { UC_ORDER, UC_TICKET_IDS, USE_CASES, type UseCaseId } from '../../data/useCases'

const GRID = '110px 1fr 100px 130px 160px 110px'

const STATUS: Record<UseCaseId, string> = {
  vdisk: 'Guided',
  cpu: 'Auto-resolved',
  nic: 'Escalated',
  cert: 'Guided',
}

export function RunHistory() {
  const demo = useDemo()
  const navigate = useNavigate()

  const openAudit = (id: UseCaseId) => {
    demo.selectUseCase(id)
    navigate('/admin/audit')
  }

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
          <div>Use case</div>
          <div>Confidence</div>
          <div>Source</div>
          <div>Status</div>
          <div></div>
        </div>
        {UC_ORDER.map((id) => {
          const uc = USE_CASES[id]
          return (
            <div
              key={id}
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                padding: '16px 20px',
                borderTop: '1px solid var(--border)',
                alignItems: 'center',
              }}
            >
              <div style={{ font: 'var(--t-mono)', color: 'var(--fg-2)' }}>{UC_TICKET_IDS[id]}</div>
              <div style={{ fontSize: 14, color: 'var(--fg-1)' }}>{uc.label}</div>
              <div>
                <ConfidenceBadge band={uc.confBand} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>{uc.sourceLabel}</div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>{STATUS[id]}</div>
              <div>
                <button
                  onClick={() => openAudit(id)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-strong)',
                    padding: '6px 12px',
                    borderRadius: 'var(--r-sm)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Audit trail
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
