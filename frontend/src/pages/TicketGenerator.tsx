// External systems simulator — deliberately un-branded (Arial, grey
// chrome, no OpsPilot AI identity), per handoff §A1: it represents
// ServiceNow / Jira / Email / Monitoring, "the outside world".
import { useNavigate } from 'react-router-dom'
import { useDemo, type GenTab, type MonScenario } from '../state/DemoStore'
import { MON_ALERTS } from '../data/useCases'

const TICKET_TABS: { key: GenTab; label: string }[] = [
  { key: 'servicenow', label: 'ServiceNow' },
  { key: 'jira', label: 'Jira' },
  { key: 'email', label: 'Email' },
  { key: 'monitoring', label: 'Monitoring alert' },
]

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
    <div
      style={{
        minHeight: '100vh',
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
          justifyContent: 'space-between',
          fontSize: 13,
        }}
      >
        <span>External systems simulator — not part of OpsPilot AI</span>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            navigate('/')
          }}
          style={{ color: '#9fb0c0', fontSize: 13 }}
        >
          ← Back to login
        </a>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
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
                <select style={fieldStyle}>
                  <option>Certificate expiry / LDAP login failing — Avamar</option>
                </select>
              </label>
              <label style={labelStyle}>
                Priority
                <select style={fieldStyle}>
                  <option>P2</option>
                </select>
              </label>
              <label style={{ ...labelStyle, gridColumn: '1/-1' }}>
                Short description
                <input
                  defaultValue="LDAP authentication failing on IDPA Wilmington"
                  style={fieldStyle}
                />
              </label>
              <label style={{ ...labelStyle, gridColumn: '1/-1' }}>
                Long description
                <textarea
                  rows={3}
                  defaultValue="Users report LDAP login failures on uswilbu1.corp.riotinto.org..."
                  style={{ ...fieldStyle, resize: 'vertical' }}
                />
              </label>
              <label style={labelStyle}>
                Requester
                <input defaultValue="carl.vale@riotinto.com" style={fieldStyle} />
              </label>
              <label style={labelStyle}>
                CI / device
                <input defaultValue="uswilbu1.corp.riotinto.org" style={fieldStyle} />
              </label>
            </div>
            <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={demo.submitTicket}
                style={{
                  background: '#2a6ea8',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Submit ticket
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5a626c' }}>
                Inject failure
                <select
                  value={demo.globalInject}
                  onChange={(e) => demo.setGlobalInject(e.target.value)}
                  style={{ padding: 6, border: '1px solid #c7ccd2', borderRadius: 4, fontSize: 13 }}
                >
                  <option value="none">None</option>
                  <option value="dc_unreachable">DC unreachable</option>
                </select>
              </label>
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
                  onChange={(e) => demo.setMonScenario(e.target.value as MonScenario)}
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
                  <option value="none">None</option>
                  <option value="dc_unreachable">DC unreachable</option>
                  <option value="vdisk_degraded">Virtual disk stays degraded</option>
                  <option value="nic_persists">NIC issue persists</option>
                  <option value="cpu_high">CPU stays high</option>
                </select>
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
              ✓ Fired {demo.fireConfirmation.uc === 'cert' ? 'ticket ' : 'alert '}
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
  )
}
