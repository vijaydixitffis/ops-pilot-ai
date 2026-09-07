// ============================================================
// OpsPilot AI — POC scenario data
// Scripted use cases ported from the design handoff. Strings are
// drawn verbatim from the source runbooks (see handoff §1, §9e).
// In a later step this local data is replaced by the Supabase
// backend (tickets / agent_runs per the architecture spec).
// ============================================================

export type UseCaseId = 'vdisk' | 'cpu' | 'nic' | 'cert'
export type ConfidenceBand = 'High' | 'Medium' | 'Low'
export type RiskTier =
  | 'read_only'
  | 'write'
  | 'write_downtime'
  | 'write_reboot'
  | 'diagnostic_only'
export type StepKind = 'intake' | 'triage' | 'kb' | 'plan' | 'exec' | 'gate' | 'outcome'
export type OutcomeType = 'closed' | 'escalated' | 'awaiting'

export interface BeforeAfter {
  label: string
  before: string
  after: string
}

export interface SystemChip {
  label: string
  state: string
}

export interface VendorCase {
  sr: string
  status: string
}

export interface PlanStep {
  text: string
  tier: RiskTier
}

export interface TimelineStep {
  kind: StepKind
  title: string
  terminalLines: string[]
  chips: SystemChip[]
  beforeAfter?: BeforeAfter
  decision?: string
  vendorCase?: VendorCase
  delayed: boolean
  comms?: string
  impact: string
  outcomeType?: OutcomeType
  outcomeLabel?: string
  outcomeText?: string
}

export interface Outcome {
  type: OutcomeType
  text: string
}

export interface UseCase {
  id: UseCaseId
  label: string
  sourceLabel: string
  riskTier: string
  autonomy: string
  confBand: ConfidenceBand
  intakeText: string
  citation: string
  planSteps: PlanStep[]
  steps: TimelineStep[]
  outcome: Outcome
  failOutcome: Outcome | null
  failAtIndex: number
  failExtra?: TimelineStep[]
}

export const TIER_META: Record<RiskTier, { color: string; bg: string; label: string }> = {
  read_only: { color: '#0f4570', bg: '#eef5fb', label: 'Read-only' },
  write: { color: '#8a5c12', bg: '#faf1e0', label: 'Write' },
  write_downtime: { color: '#8a5c12', bg: '#f7e6c8', label: 'Write + downtime' },
  write_reboot: { color: '#9a3226', bg: '#fbe4e0', label: 'Write + reboot' },
  diagnostic_only: { color: '#382f70', bg: '#ece9f7', label: 'Diagnostic only' },
}

export const CONF_BG: Record<ConfidenceBand, string> = {
  High: '#2f8f6b',
  Medium: '#1a6fb5',
  Low: '#c0473a',
}

function mkStep(kind: StepKind, extra: Partial<TimelineStep> = {}): TimelineStep {
  return {
    kind,
    title: '',
    terminalLines: [],
    chips: [],
    delayed: false,
    impact: '',
    ...extra,
  }
}

export const USE_CASES: Record<UseCaseId, UseCase> = {
  vdisk: {
    id: 'vdisk',
    label: 'Virtual disk degraded',
    sourceLabel: 'Monitoring alert',
    riskTier: 'Write + reboot, cross-system',
    autonomy: 'Guided',
    confBand: 'High',
    intakeText:
      'idrac-::(availability):: iDRAC Virtual Disk Disk.Virtual.0:BOSS.SL.12-1 health is degraded.\nHost: esxi20.shared.trintech.host',
    citation: 'Incidents_scenarios — "Virtual disk" action plan',
    planSteps: [
      { text: 'Verify virtual disk status via iDRAC', tier: 'read_only' },
      { text: 'Check SDS node membership via PowerFlex Manager', tier: 'read_only' },
      { text: 'If SDS node: enable Maintenance Mode', tier: 'write' },
      { text: 'Reboot host via iDRAC', tier: 'write_reboot' },
      { text: 'Re-validate; disable Maintenance Mode', tier: 'write' },
    ],
    steps: [
      mkStep('exec', {
        title: 'Check virtual disk status',
        terminalLines: [
          '$ GET /mock/idrac/esxi20/virtual-disk',
          '> {"status": "degraded", "disk_id": "Disk.Virtual.0:BOSS.SL.12-1"}',
        ],
        chips: [{ label: 'iDRAC', state: 'connected' }],
      }),
      mkStep('exec', {
        title: 'Check SDS node membership',
        terminalLines: [
          '$ GET /mock/powerflex/sds/esxi20.shared.trintech.host',
          '> {"is_sds_node": true}',
        ],
        chips: [
          { label: 'iDRAC', state: 'connected' },
          { label: 'PowerFlex Manager', state: 'connected' },
        ],
        decision: 'SDS node confirmed ✓',
      }),
      mkStep('gate', {
        title: 'Enable Maintenance Mode',
        impact: 'Pauses SDS I/O redistribution to this node before reboot.',
      }),
      mkStep('exec', {
        title: 'Maintenance Mode enabled',
        terminalLines: [
          '$ POST /mock/powerflex/sds/.../maintenance-mode {"enabled": true}',
          '> {"maintenance_mode": true}',
        ],
        beforeAfter: { label: 'Maintenance mode', before: 'false', after: 'true' },
      }),
      mkStep('gate', {
        title: 'Reboot host',
        impact:
          'Host will restart to clear the degraded virtual disk state. Brief service interruption expected.',
      }),
      mkStep('exec', {
        title: 'Rebooting host',
        delayed: true,
        terminalLines: ['$ POST /mock/idrac/esxi20/reboot'],
        beforeAfter: { label: 'Host status', before: 'online', after: 'rebooting → online' },
      }),
      mkStep('exec', {
        title: 'Re-check virtual disk status',
        terminalLines: ['$ GET /mock/idrac/esxi20/virtual-disk', '> {"status": "optimal"}'],
        beforeAfter: { label: 'Virtual disk health', before: 'degraded', after: 'optimal' },
      }),
      mkStep('exec', {
        title: 'Disable Maintenance Mode',
        terminalLines: [
          '$ POST .../maintenance-mode {"enabled": false}',
          '> {"maintenance_mode": false}',
        ],
        beforeAfter: { label: 'Maintenance mode', before: 'true', after: 'false' },
      }),
    ],
    outcome: {
      type: 'closed',
      text: 'Virtual disk restored to optimal. Ticket closed — no escalation required.',
    },
    failOutcome: {
      type: 'escalated',
      text: 'Virtual disk still degraded after reboot. Escalated — Dell Technical Support case opened automatically.',
    },
    failAtIndex: 5,
  },
  cpu: {
    id: 'cpu',
    label: 'CPU usage alert',
    sourceLabel: 'Monitoring alert',
    riskTier: 'Read-only',
    autonomy: 'Full auto-resolve',
    confBand: 'High',
    intakeText: 'esxi20.shared.trintech.host::(HostSystem):: Host CPU usage alert',
    citation: 'Incidents_scenarios — "CPU usage" action plan',
    planSteps: [{ text: 'Confirm current CPU% against threshold', tier: 'read_only' }],
    steps: [
      mkStep('exec', {
        title: 'Confirm CPU usage',
        terminalLines: [
          '$ GET /mock/vcenter/esxi20.../cpu-usage',
          '> {"cpu_usage_pct": 78, "cpu_threshold_pct": 85}',
        ],
        beforeAfter: { label: 'CPU usage', before: '—', after: '78% (below 85% threshold)' },
        chips: [{ label: 'vCenter', state: 'connected' }],
      }),
    ],
    outcome: {
      type: 'closed',
      text: 'CPU usage below threshold. No changes made — ticket closed automatically.',
    },
    failOutcome: {
      type: 'closed',
      text: 'CPU sustained above threshold. Extension (not sourced from the runbook): top consumer identified, vMotion migration approved, workload moved — CPU normalized without downtime.',
    },
    failAtIndex: 0,
    failExtra: [
      mkStep('exec', {
        title: 'Identify top consumer process',
        terminalLines: [
          '$ GET /mock/vcenter/esxi20.../top-processes',
          '> {"top": "vm-analytics-07", "pct": 61}',
        ],
      }),
      mkStep('gate', {
        title: 'Migrate workload via vMotion',
        impact:
          'Extension, not sourced from the runbook — labeled as such to the client. No downtime; workload moves to another host.',
      }),
      mkStep('exec', {
        title: 'vMotion complete',
        terminalLines: [
          '$ POST /mock/vcenter/vmotion {"vm":"vm-analytics-07"}',
          '> {"status":"migrated"}',
        ],
        beforeAfter: { label: 'CPU usage', before: '92%', after: '74%' },
      }),
    ],
  },
  nic: {
    id: 'nic',
    label: 'NIC port down',
    sourceLabel: 'Monitoring alert',
    riskTier: 'Diagnostic only',
    autonomy: 'Auto-diagnose, mandatory escalation',
    confBand: 'High',
    intakeText: 'ash-flex1-tor35::(portdown):: Ethernet1/2 on esxi-node14 is down',
    citation: 'Incidents_scenarios — "Nic replacement" action plan',
    planSteps: [
      { text: 'Verify port status via iDRAC', tier: 'read_only' },
      { text: 'Attempt port flap', tier: 'diagnostic_only' },
      {
        text: 'If unresolved: open vendor SR, upload TSR logs, track WO/Change',
        tier: 'diagnostic_only',
      },
    ],
    steps: [
      mkStep('exec', {
        title: 'Verify port status',
        terminalLines: [
          '$ GET /mock/idrac/esxi-node14/nic-status',
          '> {"nic_ports": {"slot2_port2": "down"}}',
        ],
        chips: [{ label: 'iDRAC', state: 'connected' }],
      }),
      mkStep('exec', {
        title: 'Attempt port flap',
        terminalLines: [
          '$ POST /mock/idrac/esxi-node14/nic-status/flap',
          '> {"flap_attempted": true, "slot2_port2": "down"}',
        ],
        beforeAfter: { label: 'Port status', before: 'down', after: 'down — unresolved' },
        decision: 'No software remedy exists — escalation is the correct outcome',
      }),
      mkStep('exec', {
        title: 'Open vendor case & upload logs',
        terminalLines: [
          '$ POST vendor_cases {"status": "opened"}',
          '$ POST vendor_cases {"status": "logs_uploaded"}',
          '> {"sr_number": "SR-4471182"}',
        ],
        vendorCase: { sr: 'SR-4471182', status: 'Logs uploaded' },
      }),
    ],
    outcome: {
      type: 'escalated',
      text: 'No software remedy available. Vendor case opened, logs uploaded — ticket correctly left open, not closed.',
    },
    failOutcome: null,
    failAtIndex: -1,
  },
  cert: {
    id: 'cert',
    label: 'Certificate expiry / LDAP failing',
    sourceLabel: 'Ticket INC0012345',
    riskTier: 'Write + downtime',
    autonomy: 'Guided',
    confBand: 'Medium',
    intakeText:
      '"LDAP authentication failing on IDPA Wilmington" — uswilbu1.corp.riotinto.org',
    citation: 'How to create DC certificates and import to Avamar Keystore',
    planSteps: [
      { text: 'Run keytool/openssl prechecks against DC', tier: 'read_only' },
      { text: 'Confirm DC reachability (curl :636)', tier: 'read_only' },
      { text: 'Back up, delete, and re-import keystore cert', tier: 'write_downtime' },
      { text: 'Restart MCS service', tier: 'write_downtime' },
    ],
    steps: [
      mkStep('exec', {
        title: 'Run keytool precheck',
        terminalLines: [
          '$ keytool -list -keystore avamar.keystore',
          '> Certificate expiry: 2024-06-29 (EXPIRED)',
        ],
        beforeAfter: { label: 'Cert expiry', before: '2024-06-29', after: 'expired' },
      }),
      mkStep('exec', {
        title: 'Confirm DC reachability',
        terminalLines: [
          '$ curl -v uswilbu1.corp.riotinto.org:636',
          '> connected, dc_reachable: true',
        ],
        chips: [{ label: 'Domain Controller', state: 'connected' }],
      }),
      mkStep('gate', {
        title: 'Back up & replace keystore cert',
        impact: 'Drafted downtime email sent to stakeholders before this step.',
        comms:
          'Subject: Scheduled brief LDAP service interruption — uswilbu1\n\nA short interruption to LDAP authentication is expected while we renew an expiring certificate. Estimated impact: <5 minutes.',
      }),
      mkStep('exec', {
        title: 'Keystore updated',
        terminalLines: [
          '$ keytool -delete -alias dc-cert',
          '$ keytool -importcert -alias dc-cert -file new.cer',
          '> Import successful',
        ],
        beforeAfter: { label: 'Cert expiry', before: '2024-06-29', after: '2025-05-15' },
      }),
      mkStep('gate', {
        title: 'Restart MCS service',
        impact: 'MCS will restart to load the new certificate. Brief service interruption expected.',
      }),
      mkStep('exec', {
        title: 'Restarting MCS',
        delayed: true,
        terminalLines: ['$ dpnctl stop mcs', '$ dpnctl start mcs'],
        beforeAfter: { label: 'MCS status', before: 'stopped', after: 'running' },
      }),
    ],
    outcome: {
      type: 'closed',
      text: 'Certificate renewed, MCS restarted successfully. Ticket closed.',
    },
    failOutcome: {
      type: 'escalated',
      text: 'Domain controller unreachable. Escalated to L2/L3 to confirm DC connectivity before proceeding.',
    },
    failAtIndex: 1,
  },
}

export const UC_ORDER: UseCaseId[] = ['vdisk', 'cpu', 'nic', 'cert']

export const UC_LABELS: Record<UseCaseId, string> = {
  vdisk: 'Virtual disk',
  cpu: 'CPU usage',
  nic: 'NIC down',
  cert: 'Cert renewal',
}

export const UC_TICKET_IDS: Record<UseCaseId, string> = {
  vdisk: 'ALT-VDISK',
  cpu: 'ALT-CPU',
  nic: 'ALT-NIC',
  cert: 'INC0012345',
}

export const MON_ALERTS: Record<'vdisk' | 'nic' | 'cpu', string> = {
  vdisk:
    'idrac-::(availability):: iDRAC Virtual Disk Disk.Virtual.0:BOSS.SL.12-1 health is degraded.',
  nic: 'ash-flex1-tor35::(portdown):: Ethernet1/2 on esxi-node14 is down',
  cpu: 'esxi20.shared.trintech.host::(HostSystem):: Host CPU usage',
}

const OUTCOME_LABEL: Record<OutcomeType, string> = {
  closed: 'Closed',
  escalated: 'Escalated',
  awaiting: 'Awaiting input',
}

export const OUTCOME_BG: Record<OutcomeType, string> = {
  closed: '#2f8f6b',
  escalated: '#c0473a',
  awaiting: '#8794a3',
}

/**
 * Builds the full step timeline for a use case: the four intake/triage/kb/plan
 * steps, the scripted execution steps (rerouted to the failure branch when the
 * inject-failure toggle is set), and a final outcome step.
 */
export function buildTimeline(ucId: UseCaseId, injected: boolean): TimelineStep[] {
  const uc = USE_CASES[ucId]
  const base = [mkStep('intake'), mkStep('triage'), mkStep('kb'), mkStep('plan')]
  let mid = uc.steps.slice()
  let outcome = uc.outcome
  if (injected && uc.failAtIndex >= 0 && uc.failOutcome) {
    mid = mid.slice(0, uc.failAtIndex + 1)
    if (uc.failExtra) mid = mid.concat(uc.failExtra)
    outcome = uc.failOutcome
  }
  const outcomeStep = mkStep('outcome', {
    outcomeType: outcome.type,
    outcomeLabel: OUTCOME_LABEL[outcome.type],
    outcomeText: outcome.text,
  })
  return base.concat(mid).concat([outcomeStep])
}
