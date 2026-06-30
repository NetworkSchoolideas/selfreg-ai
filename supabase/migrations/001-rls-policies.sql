-- Current SelfReg AI RLS/security model.
-- Matches the live Supabase project as of the release hardening pass.
--
-- Important schema assumption:
-- children.teacher_id is text. The live project contains historical
-- non-UUID teacher ids, so policies compare it to auth.uid()::text.

alter table if exists public.profiles enable row level security;
alter table if exists public.children enable row level security;
alter table if exists public.sessions enable row level security;
alter table if exists public.session_records enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role, metadata, updated_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    coalesce(
      nullif(new.raw_user_meta_data->>'preferred_role', ''),
      case
        when new.email like '%@school.ru' then 'teacher'
        when new.email like '%@edu.ru' then 'teacher'
        when new.email like '%@teacher.ru' then 'teacher'
        else 'student'
      end
    ),
    coalesce(new.raw_user_meta_data, '{}'::jsonb),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        role = coalesce(public.profiles.role, excluded.role),
        metadata = coalesce(public.profiles.metadata, '{}'::jsonb) || coalesce(excluded.metadata, '{}'::jsonb),
        updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_updated_at() from public, anon, authenticated;

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Teachers can view all profiles" on public.profiles;
drop policy if exists "Profiles: read own" on public.profiles;
drop policy if exists "Profiles: insert own" on public.profiles;
drop policy if exists "Profiles: update own" on public.profiles;

create policy "Profiles: read own"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Profiles: insert own"
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "Profiles: update own"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Users can view their own children" on public.children;
drop policy if exists "Users can create their own children" on public.children;
drop policy if exists "Users can update their own children" on public.children;
drop policy if exists "Users can delete their own children" on public.children;
drop policy if exists "Children: read own" on public.children;
drop policy if exists "Children: update own" on public.children;
drop policy if exists "Children: teacher read" on public.children;
drop policy if exists "Children: teacher insert" on public.children;
drop policy if exists "Children: teacher update" on public.children;
drop policy if exists "Children: teacher delete" on public.children;
drop policy if exists "Children: select authorized" on public.children;
drop policy if exists "Children: insert authorized" on public.children;
drop policy if exists "Children: update authorized" on public.children;
drop policy if exists "Children: delete authorized" on public.children;

create policy "Children: select authorized"
  on public.children
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or teacher_id = ((select auth.uid())::text)
  );

create policy "Children: insert authorized"
  on public.children
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    or teacher_id = ((select auth.uid())::text)
  );

create policy "Children: update authorized"
  on public.children
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or teacher_id = ((select auth.uid())::text)
  )
  with check (
    user_id = (select auth.uid())
    or teacher_id = ((select auth.uid())::text)
  );

create policy "Children: delete authorized"
  on public.children
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or teacher_id = ((select auth.uid())::text)
  );

drop policy if exists "Users can view sessions for their children" on public.sessions;
drop policy if exists "Users can create sessions for their children" on public.sessions;
drop policy if exists "Users can update sessions for their children" on public.sessions;
drop policy if exists "Sessions: read own" on public.sessions;
drop policy if exists "Sessions: insert own" on public.sessions;
drop policy if exists "Sessions: update own" on public.sessions;
drop policy if exists "Sessions: delete own" on public.sessions;
drop policy if exists "Sessions: teacher read" on public.sessions;
drop policy if exists "Sessions: teacher insert" on public.sessions;
drop policy if exists "Sessions: teacher update" on public.sessions;
drop policy if exists "Sessions: teacher delete" on public.sessions;
drop policy if exists "Sessions: select authorized" on public.sessions;
drop policy if exists "Sessions: insert authorized" on public.sessions;
drop policy if exists "Sessions: update authorized" on public.sessions;
drop policy if exists "Sessions: delete authorized" on public.sessions;

create policy "Sessions: select authorized"
  on public.sessions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and (
          child.user_id = (select auth.uid())
          or child.teacher_id = ((select auth.uid())::text)
        )
    )
  );

create policy "Sessions: insert authorized"
  on public.sessions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and (
          child.user_id = (select auth.uid())
          or child.teacher_id = ((select auth.uid())::text)
        )
    )
  );

create policy "Sessions: update authorized"
  on public.sessions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and (
          child.user_id = (select auth.uid())
          or child.teacher_id = ((select auth.uid())::text)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and (
          child.user_id = (select auth.uid())
          or child.teacher_id = ((select auth.uid())::text)
        )
    )
  );

create policy "Sessions: delete authorized"
  on public.sessions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and (
          child.user_id = (select auth.uid())
          or child.teacher_id = ((select auth.uid())::text)
        )
    )
  );

drop policy if exists "Users can view session records for their sessions" on public.session_records;
drop policy if exists "Users can create session records for their sessions" on public.session_records;
drop policy if exists "Session records: read own" on public.session_records;
drop policy if exists "Session records: insert own" on public.session_records;
drop policy if exists "Session records: update own" on public.session_records;
drop policy if exists "Session records: delete own" on public.session_records;
drop policy if exists "Session records: teacher read" on public.session_records;
drop policy if exists "Session records: teacher insert" on public.session_records;
drop policy if exists "Session records: teacher update" on public.session_records;
drop policy if exists "Session records: teacher delete" on public.session_records;
drop policy if exists "Session records: select authorized" on public.session_records;
drop policy if exists "Session records: insert authorized" on public.session_records;
drop policy if exists "Session records: update authorized" on public.session_records;
drop policy if exists "Session records: delete authorized" on public.session_records;

drop function if exists public.is_teacher(uuid);
drop function if exists public.can_access_child(uuid);
drop function if exists public.can_access_session(uuid);

create policy "Session records: select authorized"
  on public.session_records
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.sessions session
      join public.children child on child.id = session.child_id
      where session.id = session_records.session_id
        and (
          child.user_id = (select auth.uid())
          or child.teacher_id = ((select auth.uid())::text)
        )
    )
  );

create policy "Session records: insert authorized"
  on public.session_records
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.sessions session
      join public.children child on child.id = session.child_id
      where session.id = session_records.session_id
        and (
          child.user_id = (select auth.uid())
          or child.teacher_id = ((select auth.uid())::text)
        )
    )
  );

create policy "Session records: update authorized"
  on public.session_records
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.sessions session
      join public.children child on child.id = session.child_id
      where session.id = session_records.session_id
        and (
          child.user_id = (select auth.uid())
          or child.teacher_id = ((select auth.uid())::text)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.sessions session
      join public.children child on child.id = session.child_id
      where session.id = session_records.session_id
        and (
          child.user_id = (select auth.uid())
          or child.teacher_id = ((select auth.uid())::text)
        )
    )
  );

create policy "Session records: delete authorized"
  on public.session_records
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.sessions session
      join public.children child on child.id = session.child_id
      where session.id = session_records.session_id
        and (
          child.user_id = (select auth.uid())
          or child.teacher_id = ((select auth.uid())::text)
        )
    )
  );
