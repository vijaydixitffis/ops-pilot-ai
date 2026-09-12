-- Tracks where a guided-mode execution paused, so the orchestrator's
-- approve/reject action knows what to resume (executor-agent, §9c).
alter table tickets add column if not exists pending_action jsonb;
