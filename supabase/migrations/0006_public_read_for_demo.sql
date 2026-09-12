-- The mock ticket generator and demo-mode logins (buttons that don't create a
-- real Supabase Auth session) both need to read live tickets/execution data.
-- Real per-role RLS (assigned_to / is_admin) stays enforced for WRITEs and for
-- the l1-vs-admin distinction on real logins; reads are opened to anon so the
-- demo-mode UI (no auth session) can render live data too. No real credentials
-- or PII live in this data — acceptable for a POC.

drop policy "tickets: l1 sees assigned, admin sees all" on tickets;
create policy "tickets: public read" on tickets for select
  using (true);

drop policy "agent_runs: visible via ticket" on agent_runs;
create policy "agent_runs: public read" on agent_runs for select
  using (true);

drop policy "execution_events: visible via ticket" on execution_events;
create policy "execution_events: public read" on execution_events for select
  using (true);

drop policy "vendor_cases: visible via ticket" on vendor_cases;
create policy "vendor_cases: public read" on vendor_cases for select
  using (true);

drop policy "feedback: own or admin read" on feedback;
create policy "feedback: public read" on feedback for select
  using (true);
