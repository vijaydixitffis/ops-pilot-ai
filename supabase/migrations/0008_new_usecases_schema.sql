-- New Use Cases addendum — schema changes (§1a)

-- Widen risk_tier check constraints to accept 'write_disruptive'
alter table runbook_steps drop constraint if exists runbook_steps_risk_tier_check;
alter table runbook_steps add constraint runbook_steps_risk_tier_check
  check (risk_tier in ('read_only', 'write', 'write_downtime', 'write_reboot', 'write_disruptive', 'diagnostic_only'));

alter table tickets drop constraint if exists tickets_risk_tier_check;
alter table tickets add constraint tickets_risk_tier_check
  check (risk_tier in ('read_only', 'write', 'write_downtime', 'write_reboot', 'write_disruptive', 'diagnostic_only'));

-- Widen runbooks.use_case check to include the six new use cases
alter table runbooks drop constraint if exists runbooks_use_case_check;
alter table runbooks add constraint runbooks_use_case_check
  check (use_case in (
    'cert_renewal', 'log_collection', 'virtual_disk_degraded', 'nic_replacement', 'cpu_usage_alert',
    'password_reset_lockout', 'disk_space_alert', 'vpn_connection_failure', 'mailbox_over_quota',
    'laptop_no_power', 'network_port_down'
  ));

-- Widen mock_device_state.product check to include the new product types
alter table mock_device_state drop constraint if exists mock_device_state_product_check;
alter table mock_device_state add constraint mock_device_state_product_check
  check (product in (
    'Avamar', 'IDPA', 'iDRAC', 'PowerFlex', 'vCenter',
    'ActiveDirectory', 'WindowsServer', 'VPNGateway', 'ExchangeOnline', 'EndpointAsset', 'NetworkSwitch'
  ));
