-- OpsPilot AI POC — runbook + step seed data, derived from the five source
-- documents summarized in the handoff (§1, §9e). Idempotent: safe to re-run.

insert into runbooks (title, use_case, product, trigger_type, full_text, version, last_reviewed)
values
  ('How to create DC certificates and import to Avamar Keystore',
   'cert_renewal', 'Avamar', 'ticket',
   'Detect LDAP/DC certificate expiry against the Avamar keystore. Prechecks: keytool -list to inspect current keystore entries; curl/openssl s_client against DC:636 to confirm reachability and current cert expiry. If expiring/expired: back up the keystore, delete the stale DC cert entry, import the renewed cert, restart MCS. Escalate to L2/L3 if the DC is unreachable during precheck.',
   '1.0', current_date),
  ('Log Collection for IDPA components',
   'log_collection', 'IDPA', 'ticket',
   'Collect a log bundle from IDPA components for diagnostics: trigger an ACM dashboard log bundle export, and pull ESXi host logs for the affected host. Read-only — no state mutation, safe to run repeatedly and safe to fully automate.',
   '1.0', current_date),
  ('Incidents_scenarios — Virtual disk degraded',
   'virtual_disk_degraded', 'iDRAC', 'monitoring_alert',
   'Pushed alert: iDRAC reports a virtual disk health degraded. Verify status via iDRAC (racadm), confirm SDS node membership via PowerFlex Manager (do not assume), toggle PowerFlex Maintenance Mode if this is an SDS node, reboot the host via iDRAC, then re-validate virtual disk health. If still degraded post-reboot, escalate: open a Dell Technical Support case.',
   '1.0', current_date),
  ('Incidents_scenarios — NIC replacement',
   'nic_replacement', 'iDRAC', 'monitoring_alert',
   'Pushed alert: a NIC port is down. Verify port status via iDRAC, attempt a port flap as the only available software remedy. If the issue persists (expected for a hardware fault), no further software remedy exists: open a vendor support case (SR), upload TSR/diagnostic logs, and track a work order (WO) and change record through to physical replacement. The correct outcome is escalation, not a retry loop.',
   '1.0', current_date),
  ('Incidents_scenarios — CPU usage',
   'cpu_usage_alert', 'vCenter', 'monitoring_alert',
   'Pushed alert: host CPU usage alert. Confirm current CPU utilization percentage against the configured threshold via vCenter. If below threshold, close as a false positive / transient blip. If sustained above threshold (extension, not from source document): identify the top consumer process and propose vMotion (guided, low risk) or, if that does not help, a host restart (guided, higher risk).',
   '1.0', current_date)
on conflict (use_case) do update set
  title = excluded.title,
  full_text = excluded.full_text,
  last_reviewed = excluded.last_reviewed;

-- Steps: cert_renewal
insert into runbook_steps (runbook_id, step_number, title, command, expected_output, risk_tier)
select r.id, s.step_number, s.title, s.command, s.expected_output, s.risk_tier::text
from runbooks r
join (values
  (1, 'Inspect current keystore', 'keytool -list -v -keystore /avamar/keystore', 'DC cert entry with expiry date', 'read_only'),
  (2, 'Confirm DC reachability and live cert', 'openssl s_client -connect dc.corp:636 -showcerts', 'Certificate chain, notAfter date', 'read_only'),
  (3, 'Back up keystore before change', 'cp /avamar/keystore /avamar/keystore.bak', 'Backup file created', 'write'),
  (4, 'Delete stale DC cert entry', 'keytool -delete -alias dc-cert -keystore /avamar/keystore', 'Alias removed', 'write_downtime'),
  (5, 'Import renewed cert', 'keytool -importcert -alias dc-cert -file dc-renewed.crt -keystore /avamar/keystore', 'Certificate imported', 'write_downtime'),
  (6, 'Restart MCS', 'dpnctl stop mcs && dpnctl start mcs', 'mcs_status: running', 'write_downtime')
) as s(step_number, title, command, expected_output, risk_tier)
on r.use_case = 'cert_renewal';

-- Steps: log_collection
insert into runbook_steps (runbook_id, step_number, title, command, expected_output, risk_tier)
select r.id, s.step_number, s.title, s.command, s.expected_output, s.risk_tier::text
from runbooks r
join (values
  (1, 'Trigger ACM dashboard log bundle', 'acm-cli collect-logs --component all', 'Bundle ID returned', 'read_only'),
  (2, 'Export ESXi host logs', 'vm-support -w /tmp/esxi-logs', 'Log archive generated', 'read_only'),
  (3, 'Upload bundle to case', 'upload-bundle --case <ticket_id>', 'Upload confirmed', 'read_only')
) as s(step_number, title, command, expected_output, risk_tier)
on r.use_case = 'log_collection';

-- Steps: virtual_disk_degraded
insert into runbook_steps (runbook_id, step_number, title, command, expected_output, risk_tier)
select r.id, s.step_number, s.title, s.command, s.expected_output, s.risk_tier::text
from runbooks r
join (values
  (1, 'Check virtual disk status', 'racadm storage get vdisks -o -p Status', 'status: Degraded', 'read_only'),
  (2, 'Check SDS node membership', 'powerflex-cli sds status --host <host>', 'is_sds_node: true|false', 'read_only'),
  (3, 'Enable PowerFlex Maintenance Mode (if SDS)', 'powerflex-cli maintenance-mode enable --host <host>', 'maintenance_mode: true', 'write'),
  (4, 'Reboot host via iDRAC', 'racadm serveraction hardreset', 'host_status: online', 'write_reboot'),
  (5, 'Re-validate virtual disk health', 'racadm storage get vdisks -o -p Status', 'status: Optimal', 'read_only'),
  (6, 'Disable Maintenance Mode / escalate if still degraded', 'powerflex-cli maintenance-mode disable --host <host>', 'maintenance_mode: false OR Dell case opened', 'write')
) as s(step_number, title, command, expected_output, risk_tier)
on r.use_case = 'virtual_disk_degraded';

-- Steps: nic_replacement
insert into runbook_steps (runbook_id, step_number, title, command, expected_output, risk_tier)
select r.id, s.step_number, s.title, s.command, s.expected_output, s.risk_tier::text
from runbooks r
join (values
  (1, 'Check NIC port status', 'racadm getniccfg -p 2', 'link status: down', 'read_only'),
  (2, 'Attempt port flap', 'racadm nic reset -p 2', 'link status: down (unresolved) or up (resolved)', 'diagnostic_only'),
  (3, 'Open vendor SR and upload TSR logs', 'dell-support-cli open-case --component nic', 'sr_number returned', 'diagnostic_only'),
  (4, 'Track WO / Change through to physical replacement', 'manual admin update', 'wo_number, change_ref populated', 'diagnostic_only')
) as s(step_number, title, command, expected_output, risk_tier)
on r.use_case = 'nic_replacement';

-- Steps: cpu_usage_alert
insert into runbook_steps (runbook_id, step_number, title, command, expected_output, risk_tier)
select r.id, s.step_number, s.title, s.command, s.expected_output, s.risk_tier::text
from runbooks r
join (values
  (1, 'Confirm current CPU% against threshold', 'vcenter-cli host cpu-usage --host <host>', 'cpu_usage_pct vs cpu_threshold_pct', 'read_only'),
  (2, 'Identify top consumer (if sustained above threshold)', 'vcenter-cli host top-processes --host <host>', 'top process list', 'read_only'),
  (3, 'Propose vMotion migration (extension)', 'vcenter-cli vmotion --host <host> --target <candidate>', 'migration proposed', 'write'),
  (4, 'Propose host restart (extension, higher risk)', 'racadm serveraction hardreset', 'host_status: online', 'write_reboot')
) as s(step_number, title, command, expected_output, risk_tier)
on r.use_case = 'cpu_usage_alert';

-- Initial mock_device_state rows (§9a)
insert into mock_device_state (device_id, product, state) values
  ('uswilbu1.corp.riotinto.org', 'Avamar', '{"cert_expiry": "2024-06-29", "cert_serial": "3f9a1c", "mcs_status": "stopped", "dc_reachable": true}'),
  ('node12', 'iDRAC', '{"virtual_disk_health": "degraded", "disk_id": "Disk.Virtual.0:BOSS.SL.12-1", "host_status": "online"}'),
  ('node12', 'PowerFlex', '{"is_sds_node": true, "maintenance_mode": false}'),
  ('ash-flex1-tor35', 'iDRAC', '{"nic_ports": {"slot2_port2": "down"}, "flap_attempted": false, "sr_number": null, "wo_number": null}'),
  ('esxi20.shared.trintech.host', 'vCenter', '{"cpu_usage_pct": 92, "cpu_threshold_pct": 85, "cpu_trend": [78, 85, 90, 92], "host_status": "online"}')
on conflict (device_id, product) do update set state = excluded.state;
