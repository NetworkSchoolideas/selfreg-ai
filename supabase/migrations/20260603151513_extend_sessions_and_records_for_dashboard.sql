alter table public.sessions
  add column if not exists lang text,
  add column if not exists history_insight text,
  add column if not exists adolescent_feedback jsonb default null;

alter table public.session_records
  add column if not exists question text,
  add column if not exists answer text;
