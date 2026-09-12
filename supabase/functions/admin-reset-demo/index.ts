import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/db.ts'

// Snaps every mock_device_state row back to its initial condition (§9a) so a
// scenario can be re-run for a second audience without manual DB cleanup.
const INITIAL_STATE: Record<string, { product: string; state: Record<string, unknown> }> = {
  'uswilbu1.corp.riotinto.org': {
    product: 'Avamar',
    state: { cert_expiry: '2024-06-29', cert_serial: '3f9a1c', mcs_status: 'stopped', dc_reachable: true },
  },
  node12_idrac: {
    product: 'iDRAC',
    state: { virtual_disk_health: 'degraded', disk_id: 'Disk.Virtual.0:BOSS.SL.12-1', host_status: 'online' },
  },
  node12_powerflex: {
    product: 'PowerFlex',
    state: { is_sds_node: true, maintenance_mode: false },
  },
  'ash-flex1-tor35': {
    product: 'iDRAC',
    state: { nic_ports: { slot2_port2: 'down' }, flap_attempted: false, sr_number: null, wo_number: null },
  },
  'esxi20.shared.trintech.host': {
    product: 'vCenter',
    state: { cpu_usage_pct: 92, cpu_threshold_pct: 85, cpu_trend: [78, 85, 90, 92], host_status: 'online' },
  },
}

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const supabase = serviceClient()

  const rows = [
    { device_id: 'uswilbu1.corp.riotinto.org', ...INITIAL_STATE['uswilbu1.corp.riotinto.org'] },
    { device_id: 'node12', ...INITIAL_STATE.node12_idrac },
    { device_id: 'node12', ...INITIAL_STATE.node12_powerflex },
    { device_id: 'ash-flex1-tor35', ...INITIAL_STATE['ash-flex1-tor35'] },
    { device_id: 'esxi20.shared.trintech.host', ...INITIAL_STATE['esxi20.shared.trintech.host'] },
  ]

  for (const row of rows) {
    await supabase
      .from('mock_device_state')
      .update({ state: row.state })
      .eq('device_id', row.device_id)
      .eq('product', row.product)
  }

  return jsonResponse({ reset: rows.length })
})
