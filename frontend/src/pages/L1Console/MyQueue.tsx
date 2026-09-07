import { useNavigate } from 'react-router-dom'
import { useDemo } from '../../state/DemoStore'
import { ConfidenceBadge } from '../../components/badges'
import { USE_CASES, UC_TICKET_IDS, type UseCaseId } from '../../data/useCases'

const GRID = '110px 1fr 100px 160px 160px 70px'

const QUEUE_UCS: UseCaseId[] = ['vdisk', 'cert']

export function MyQueue() {
  const demo = useDemo()
  const navigate = useNavigate()

  const openDetail = (id: UseCaseId) => {
    demo.selectUseCase(id)
    navigate('/l1/ticket')
  }

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
          <div>Risk tier</div>
          <div>Status</div>
          <div>Age</div>
        </div>
        {QUEUE_UCS.map((id) => {
          const uc = USE_CASES[id]
          return (
            <div
              key={id}
              onClick={() => openDetail(id)}
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                padding: '16px 20px',
                borderTop: '1px solid var(--border)',
                cursor: 'pointer',
                alignItems: 'center',
              }}
            >
              <div style={{ font: 'var(--t-mono)', color: 'var(--fg-2)' }}>{UC_TICKET_IDS[id]}</div>
              <div style={{ fontSize: 14, color: 'var(--fg-1)' }}>{uc.label}</div>
              <div>
                <ConfidenceBadge band={uc.confBand} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{uc.riskTier}</div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>Needs approval</div>
              <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>—</div>
            </div>
          )
        })}
      </div>
    </>
  )
}
