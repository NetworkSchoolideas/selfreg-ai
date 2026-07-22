-- Retention policy for incomplete learner sessions:
-- - mark abandoned after 30 days without activity;
-- - physically delete only 60 days after that boundary (90 days total).
-- Completed sessions are never candidates.

alter table public.sessions
  add column if not exists abandoned_at timestamptz;

create index if not exists idx_sessions_abandoned_cleanup
  on public.sessions(abandoned_at)
  where status = 'abandoned';

create or replace function public.clear_session_abandoned_at_on_resume()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'abandoned' and new.status in ('draft', 'in_progress') then
    new.abandoned_at = null;
  end if;

  return new;
end;
$$;

revoke all on function public.clear_session_abandoned_at_on_resume() from public, anon, authenticated;

drop trigger if exists clear_session_abandoned_at_on_resume on public.sessions;

create trigger clear_session_abandoned_at_on_resume
  before update on public.sessions
  for each row
  execute function public.clear_session_abandoned_at_on_resume();

select cron.schedule(
  'selfreg-mark-stale-incomplete-sessions',
  '17 3 * * *',
  $$
    update public.sessions
    set
      status = 'abandoned',
      abandoned_at = coalesce(abandoned_at, updated_at + interval '30 days')
    where status in ('draft', 'in_progress', 'abandoned')
      and completed_at is null
      and nullif(trim(final_note), '') is null
      and updated_at <= now() - interval '30 days'
  $$
);

select cron.schedule(
  'selfreg-purge-expired-incomplete-sessions',
  '31 3 * * *',
  $$
    delete from public.sessions
    where status = 'abandoned'
      and abandoned_at <= now() - interval '60 days'
      and completed_at is null
      and nullif(trim(final_note), '') is null
  $$
);
