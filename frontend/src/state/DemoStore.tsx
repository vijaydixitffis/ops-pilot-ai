// ============================================================
// OpsPilot AI — app-wide session/UI state.
// Tickets, execution, and outcomes all live in Supabase now
// (see lib/useLiveTickets.ts, lib/supabaseClient.ts, and
// pages/L1Console/LiveTicketDetail.tsx). This store only holds
// the signed-in role/label and the external-systems-simulator
// form state.
// ============================================================
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MON_ALERTS } from '../data/useCases'
import { supabase, fetchProfile } from '../lib/supabaseClient'

export type Role = 'l1' | 'admin'
export type GenTab = 'servicenow' | 'jira' | 'email' | 'monitoring'
export type MonScenario = 'vdisk' | 'nic' | 'cpu'

export interface FireConfirmation {
  kind: 'ticket' | 'alert'
  alertId: string
  liveTicketId?: string
}

export interface TicketPayload {
  source: GenTab
  ticket_id: string
  short_description: string
  long_description: string
  requester: string
  priority: string
  ci: string
  product: string
  inject_failure: string | null
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
  submitTicket: (payload: TicketPayload) => void
  clearFireConfirmation: () => void
  signOut: () => void
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

  // Restore/track the Supabase Auth session so a page reload or a direct
  // link doesn't lose the signed-in role/name (React state resets on reload,
  // the Supabase session in localStorage does not).
  useEffect(() => {
    async function syncFromSession(userId: string | undefined) {
      if (!userId) {
        setState((s) => ({ ...s, role: null, accountLabel: null }))
        return
      }
      try {
        const profile = await fetchProfile(userId)
        const label = `Logged in as: ${profile.role === 'admin' ? 'Admin' : 'L1'} — ${profile.full_name}`
        setState((s) => ({ ...s, role: profile.role, accountLabel: label }))
      } catch {
        setState((s) => ({ ...s, role: null, accountLabel: null }))
      }
    }

    supabase.auth.getSession().then(({ data }) => syncFromSession(data.session?.user.id))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      syncFromSession(session?.user.id)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const actions = useMemo<DemoActions>(
    () => ({
      setRole: (role, accountLabel = null) => setState((s) => ({ ...s, role, accountLabel })),
      signOut: () => {
        supabase.auth.signOut()
        setState((s) => ({ ...s, role: null, accountLabel: null }))
      },
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
        setState((prev) => ({ ...prev, fireConfirmation: { kind: 'alert', alertId } }))
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
      submitTicket: (payload) => {
        setState((prev) => ({
          ...prev,
          fireConfirmation: { kind: 'ticket', alertId: payload.ticket_id },
        }))
        supabase.functions
          .invoke('ingest-ticket', { body: payload })
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
