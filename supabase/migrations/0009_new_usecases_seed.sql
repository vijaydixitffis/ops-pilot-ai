-- New Use Cases addendum — runbook/step/device-state seed (§1b/§1c)

insert into runbooks (title, use_case, product, trigger_type, full_text, version, last_reviewed)
values
  ('Password Reset / Account Lockout', 'password_reset_lockout', 'ActiveDirectory', 'ticket',
   'User cannot log in due to account lockout or password issue. Query AD for lockout status, bad password count, and recent failed logons to rule out a compromised-credential pattern. If confirmed simple lockout with no suspicious pattern: unlock via AD, reset bad password count, optionally issue a temporary password, notify the user, and re-check after 2 minutes. Escalate instead of unlocking if: more than 3 lockouts in 24h, failed logons from an unrecognized IP/workstation, or the account is disabled/expired/offboarding.',
   '1', '2026-09-15'),
  ('Server Disk Space Alert', 'disk_space_alert', 'WindowsServer', 'monitoring_alert',
   'Volume approaching capacity. Query used/free space and threshold, identify largest contributors (temp, logs, update cache), and check growth pattern. Clear temp/cache/update-cache files automatically if safe. Archive/delete logs older than retention policy. Re-check after cleanup; close if below threshold. If still above threshold with no clear single large offender, propose further action (extend volume, restart offending service) and require approval. Escalate immediately without further cleanup if growth is rapid (>5%/hour) or the volume hosts application/database data.',
   '1', '2026-09-15'),
  ('VPN Client Connection Failure', 'vpn_connection_failure', 'VPNGateway', 'ticket',
   'User cannot connect to VPN. Check gateway logs for this user, client certificate expiry/validity, and whether the gateway has an active incident. If gateway outage: skip client-side steps, inform user, close as related. If certificate expired/expiring: propose reissuing and pushing a new certificate (requires approval — disrupts active session). If client version is outdated: propose a client update/reinstall (requires approval). If auth fails but cert/client are fine, cross-check the account lockout use case. Escalate if gateway-side outage affects multiple users, or if the approved fix does not resolve the issue after one attempt.',
   '1', '2026-09-15'),
  ('Mailbox Over Quota', 'mailbox_over_quota', 'ExchangeOnline', 'ticket',
   'Mailbox has exceeded its storage quota. Identify size vs quota and largest contributors. Empty Deleted Items/Junk older than 30 days automatically (low risk). If an archive mailbox is available, propose moving aged items to archive (requires approval). If large attachments are found, propose removing them from messages (requires approval). If still over quota, propose a temporary quota increase (requires approval). Re-check after each action; stop once under quota. Escalate if still over quota after all safe/approved options are exhausted, or if growth pattern suggests a mail loop, spam flood, or compromised account.',
   '1', '2026-09-15'),
  ('Laptop Will Not Power On', 'laptop_no_power', 'EndpointAsset', 'ticket',
   'Laptop will not power on — no lights, no fan, no response. There is no remote or software fix. Check asset records for last-seen date, battery health history, warranty status, and prior related tickets. Package a diagnostic summary and open a hardware support case with the OEM (in warranty) or internal deskside support (out of warranty). Flag for loaner dispatch if needed. Track the case through to physical resolution; do not close until the user confirms the device is functional again.',
   '1', '2026-09-15'),
  ('Network Port Down at Desk', 'network_port_down', 'NetworkSwitch', 'monitoring_alert',
   'No network connectivity at a desk, or a monitoring alert flags a switch port down. Query port status and error counters, then attempt a remote port flap (disable/re-enable) once. If the port comes back up and stays up: confirm resolved, notify user, close. If the port stays down after the flap, or multiple ports on the same switch are affected: there is no further remote fix — package diagnostics and open a facilities/network cabling ticket, tracking through to physical resolution.',
   '1', '2026-09-15')
on conflict (use_case) do update set
  title = excluded.title,
  full_text = excluded.full_text,
  last_reviewed = excluded.last_reviewed;

-- Steps: password_reset_lockout
insert into runbook_steps (runbook_id, step_number, title, command, expected_output, risk_tier)
select r.id, s.step_number, s.title, s.command, s.expected_output, s.risk_tier::text
from runbooks r
join (values
  (1, 'Check lockout status and recent failed logons', 'ad-cli account-status --user <username>', 'locked_out, bad_pwd_count, recent_failed_logons', 'read_only'),
  (2, 'Unlock account and reset bad password count', 'ad-cli account-unlock --user <username>', 'locked_out: false, bad_pwd_count: 0', 'write'),
  (3, 'Notify user of unlock', 'ad-cli notify --user <username> --template unlocked', 'notification sent', 'read_only'),
  (4, 'Re-check status after 2 minutes', 'ad-cli account-status --user <username>', 'locked_out: false (confirmed)', 'read_only')
) as s(step_number, title, command, expected_output, risk_tier)
on r.use_case = 'password_reset_lockout';

-- Steps: disk_space_alert
insert into runbook_steps (runbook_id, step_number, title, command, expected_output, risk_tier)
select r.id, s.step_number, s.title, s.command, s.expected_output, s.risk_tier::text
from runbooks r
join (values
  (1, 'Check volume usage and contributors', 'diskmon-cli usage --server <server> --volume <volume>', 'used_pct, temp_size_gb, old_logs_size_gb, growth_pattern', 'read_only'),
  (2, 'Clear temp/cache/update-cache files', 'diskmon-cli cleanup --server <server> --volume <volume>', 'space reclaimed', 'write'),
  (3, 'Re-check usage; propose further action if still above threshold', 'diskmon-cli usage --server <server> --volume <volume>', 'used_pct vs threshold_pct', 'write')
) as s(step_number, title, command, expected_output, risk_tier)
on r.use_case = 'disk_space_alert';

-- Steps: vpn_connection_failure
insert into runbook_steps (runbook_id, step_number, title, command, expected_output, risk_tier)
select r.id, s.step_number, s.title, s.command, s.expected_output, s.risk_tier::text
from runbooks r
join (values
  (1, 'Check gateway status and this user''s last auth result', 'vpn-cli gateway-status --user <username>', 'gateway_status, last_auth_result', 'read_only'),
  (2, 'Check client certificate expiry', 'vpn-cli cert-status --user <username>', 'cert_expiry, client_version', 'read_only'),
  (3, 'Reissue and push new client certificate', 'vpn-cli cert-reissue --user <username>', 'new cert pushed', 'write_disruptive'),
  (4, 'Push client update/reinstall', 'vpn-cli client-update --user <username>', 'client updated', 'write_disruptive')
) as s(step_number, title, command, expected_output, risk_tier)
on r.use_case = 'vpn_connection_failure';

-- Steps: mailbox_over_quota
insert into runbook_steps (runbook_id, step_number, title, command, expected_output, risk_tier)
select r.id, s.step_number, s.title, s.command, s.expected_output, s.risk_tier::text
from runbooks r
join (values
  (1, 'Check mailbox size, quota, and contributors', 'exo-cli mailbox-usage --mailbox <mailbox>', 'size_gb, quota_gb, deleted_items_gb, large_attachments', 'read_only'),
  (2, 'Empty Deleted Items/Junk older than 30 days', 'exo-cli purge-deleted --mailbox <mailbox> --older-than 30d', 'deleted_items_gb reclaimed', 'write'),
  (3, 'Move aged items to archive', 'exo-cli archive-move --mailbox <mailbox>', 'items archived', 'write_disruptive'),
  (4, 'Request temporary quota increase', 'exo-cli quota-increase --mailbox <mailbox>', 'quota_gb increased', 'write_disruptive')
) as s(step_number, title, command, expected_output, risk_tier)
on r.use_case = 'mailbox_over_quota';

-- Steps: laptop_no_power
insert into runbook_steps (runbook_id, step_number, title, command, expected_output, risk_tier)
select r.id, s.step_number, s.title, s.command, s.expected_output, s.risk_tier::text
from runbooks r
join (values
  (1, 'Check asset records', 'asset-cli status --tag <asset_tag>', 'last_seen, battery_health_pct, warranty_status, related_tickets_90d', 'read_only'),
  (2, 'Open hardware support case (OEM or deskside)', 'asset-cli open-case --tag <asset_tag>', 'case reference returned', 'diagnostic_only'),
  (3, 'Track case through to physical resolution', 'manual admin update', 'status progression tracked', 'diagnostic_only')
) as s(step_number, title, command, expected_output, risk_tier)
on r.use_case = 'laptop_no_power';

-- Steps: network_port_down
insert into runbook_steps (runbook_id, step_number, title, command, expected_output, risk_tier)
select r.id, s.step_number, s.title, s.command, s.expected_output, s.risk_tier::text
from runbooks r
join (values
  (1, 'Check port status and error counters', 'switch-cli port-status --switch <switch> --port <port>', 'port_status, error_counters', 'read_only'),
  (2, 'Attempt remote port flap', 'switch-cli port-flap --switch <switch> --port <port>', 'port_status after flap', 'diagnostic_only'),
  (3, 'Open facilities/network cabling case if still down', 'switch-cli open-case --switch <switch> --port <port>', 'case reference returned', 'diagnostic_only')
) as s(step_number, title, command, expected_output, risk_tier)
on r.use_case = 'network_port_down';

-- Initial mock_device_state rows (§1c) — canonical demo devices for each use case
insert into mock_device_state (device_id, product, state) values
  ('jsmith', 'ActiveDirectory', '{"locked_out": true, "bad_pwd_count": 5, "lockout_time": "2026-09-15T09:40:00Z", "recent_failed_logons": [{"source_ip": "10.2.4.18", "workstation": "CORP-LAP-118", "ts": "2026-09-15T09:38:00Z"}], "account_status": "enabled", "lockout_count_24h": 1}'),
  ('APPSRV02:C', 'WindowsServer', '{"used_pct": 91, "threshold_pct": 90, "temp_size_gb": 3.2, "old_logs_size_gb": 1.1, "growth_pattern": "steady", "volume_type": "os"}'),
  ('kwilliams', 'VPNGateway', '{"gateway_status": "healthy", "cert_expiry": "2026-09-20", "client_version": "5.2.1", "min_required_version": "5.4.0", "last_auth_result": "cert_reject"}'),
  ('kwilliams@corp.example.com', 'ExchangeOnline', '{"size_gb": 51, "quota_gb": 50, "deleted_items_gb": 6, "archive_available": true, "large_attachments": [{"message_id": "msg-1", "size_mb": 28}], "growth_pattern": "normal"}'),
  ('AST-40221', 'EndpointAsset', '{"last_seen": "2026-09-13T18:02:00Z", "battery_health_pct": null, "warranty_status": "in_warranty", "related_tickets_90d": 1}'),
  ('SW-FLR4-02:Gi1/0/24', 'NetworkSwitch', '{"port_status": "down", "flap_attempted": false, "error_counters": {"crc": 142}, "last_up": "2026-09-14T07:10:00Z", "affected_ports_same_switch": 1}')
on conflict (device_id, product) do update set state = excluded.state;
