-- The CPU-usage runbook's extension steps (vMotion / host restart) are documented
-- as an optional, clearly-labeled extension (§9e) that the POC executor does not
-- actually perform — but their write/write_reboot risk tiers were pulling the
-- planner's risk-tier ceiling to "write_reboot" even for the base (below-threshold)
-- case, forcing every CPU alert into guided mode. Drop them so the risk tier
-- reflects what's actually implemented (read-only base check).
delete from runbook_steps
where runbook_id = (select id from runbooks where use_case = 'cpu_usage_alert')
  and step_number in (3, 4);
