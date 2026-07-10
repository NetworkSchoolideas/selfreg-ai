alter table public.sessions
  add column if not exists student_archived_at timestamptz;

alter table public.sessions
  drop constraint if exists sessions_status_check;

alter table public.sessions
  add constraint sessions_status_check
  check (status in ('draft', 'in_progress', 'completed', 'abandoned'));

create index if not exists idx_sessions_student_archived_at
  on public.sessions(student_archived_at);
