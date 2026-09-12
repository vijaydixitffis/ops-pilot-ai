// External systems simulator — deliberately un-branded (Arial, grey
// chrome, no OpsPilot AI identity), per handoff §A1: it represents
// ServiceNow / Jira / Email / Monitoring, "the outside world".
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDemo, type GenTab, type MonScenario } from '../state/DemoStore'
import { MON_ALERTS } from '../data/useCases'
import { BrandSidebar } from '../components/BrandSidebar'

const TICKET_TABS: { key: GenTab; label: string }[] = [
  { key: 'servicenow', label: 'ServiceNow' },
  { key: 'jira', label: 'Jira' },
  { key: 'email', label: 'Email' },
  { key: 'monitoring', label: 'Monitoring alert' },
]

type TicketScenarioKey = 'cert_renewal' | 'log_collection'

interface TicketScenario {
  label: string
  short: string
  long: string
  requester: string
  ci: string
  product: string
  priority: string
  injectOptions: { value: string; label: string }[]
}

const TICKET_SCENARIOS: Record<TicketScenarioKey, TicketScenario> = {
  cert_renewal: {
    label: 'Certificate expiry / LDAP login failing — Avamar',
    short: 'LDAP authentication failing on IDPA Wilmington',
    long: 'Users report LDAP login failures on uswilbu1.corp.riotinto.org...',
    requester: 'carl.vale@riotinto.com',
    ci: 'uswilbu1.corp.riotinto.org',
    product: 'Avamar',
    priority: 'P2',
    injectOptions: [
      { value: 'none', label: 'None' },
      { value: 'dc_unreachable', label: 'DC unreachable' },
    ],
  },
  log_collection: {
    label: 'Collect log bundle — IDPA ACM dashboard + ESXi host logs',
    short: 'Collect log bundle for IDPA ACM dashboard',
    long: 'Please collect ACM dashboard log bundle and ESXi host logs for esxi20.shared.trintech.host for diagnostics.',
    requester: 'ops@client.com',
    ci: 'esxi20.shared.trintech.host',
    product: 'IDPA',
    priority: 'P3',
    injectOptions: [{ value: 'none', label: 'None' }],
  },
}

const PRIORITIES = ['P1', 'P2', 'P3', 'P4']

const MON_INJECT_OPTIONS: Record<MonScenario, { value: string; label: string }[]> = {
  vdisk: [
    { value: 'none', label: 'None' },
    { value: 'vdisk_degraded', label: 'Virtual disk stays degraded' },
  ],
  nic: [
    { value: 'none', label: 'None' },
    { value: 'nic_persists', label: 'NIC issue persists' },
  ],
  cpu: [
    { value: 'none', label: 'None' },
    { value: 'cpu_high', label: 'CPU stays high' },
  ],
}

// Plain-English explanation of what each inject-failure option does — shown
// as help text so a non-technical demo audience understands what they're
// about to trigger. Any option other than "None" forces the planner's
// confidence score low, so the agent skips execution and escalates the
// ticket straight to a human, rather than attempting and failing a step.
const INJECT_HELP: Record<string, string> = {
  none: 'No failure injected — the agent runs its normal path for this scenario.',
  dc_unreachable:
    'Simulates the domain controller being unreachable during the certificate precheck — confidence drops and the ticket is escalated to a human immediately, before any remediation is attempted.',
  vdisk_degraded:
    'Simulates the virtual disk still being degraded even after a reboot would run — confidence drops and the ticket is escalated immediately rather than attempting the reboot.',
  nic_persists:
    'Simulates the NIC issue persisting after a port flap — confidence drops and the ticket is escalated immediately (this matches the real scenario, where the correct outcome is a vendor case, not a retry).',
  cpu_high:
    'Simulates CPU usage staying pinned above threshold — confidence drops and the ticket is escalated immediately rather than closed as a false positive.',
}

const fieldStyle: React.CSSProperties = {
  padding: 9,
  border: '1px solid #c7ccd2',
  borderRadius: 4,
  fontSize: 14,
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  color: '#5a626c',
}

export function TicketGenerator() {
  const demo = useDemo()
  const navigate = useNavigate()

  const [scenarioKey, setScenarioKey] = useState<TicketScenarioKey>('cert_renewal')
  const scenario = TICKET_SCENARIOS[scenarioKey]
  const [priority, setPriority] = useState(scenario.priority)
  const [shortDesc, setShortDesc] = useState(scenario.short)
  const [longDesc, setLongDesc] = useState(scenario.long)
  const [requester, setRequester] = useState(scenario.requester)
  const [ci, setCi] = useState(scenario.ci)

  const selectScenario = (key: TicketScenarioKey) => {
    const next = TICKET_SCENARIOS[key]
    setScenarioKey(key)
    setPriority(next.priority)
    setShortDesc(next.short)
    setLongDesc(next.long)
    setRequester(next.requester)
    setCi(next.ci)
    demo.setGlobalInject('none')
  }

  const submitTicket = () => {
    demo.submitTicket({
      source: demo.genTab,
      ticket_id: `INC${Math.floor(1000000 + Math.random() * 8999999)}`,
      short_description: shortDesc,
      long_description: longDesc,
      requester,
      priority,
      ci,
      product: scenario.product,
      inject_failure: demo.globalInject !== 'none' ? demo.globalInject : null,
    })
  }

  const isMonTab = demo.genTab === 'monitoring'
  const tabLabel =
    demo.genTab === 'servicenow' ? 'ServiceNow' : demo.genTab === 'jira' ? 'Jira' : 'Email'

  const tabStyle = (key: GenTab): React.CSSProperties => {
    const active = demo.genTab === key
    const base: React.CSSProperties = {
      padding: '12px 22px',
      cursor: 'pointer',
      fontSize: 14,
      fontWeight: 600,
    }
    if (!active) return { ...base, color: '#6c757d' }
    if (key === 'monitoring')
      return {
        ...base,
        background: '#20242b',
        border: '1px solid #33383f',
        borderBottom: '2px solid #20242b',
        color: '#e2e6ea',
        marginBottom: -2,
      }
    return {
      ...base,
      background: '#fff',
      border: '1px solid #c7ccd2',
      borderBottom: '2px solid #fff',
      color: '#2a2f36',
      marginBottom: -2,
    }
  }

  const openFiredInL1 = () => {
    if (demo.fireConfirmation?.liveTicketId) {
      navigate(`/l1/ticket/live/${demo.fireConfirmation.liveTicketId}`)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <BrandSidebar />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: '#eef0f2',
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: '#2a2f36',
        }}
      >
      <div
        style={{
          background: '#3a4048',
          color: '#cfd4da',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          fontSize: 13,
        }}
      >
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            demo.signOut()
            navigate('/')
          }}
          style={{ color: '#9fb0c0', fontSize: 13 }}
        >
          Log out
        </a>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ font: 'var(--t-h2)', color: 'var(--fg-2)', marginBottom: 20 }}>
          External Systems Simulator
        </div>
        <div style={{ display: 'flex', gap: 2, marginBottom: 0, borderBottom: '2px solid #c7ccd2' }}>
          {TICKET_TABS.map((t) => (
            <div key={t.key} onClick={() => demo.setGenTab(t.key)} style={tabStyle(t.key)}>
              {t.label}
            </div>
          ))}
        </div>

        {!isMonTab && (
          <div
            style={{
              background: '#fff',
              border: '1px solid #c7ccd2',
              borderTop: 'none',
              padding: 26,
              borderRadius: '0 0 6px 6px',
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: '#8b929b',
                marginBottom: 16,
              }}
            >
              {tabLabel} — new ticket
            </div>
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
              <label style={labelStyle}>
                Scenario
                <select
                  value={scenarioKey}
                  onChange={(e) => selectScenario(e.target.value as TicketScenarioKey)}
                  style={fieldStyle}
                >
                  {Object.entries(TICKET_SCENARIOS).map(([key, s]) => (
                    <option key={key} value={key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                Priority
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={fieldStyle}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ ...labelStyle, gridColumn: '1/-1' }}>
                Short description
                <input
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  style={fieldStyle}
                />
              </label>
              <label style={{ ...labelStyle, gridColumn: '1/-1' }}>
                Long description
                <textarea
                  rows={3}
                  value={longDesc}
                  onChange={(e) => setLongDesc(e.target.value)}
                  style={{ ...fieldStyle, resize: 'vertical' }}
                />
              </label>
              <label style={labelStyle}>
                Requester
                <input value={requester} onChange={(e) => setRequester(e.target.value)} style={fieldStyle} />
              </label>
              <label style={labelStyle}>
                CI / device
                <input value={ci} onChange={(e) => setCi(e.target.value)} style={fieldStyle} />
              </label>
            </div>
            <div style={{ marginTop: 18, display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
              <button
                onClick={submitTicket}
                style={{
                  background: '#2a6ea8',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Submit ticket
              </button>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5a626c' }}>
                  Inject failure
                  <select
                    value={demo.globalInject}
                    onChange={(e) => demo.setGlobalInject(e.target.value)}
                    style={{ padding: 6, border: '1px solid #c7ccd2', borderRadius: 4, fontSize: 13 }}
                  >
                    {scenario.injectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ fontSize: 12, color: '#8b929b', marginTop: 6, maxWidth: 480 }}>
                  {INJECT_HELP[demo.globalInject] ?? INJECT_HELP.none}
                </div>
              </div>
            </div>
          </div>
        )}

        {isMonTab && (
          <div
            style={{
              background: '#20242b',
              border: '1px solid #33383f',
              borderTop: 'none',
              padding: 26,
              borderRadius: '0 0 6px 6px',
              color: '#c7ccd2',
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: '#7d8894',
                marginBottom: 16,
              }}
            >
              Monitoring alert — raw feed
            </div>
            <div
              style={{
                display: 'grid',
                gap: 12,
                marginBottom: 16,
                gridTemplateColumns: '1fr 1fr',
              }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                Scenario
                <select
                  value={demo.monScenario}
                  onChange={(e) => {
                    demo.setMonScenario(e.target.value as MonScenario)
                    demo.setGlobalInject('none')
                  }}
                  style={{
                    padding: 9,
                    border: '1px solid #454b54',
                    borderRadius: 4,
                    fontSize: 13,
                    background: '#161a20',
                    color: '#e2e6ea',
                  }}
                >
                  <option value="vdisk">Virtual disk degraded — iDRAC/PowerFlex</option>
                  <option value="nic">NIC port down — Ethernet1/2</option>
                  <option value="cpu">Host CPU usage — vCenter</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                Inject failure
                <select
                  value={demo.globalInject}
                  onChange={(e) => demo.setGlobalInject(e.target.value)}
                  style={{
                    padding: 9,
                    border: '1px solid #454b54',
                    borderRadius: 4,
                    fontSize: 13,
                    background: '#161a20',
                    color: '#e2e6ea',
                  }}
                >
                  {MON_INJECT_OPTIONS[demo.monScenario].map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: '#7d8894', fontWeight: 400 }}>
                  {INJECT_HELP[demo.globalInject] ?? INJECT_HELP.none}
                </span>
              </label>
            </div>
            <textarea
              readOnly
              value={MON_ALERTS[demo.monScenario]}
              rows={3}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: 12,
                border: '1px solid #454b54',
                borderRadius: 4,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                background: '#161a20',
                color: '#8fd19e',
                resize: 'vertical',
              }}
            />
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={demo.fireAlert}
                style={{
                  background: '#2f8fdb',
                  color: '#0d1117',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Fire alert
              </button>
              <span style={{ fontSize: 12, color: '#7d8894' }}>
                Fires a raw alert string — no ticket form, exactly as the source alerts arrive.
              </span>
            </div>
          </div>
        )}

        {demo.fireConfirmation && (
          <div
            style={{
              marginTop: 20,
              background: '#eaf3ea',
              border: '1px solid #b7d8b7',
              borderRadius: 6,
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 14, color: '#2d4a2d' }}>
              ✓ Fired {demo.fireConfirmation.kind === 'ticket' ? 'ticket ' : 'alert '}
              {demo.fireConfirmation.alertId} — now routed to the L1 queue.
            </div>
            <button
              onClick={openFiredInL1}
              disabled={!demo.fireConfirmation.liveTicketId}
              style={{
                background: '#2c3e50',
                color: '#fff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: 4,
                fontSize: 13,
                cursor: demo.fireConfirmation.liveTicketId ? 'pointer' : 'default',
                opacity: demo.fireConfirmation.liveTicketId ? 1 : 0.6,
              }}
            >
              {demo.fireConfirmation.liveTicketId ? 'Open in L1 console →' : 'Routing…'}
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
