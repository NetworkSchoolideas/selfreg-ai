-- Authenticated product writes are routed through the guarded Next.js API
-- handlers, which verify the current user and ownership before using the
-- service-role client. Keep direct PostgREST access read-only so a linked
-- teacher cannot mutate a student's profile, child, sessions, or records.

drop policy if exists "Profiles: update own" on public.profiles;

drop policy if exists "Children: insert authorized" on public.children;
drop policy if exists "Children: update authorized" on public.children;
drop policy if exists "Children: delete authorized" on public.children;

drop policy if exists "Sessions: insert authorized" on public.sessions;
drop policy if exists "Sessions: update authorized" on public.sessions;
drop policy if exists "Sessions: delete authorized" on public.sessions;

drop policy if exists "Session records: insert authorized" on public.session_records;
drop policy if exists "Session records: update authorized" on public.session_records;
drop policy if exists "Session records: delete authorized" on public.session_records;
