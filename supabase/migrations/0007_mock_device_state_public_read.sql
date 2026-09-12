-- Same rationale as 0006: demo-mode logins have no real Supabase Auth session,
-- so authenticated-only read blocked them from ever seeing device state.
drop policy "mock_device_state: authenticated read" on mock_device_state;
create policy "mock_device_state: public read" on mock_device_state for select
  using (true);

drop policy "runbooks: authenticated read" on runbooks;
create policy "runbooks: public read" on runbooks for select
  using (true);

drop policy "runbook_steps: authenticated read" on runbook_steps;
create policy "runbook_steps: public read" on runbook_steps for select
  using (true);
