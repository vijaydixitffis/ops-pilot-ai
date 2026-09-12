-- RLS policies keyed on profiles.role (§4/§7)

alter table profiles enable row level security;
alter table tickets enable row level security;
alter table agent_runs enable row level security;
alter table execution_events enable row level security;
alter table feedback enable row level security;
alter table runbooks enable row level security;
alter table runbook_steps enable row level security;
alter table vendor_cases enable row level security;
alter table mock_device_state enable row level security;

create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- profiles: a user can read their own row; admins read all
create policy "profiles: self or admin read" on profiles for select
  using (id = auth.uid() or is_admin());

-- runbooks / runbook_steps: readable by any authenticated user (l1 or admin)
create policy "runbooks: authenticated read" on runbooks for select
  using (auth.role() = 'authenticated');

create policy "runbook_steps: authenticated read" on runbook_steps for select
  using (auth.role() = 'authenticated');

-- tickets: mock generator inserts (anon or authenticated), l1 sees own/assigned, admin sees all
create policy "tickets: anyone can insert (mock generator)" on tickets for insert
  with check (true);

create policy "tickets: l1 sees assigned, admin sees all" on tickets for select
  using (assigned_to = auth.uid() or is_admin());

create policy "tickets: l1 updates own, admin updates all" on tickets for update
  using (assigned_to = auth.uid() or is_admin());

-- agent_runs / execution_events: visible if the parent ticket is visible
create policy "agent_runs: visible via ticket" on agent_runs for select
  using (
    exists (
      select 1 from tickets t
      where t.id = agent_runs.ticket_id
        and (t.assigned_to = auth.uid() or is_admin())
    )
  );

create policy "agent_runs: service inserts" on agent_runs for insert
  with check (true);

create policy "execution_events: visible via ticket" on execution_events for select
  using (
    exists (
      select 1 from tickets t
      where t.id = execution_events.ticket_id
        and (t.assigned_to = auth.uid() or is_admin())
    )
  );

create policy "execution_events: service inserts" on execution_events for insert
  with check (true);

-- feedback: l1 inserts their own flags; l1 sees own, admin sees all
create policy "feedback: l1 inserts own" on feedback for insert
  with check (flagged_by = auth.uid());

create policy "feedback: own or admin read" on feedback for select
  using (flagged_by = auth.uid() or is_admin());

create policy "feedback: admin updates (mark reviewed)" on feedback for update
  using (is_admin());

-- vendor_cases: visible via parent ticket, same as agent_runs
create policy "vendor_cases: visible via ticket" on vendor_cases for select
  using (
    exists (
      select 1 from tickets t
      where t.id = vendor_cases.ticket_id
        and (t.assigned_to = auth.uid() or is_admin())
    )
  );

create policy "vendor_cases: service writes" on vendor_cases for insert
  with check (true);

create policy "vendor_cases: service updates" on vendor_cases for update
  using (true);

-- mock_device_state: authenticated read (device-state panel needs it for any assigned ticket);
-- writes only via service-role (Edge Functions), no policy needed for anon/authenticated writes
create policy "mock_device_state: authenticated read" on mock_device_state for select
  using (auth.role() = 'authenticated');
