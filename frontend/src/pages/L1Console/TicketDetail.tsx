// Ticket detail — the core demo screen (handoff §A2.3): vertical
// timeline of intake → triage → KB lookup → plan → execution steps
// with approval gates, delayed reboot progress, and outcome. Also
// rendered read-only as the Admin audit trail (§A3.3).
import { useDemo } from '../../state/DemoStore'
import { ConfidenceBadge, NeutralPill, OutcomeBadge, RiskTierPill } from '../../components/badges'
import {
  UC_LABELS,
  UC_ORDER,
  USE_CASES,
  type TimelineStep,
  type UseCase,
} from '../../data/useCases'

const dotStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  background: 'var(--sky-50)',
  color: 'var(--sky-deep)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  flexShrink: 0,
}

function StepRow({ dot, children }: { dot: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={dotStyle}>{dot}</div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
      {children}
    </div>
  )
}

function Terminal({ lines, subdued }: { lines: string[]; subdued?: boolean }) {
  if (subdued) {
    return (
      <div
        style={{
          background: '#f4f6f9',
          border: '1px dashed var(--border-strong)',
          borderRadius: 'var(--r-xs)',
          padding: '8px 12px',
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              font: 'var(--t-mono)',
              fontSize: 11,
              color: 'var(--fg-4)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {line}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div
      style={{
        background: 'var(--ink)',
        borderRadius: 'var(--r-sm)',
        padding: '14px 16px',
        marginBottom: 10,
      }}
    >
      {lines.map((line, i) => (
        <div key={i} style={{ font: 'var(--t-mono)', color: '#9fe3b0', whiteSpace: 'pre-wrap' }}>
          {line}
        </div>
      ))}
    </div>
  )
}

function SystemChips({ step, big }: { step: TimelineStep; big?: boolean }) {
  return (
    <>
      {step.chips.map((chip) => (
        <span
          key={chip.label}
          style={{
            fontSize: big ? 12 : 11,
            color: 'var(--sky-deep)',
            background: 'var(--sky-50)',
            padding: big ? '5px 12px' : '3px 10px',
            borderRadius: 'var(--r-pill)',
            fontWeight: big ? 600 : 400,
          }}
        >
          ● {chip.label}: {chip.state}
        </span>
      ))}
    </>
  )
}

function ExecStep({ step, layoutIsA }: { step: TimelineStep; layoutIsA: boolean }) {
  return (
    <StepRow dot="✓">
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 10 }}>
        {step.title}
      </div>

      {layoutIsA ? (
        <>
          <Terminal lines={step.terminalLines} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {step.beforeAfter && (
              <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>
                {step.beforeAfter.label}:{' '}
                <strong style={{ color: 'var(--fg-2)' }}>{step.beforeAfter.before}</strong> →{' '}
                <strong style={{ color: 'var(--sky-deep)' }}>{step.beforeAfter.after}</strong>
              </span>
            )}
            <SystemChips step={step} />
          </div>
          {step.decision && (
            <div
              style={{ marginTop: 8, fontSize: 13, color: 'var(--sky-deep)', fontWeight: 600 }}
            >
              {step.decision}
            </div>
          )}
        </>
      ) : (
        <>
          {step.beforeAfter && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'var(--surface-sunk)',
                borderRadius: 'var(--r-sm)',
                padding: '14px 16px',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--fg-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                }}
              >
                {step.beforeAfter.label}
              </div>
              <div style={{ fontSize: 14, color: 'var(--fg-3)' }}>{step.beforeAfter.before}</div>
              <div style={{ color: 'var(--sky)' }}>→</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sky-deep)' }}>
                {step.beforeAfter.after}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <SystemChips step={step} big />
            {step.decision && (
              <span
                style={{
                  fontSize: 12,
                  color: '#2f8f6b',
                  background: '#e6f3ee',
                  padding: '5px 12px',
                  borderRadius: 'var(--r-pill)',
                  fontWeight: 600,
                }}
              >
                {step.decision}
              </span>
            )}
          </div>
          <Terminal lines={step.terminalLines} subdued />
        </>
      )}

      {step.vendorCase && (
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            gap: 16,
            background: '#f7e6c8',
            borderRadius: 'var(--r-sm)',
            padding: '12px 16px',
            fontSize: 13,
            color: '#5a3d0a',
          }}
        >
          <span>
            SR: <strong>{step.vendorCase.sr}</strong>
          </span>
          <span>
            Status: <strong>{step.vendorCase.status}</strong>
          </span>
        </div>
      )}
    </StepRow>
  )
}

function TimelineStepView({
  step,
  uc,
  layoutIsA,
}: {
  step: TimelineStep
  uc: UseCase
  layoutIsA: boolean
}) {
  switch (step.kind) {
    case 'intake':
      return (
        <StepRow dot="1">
          <StepTitle>{uc.sourceLabel} received</StepTitle>
          <div
            style={{
              font: 'var(--t-mono)',
              background: 'var(--surface-sunk)',
              padding: '10px 14px',
              borderRadius: 'var(--r-sm)',
              color: 'var(--fg-2)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {uc.intakeText}
          </div>
        </StepRow>
      )
    case 'triage':
      return (
        <StepRow dot="2">
          <StepTitle>Triage &amp; classification</StepTitle>
          <div style={{ fontSize: 14, color: 'var(--fg-1)' }}>
            Classified as <strong>{uc.label}</strong> — <ConfidenceBadge band={uc.confBand} />{' '}
            confidence
          </div>
        </StepRow>
      )
    case 'kb':
      return (
        <StepRow dot="3">
          <StepTitle>Knowledge base lookup</StepTitle>
          <div style={{ fontSize: 14, color: 'var(--fg-1)' }}>
            Runbook cited: <em>{uc.citation}</em>
          </div>
        </StepRow>
      )
    case 'plan':
      return (
        <StepRow dot="4">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 10 }}>
            Plan
          </div>
          {uc.planSteps.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
                fontSize: 14,
                color: 'var(--fg-1)',
              }}
            >
              <RiskTierPill tier={p.tier} />
              {p.text}
            </div>
          ))}
        </StepRow>
      )
    case 'exec':
      return <ExecStep step={step} layoutIsA={layoutIsA} />
    case 'gate':
      return (
        <StepRow dot="✓">
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)' }}>
            {step.title} — approved
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 2 }}>{step.impact}</div>
        </StepRow>
      )
    case 'outcome':
      return (
        <StepRow dot="●">
          <OutcomeBadge type={step.outcomeType ?? 'awaiting'} label={step.outcomeLabel ?? ''} />
          <div style={{ fontSize: 14, color: 'var(--fg-1)', marginTop: 8 }}>{step.outcomeText}</div>
        </StepRow>
      )
  }
}

export function TicketDetail({ showControls = true }: { showControls?: boolean }) {
  const demo = useDemo()
  const uc = USE_CASES[demo.activeUseCase]
  const tl = demo.timelineFor(demo.activeUseCase)
  const stepIndex = demo.stepIndex[demo.activeUseCase] ?? tl.length
  const revealedSteps = tl.slice(0, stepIndex + 1)
  const pending = tl[stepIndex + 1] ?? null
  const layoutIsA = demo.layoutMode === 'A'

  const rebootPct = demo.rebootPct[demo.activeUseCase] ?? 0
  const rebootSecondsLeft = Math.max(0, Math.round(((100 - rebootPct) / 100) * 45))

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    ...(active ? { background: 'var(--sky)', color: '#fff' } : { color: 'var(--fg-3)' }),
  })
  const layoutChipStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    ...(active ? { background: 'var(--slate)', color: '#fff' } : { color: 'var(--fg-3)' }),
  })

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div>
          <div style={{ font: 'var(--t-h2)', color: 'var(--fg-2)' }}>
            {showControls ? 'Ticket detail' : 'Audit trail'}
          </div>
          <div style={{ font: 'var(--t-small)', color: 'var(--fg-3)' }}>
            Live agent run — triage, retrieval, plan, execution
          </div>
        </div>
        {showControls && (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                gap: 6,
                background: 'var(--surface-sunk)',
                padding: 4,
                borderRadius: 'var(--r-pill)',
              }}
            >
              {UC_ORDER.map((id) => (
                <div
                  key={id}
                  onClick={() => demo.selectUseCase(id)}
                  style={chipStyle(id === demo.activeUseCase)}
                >
                  {UC_LABELS[id]}
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                background: 'var(--surface-sunk)',
                padding: 4,
                borderRadius: 'var(--r-pill)',
              }}
            >
              <div onClick={() => demo.setLayoutMode('A')} style={layoutChipStyle(layoutIsA)}>
                Transcript-forward
              </div>
              <div onClick={() => demo.setLayoutMode('B')} style={layoutChipStyle(!layoutIsA)}>
                State-card-forward
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: 28,
          boxShadow: 'var(--sh-sm)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 24,
            paddingBottom: 20,
            borderBottom: '1px solid var(--border)',
            alignItems: 'center',
          }}
        >
          <span style={{ font: 'var(--t-h3)', color: 'var(--fg-2)', marginRight: 'auto' }}>
            {uc.label}
          </span>
          <ConfidenceBadge band={uc.confBand} suffix="confidence" />
          <NeutralPill>{uc.riskTier}</NeutralPill>
          <NeutralPill>{uc.autonomy}</NeutralPill>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {revealedSteps.map((step, i) => (
            <div
              key={`${step.kind}-${i}`}
              className="fade-up"
              style={{ padding: '18px 0', borderBottom: '1px solid var(--border)' }}
            >
              <TimelineStepView step={step} uc={uc} layoutIsA={layoutIsA} />
            </div>
          ))}
        </div>

        {pending && pending.kind === 'gate' && (
          <div
            style={{
              marginTop: 6,
              padding: 20,
              background: 'var(--sky-50)',
              border: '1px solid var(--sky-200)',
              borderRadius: 'var(--r-md)',
            }}
          >
            <div
              style={{ fontSize: 14, fontWeight: 700, color: 'var(--sky-deep)', marginBottom: 6 }}
            >
              Approval needed — {pending.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 10 }}>
              {pending.impact}
            </div>
            {pending.comms && (
              <div
                style={{
                  font: 'var(--t-mono)',
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-xs)',
                  padding: 12,
                  whiteSpace: 'pre-wrap',
                  marginBottom: 12,
                  fontSize: 12,
                  color: 'var(--fg-2)',
                }}
              >
                {pending.comms}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={demo.approveGate}
                style={{
                  background: 'var(--sky)',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: 'var(--r-sm)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Approve
              </button>
              <button
                onClick={demo.rejectGate}
                style={{
                  background: 'transparent',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)',
                  padding: '9px 18px',
                  borderRadius: 'var(--r-sm)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {pending && pending.kind === 'exec' && pending.delayed && (
          <div
            style={{
              marginTop: 6,
              padding: 20,
              background: 'var(--surface-sunk)',
              borderRadius: 'var(--r-md)',
            }}
          >
            <div
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 10 }}
            >
              {pending.title}… {rebootSecondsLeft}s remaining
            </div>
            <div
              style={{
                height: 8,
                background: 'var(--border)',
                borderRadius: 'var(--r-pill)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'var(--sky)',
                  borderRadius: 'var(--r-pill)',
                  width: `${rebootPct}%`,
                  transition: 'width .15s linear',
                }}
              />
            </div>
          </div>
        )}

        {pending && pending.kind !== 'gate' && !(pending.kind === 'exec' && pending.delayed) && (
          <div style={{ marginTop: 6 }}>
            <button
              onClick={() => demo.advance()}
              style={{
                background: 'var(--slate)',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 'var(--r-sm)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Continue →
            </button>
          </div>
        )}
      </div>
    </>
  )
}
