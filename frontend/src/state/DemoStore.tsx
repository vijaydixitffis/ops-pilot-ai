// ============================================================
// OpsPilot AI — app-wide session/UI state.
// Tickets, execution, and outcomes all live in Supabase now
// (see lib/useLiveTickets.ts, lib/supabaseClient.ts, and
// pages/L1Console/LiveTicketDetail.tsx). This store only holds
// the signed-in role/label and the external-systems-simulator
// form state.
// ============================================================
import { createContext, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MON_ALERTS, type UseCaseId } from '../data/useCases'
import { supabase } from '../lib/supabaseClient'

export type Role = 'l1' | 'admin'
export type GenTab = 'servicenow' | 'jira' | 'email' | 'monitoring'
export type MonScenario = 'vdisk' | 'nic' | 'cpu'

export interface FireConfirmation {
  uc: UseCaseId
  alertId: string
  liveTicketId?: string
}

interface DemoState {
  role: Role | null
  accountLabel: string | null
  genTab: GenTab
  monScenario: MonScenario
  globalInject: string
  fireConfirmation: FireConfirmation | null
}

interface DemoActions {
  setRole: (role: Role | null, accountLabel?: string | null) => void
  setGenTab: (tab: GenTab) => void
  setMonScenario: (s: MonScenario) => void
  setGlobalInject: (v: string) => void
  fireAlert: () => void
  submitTicket: () => void
  clearFireConfirmation: () => void
}

export type DemoStore = DemoState & DemoActions

const DemoContext = createContext<DemoStore | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>({
    role: null,
    accountLabel: null,
    genTab: 'monitoring',
    monScenario: 'vdisk',
    globalInject: 'none',
    fireConfirmation: null,
  })
  const stateRef = useRef(state)
  stateRef.current = state

  const actions = useMemo<DemoActions>(
    () => ({
      setRole: (role, accountLabel = null) => setState((s) => ({ ...s, role, accountLabel })),
      setGenTab: (tab) => setState((s) => ({ ...s, genTab: tab, fireConfirmation: null })),
      setMonScenario: (mon) =>
        setState((s) => ({ ...s, monScenario: mon, fireConfirmation: null })),
      setGlobalInject: (v) => setState((s) => ({ ...s, globalInject: v })),
      fireAlert: () => {
        const s = stateRef.current
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
        const hostMap: Record<MonScenario, string> = {
          vdisk: 'node12',
          nic: 'ash-flex1-tor35',
          cpu: 'esxi20.shared.trintech.host',
        }
        const alertId = ids[uc]
        setState((prev) => ({ ...prev, fireConfirmation: { uc, alertId } }))
        supabase.functions
          .invoke('ingest-ticket', {
            body: {
              source: 'monitoring',
              alert_id: alertId,
              raw_alert: MON_ALERTS[uc],
              host: hostMap[uc],
              inject_failure: s.globalInject === injectMap[uc] ? s.globalInject : null,
            },
          })
          .then(({ data }) => {
            const ticketId = data?.ticket?.id
            if (ticketId) {
              setState((prev) => ({
                ...prev,
                fireConfirmation: prev.fireConfirmation
                  ? { ...prev.fireConfirmation, liveTicketId: ticketId }
                  : prev.fireConfirmation,
              }))
            }
          })
          .catch((err) => console.error('ingest-ticket failed', err))
      },
      submitTicket: () => {
        const s = stateRef.current
        setState((prev) => ({ ...prev, fireConfirmation: { uc: 'cert', alertId: 'INC0012345' } }))
        supabase.functions
          .invoke('ingest-ticket', {
            body: {
              source: 'servicenow',
              ticket_id: 'INC0012345',
              short_description: 'LDAP authentication failing on IDPA Wilmington',
              long_description: 'Users report LDAP login failures on uswilbu1.corp.riotinto.org...',
              requester: 'carl.vale@riotinto.com',
              priority: 'P2',
              ci: 'uswilbu1.corp.riotinto.org',
              product: 'Avamar',
              inject_failure: s.globalInject === 'dc_unreachable' ? s.globalInject : null,
            },
          })
          .then(({ data }) => {
            const ticketId = data?.ticket?.id
            if (ticketId) {
              setState((prev) => ({
                ...prev,
                fireConfirmation: prev.fireConfirmation
                  ? { ...prev.fireConfirmation, liveTicketId: ticketId }
                  : prev.fireConfirmation,
              }))
            }
          })
          .catch((err) => console.error('ingest-ticket failed', err))
      },
      clearFireConfirmation: () => setState((s) => ({ ...s, fireConfirmation: null })),
    }),
    [],
  )

  const store = useMemo<DemoStore>(() => ({ ...state, ...actions }), [state, actions])

  return <DemoContext.Provider value={store}>{children}</DemoContext.Provider>
}

export function useDemo(): DemoStore {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used within DemoProvider')
  return ctx
}
