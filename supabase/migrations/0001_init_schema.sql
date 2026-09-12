-- OpsPilot AI POC — initial schema
-- Tables: profiles, tickets, agent_runs, execution_events, feedback,
--         runbooks, runbook_steps, vendor_cases, mock_device_state

create extension if not exists pgcrypto;

-- ── Roles ──────────────────────────────────────────────────────────────────
create table profiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    full_name   text not null,
    role        text not null check (role in ('l1', 'admin')),
    created_at  timestamptz not null default now()
);

-- ── Knowledge base ───────────────────────────────────────────────────────
create table runbooks (
    id              uuid primary key default gen_random_uuid(),
    title           text not null,
    use_case        text not null unique check (use_case in (
        'cert_renewal', 'log_collection', 'virtual_disk_degraded',
        'nic_replacement', 'cpu_usage_alert'
    )),
    product         text not null,
    trigger_type    text not null check (trigger_type in ('ticket', 'monitoring_alert')),
    full_text       text not null,
    version         text,
    last_reviewed   date,
    created_at      timestamptz not null default now()
);

create table runbook_steps (
    id              uuid primary key default gen_random_uuid(),
    runbook_id      uuid not null references runbooks(id) on delete cascade,
    step_number     int not null,
    title           text not null,
    command         text,
    expected_output text,
    risk_tier       text not null check (risk_tier in (
        'read_only', 'write', 'write_downtime', 'write_reboot', 'diagnostic_only'
    )),
    unique (runbook_id, step_number)
);

-- ── Tickets / alerts ─────────────────────────────────────────────────────
create table tickets (
    id                  uuid primary key default gen_random_uuid(),
    source              text not null check (source in ('servicenow', 'jira', 'email', 'monitoring')),
    external_id         text,                 -- ticket_id or alert_id from the mock generator
    short_description   text,
    long_description    text,
    raw_alert           text,                 -- raw unstructured alert string, monitoring only
    requester           text,
    priority            text,
    ci                  text,                 -- configuration item / host
    product             text,
    use_case            text,                 -- filled in once triaged
    confidence_score    numeric,
    confidence_band     text check (confidence_band in ('high', 'medium', 'low')),
    risk_tier           text check (risk_tier in (
        'read_only', 'write', 'write_downtime', 'write_reboot', 'diagnostic_only'
    )),
    mode                text check (mode in ('auto', 'guided', 'escalated')),
    status              text not null default 'new' check (status in (
        'new', 'triaging', 'needs_approval', 'needs_input', 'in_progress',
        'auto_resolved', 'resolved', 'escalated'
    )),
    assigned_to         uuid references profiles(id),
    inject_failure      text,                 -- e.g. 'dc_unreachable', 'virtual_disk_stays_degraded'
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- ── Agent execution log ─────────────────────────────────────────────────
create table agent_runs (
    id              uuid primary key default gen_random_uuid(),
    ticket_id       uuid not null references tickets(id) on delete cascade,
    agent           text not null check (agent in ('triage', 'retrieval', 'planner', 'executor', 'orchestrator')),
    input           jsonb,
    output          jsonb,
    runbook_id      uuid references runbooks(id),
    created_at      timestamptz not null default now()
);

create table execution_events (
    id              uuid primary key default gen_random_uuid(),
    ticket_id       uuid not null references tickets(id) on delete cascade,
    source          text not null,   -- AGENT | EXECUTOR | IDRAC | POWERFLEX | VCENTER | AVAMAR
    direction       text check (direction in ('out', 'in', 'info')),
    message         text not null,
    payload         jsonb,
    created_at      timestamptz not null default now()
);

create table feedback (
    id              uuid primary key default gen_random_uuid(),
    ticket_id       uuid not null references tickets(id) on delete cascade,
    flagged_by      uuid not null references profiles(id),
    reason          text not null,
    reviewed        boolean not null default false,
    created_at      timestamptz not null default now()
);

-- ── Vendor case tracking (NIC replacement, §5/§9e) ─────────────────────
create table vendor_cases (
    id              uuid primary key default gen_random_uuid(),
    ticket_id       uuid not null references tickets(id) on delete cascade,
    sr_number       text,
    wo_number       text,
    change_ref      text,
    status          text not null default 'opened' check (status in (
        'opened', 'logs_uploaded', 'parts_dispatched', 'change_created', 'closed'
    )),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- ── Mock stateful infra (§9a) ────────────────────────────────────────────
create table mock_device_state (
    id              uuid primary key default gen_random_uuid(),
    device_id       text not null,
    product         text not null check (product in ('Avamar', 'IDPA', 'iDRAC', 'PowerFlex', 'vCenter')),
    state           jsonb not null,
    updated_at      timestamptz not null default now(),
    unique (device_id, product)
);

-- ── updated_at triggers ──────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_tickets_updated_at before update on tickets
  for each row execute function set_updated_at();

create trigger trg_vendor_cases_updated_at before update on vendor_cases
  for each row execute function set_updated_at();

create trigger trg_mock_device_state_updated_at before update on mock_device_state
  for each row execute function set_updated_at();

-- ── Realtime ──────────────────────────────────────────────────────────────
alter publication supabase_realtime add table execution_events;
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table mock_device_state;
