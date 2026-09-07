// ============================================================
// OpsPilot AI — prototype state store
// All demo state lives client-side, mirroring the design
// prototype's single-component state. In a later step this is
// replaced by the Supabase backend: tickets/agent_runs fetched
// via the API, step reveal driven by a realtime stream, and
// approve/reject/flag/reset hitting real endpoints (see the
// handoff doc, Appendix B2).
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { buildTimeline, type TimelineStep, type UseCaseId } from '../data/useCases'

export type Role = 'l1' | 'admin'
export type GenTab = 'servicenow' | 'jira' | 'email' | 'monitoring'
export type MonScenario = 'vdisk' | 'nic' | 'cpu'
export type LayoutMode = 'A' | 'B'

export interface FlagEntry {
  reason: string
  at: string
}

export interface FireConfirmation {
  uc: UseCaseId
  alertId: string
}

interface DemoState {
  role: Role | null
  activeUseCase: UseCaseId
  layoutMode: LayoutMode
  stepIndex: Record<UseCaseId, number>
  injectedUC: Partial<Record<UseCaseId, boolean>>
  rebootPct: Partial<Record<UseCaseId, number>>
  flagged: Record<string, FlagEntry>
  reviewed: Record<string, boolean>
  genTab: GenTab
  monScenario: MonScenario
  globalInject: string
  fireConfirmation: FireConfirmation | null
}

interface DemoActions {
  timelineFor: (ucId: UseCaseId) => TimelineStep[]
  setRole: (role: Role | null) => void
  selectUseCase: (ucId: UseCaseId) => void
  setLayoutMode: (mode: LayoutMode) => void
  advance: (ucId?: UseCaseId) => void
  approveGate: () => void
  rejectGate: () => void
  flagTicket: (id: string) => void
  markReviewed: (id: string) => void
  resetDemo: () => void
  setGenTab: (tab: GenTab) => void
  setMonScenario: (s: MonScenario) => void
  setGlobalInject: (v: string) => void
  fireAlert: () => void
  submitTicket: () => void
  clearFireConfirmation: () => void
}

export type DemoStore = DemoState & DemoActions

const INITIAL_STEP_INDEX: Record<UseCaseId, number> = { vdisk: 4, cpu: 5, nic: 4, cert: 4 }

const DemoContext = createContext<DemoStore | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>({
    role: null,
    activeUseCase: 'vdisk',
    layoutMode: 'A',
    stepIndex: { ...INITIAL_STEP_INDEX },
    injectedUC: {},
    rebootPct: {},
    flagged: {},
    reviewed: {},
    genTab: 'monitoring',
    monScenario: 'vdisk',
    globalInject: 'none',
    fireConfirmation: null,
  })
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const timelineFor = useCallback(
    (ucId: UseCaseId) => buildTimeline(ucId, !!stateRef.current.injectedUC[ucId]),
    [],
  )

  const startReboot = useCallback((ucId: UseCaseId) => {
    setState((s) => ({ ...s, rebootPct: { ...s.rebootPct, [ucId]: 0 } }))
    const iv = setInterval(() => {
      setState((s) => {
        const pct = Math.min(100, (s.rebootPct[ucId] ?? 0) + 8)
        if (pct >= 100) {
          clearInterval(iv)
          setTimeout(() => advanceRef.current(ucId), 300)
        }
        return { ...s, rebootPct: { ...s.rebootPct, [ucId]: pct } }
      })
    }, 150)
  }, [])

  const advance = useCallback(
    (ucIdArg?: UseCaseId) => {
      const s = stateRef.current
      const uc = ucIdArg ?? s.activeUseCase
      const tl = buildTimeline(uc, !!s.injectedUC[uc])
      const idx = Math.min((s.stepIndex[uc] ?? 4) + 1, tl.length - 1)
      setState((prev) => ({ ...prev, stepIndex: { ...prev.stepIndex, [uc]: idx } }))
      // When the step now pending is a delayed action (reboot/restart),
      // kick off its progress simulation; on completion it advances again.
      const pendingNext = tl[idx + 1]
      if (pendingNext && pendingNext.kind === 'exec' && pendingNext.delayed) startReboot(uc)
    },
    [startReboot],
  )
  const advanceRef = useRef<(ucIdArg?: UseCaseId) => void>(() => {})
  useEffect(() => {
    advanceRef.current = advance
  }, [advance])

  const approveGate = useCallback(() => advance(), [advance])

  const rejectGate = useCallback(() => {
    const s = stateRef.current
    const uc = s.activeUseCase
    const tl = buildTimeline(uc, !!s.injectedUC[uc])
    setState((prev) => ({ ...prev, stepIndex: { ...prev.stepIndex, [uc]: tl.length - 1 } }))
  }, [])

  const actions = useMemo<Omit<DemoActions, 'timelineFor' | 'advance' | 'approveGate' | 'rejectGate'>>(
    () => ({
      setRole: (role) => setState((s) => ({ ...s, role })),
      selectUseCase: (ucId) => setState((s) => ({ ...s, activeUseCase: ucId })),
      setLayoutMode: (mode) => setState((s) => ({ ...s, layoutMode: mode })),
      flagTicket: (id) =>
        setState((s) => ({
          ...s,
          flagged: { ...s.flagged, [id]: { reason: 'Outcome looked incorrect', at: 'just now' } },
        })),
      markReviewed: (id) => setState((s) => ({ ...s, reviewed: { ...s.reviewed, [id]: true } })),
      resetDemo: () =>
        setState((s) => ({
          ...s,
          stepIndex: { ...INITIAL_STEP_INDEX },
          injectedUC: {},
          flagged: {},
          reviewed: {},
          rebootPct: {},
        })),
      setGenTab: (tab) => setState((s) => ({ ...s, genTab: tab, fireConfirmation: null })),
      setMonScenario: (mon) =>
        setState((s) => ({ ...s, monScenario: mon, fireConfirmation: null })),
      setGlobalInject: (v) => setState((s) => ({ ...s, globalInject: v })),
      fireAlert: () =>
        setState((s) => {
          const uc = s.monScenario
          const ids: Record<MonScenario, string> = {
            vdisk: 'ALT-88213',
            nic: 'ALT-77120',
            cpu: 'ALT-90042',
          }
          const injectMap: Record<MonScenario, string> = {
            vdisk: 'vdisk_degraded',
            nic: 'nic_persists',
            cpu: 'cpu_high',
          }
          return {
            ...s,
            fireConfirmation: { uc, alertId: ids[uc] },
            injectedUC: { ...s.injectedUC, [uc]: s.globalInject === injectMap[uc] },
            stepIndex: { ...s.stepIndex, [uc]: 4 },
          }
        }),
      submitTicket: () =>
        setState((s) => ({
          ...s,
          fireConfirmation: { uc: 'cert', alertId: 'INC0012345' },
          injectedUC: { ...s.injectedUC, cert: s.globalInject === 'dc_unreachable' },
          stepIndex: { ...s.stepIndex, cert: 4 },
        })),
      clearFireConfirmation: () => setState((s) => ({ ...s, fireConfirmation: null })),
    }),
    [],
  )

  const store = useMemo<DemoStore>(
    () => ({ ...state, ...actions, timelineFor, advance, approveGate, rejectGate }),
    [state, actions, timelineFor, advance, approveGate, rejectGate],
  )

  return <DemoContext.Provider value={store}>{children}</DemoContext.Provider>
}

export function useDemo(): DemoStore {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used within DemoProvider')
  return ctx
}
