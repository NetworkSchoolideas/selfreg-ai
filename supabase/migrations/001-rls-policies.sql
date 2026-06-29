-- Current SelfReg AI schema:
-- profiles / children / sessions / session_records
-- Teacher role lives in profiles.role
-- Teacher code lives in profiles.metadata->>'teacher_code'

alter table if exists public.profiles enable row level security;
alter table if exists public.children enable row level security;
alter table if exists public.sessions enable row level security;
alter table if exists public.session_records enable row level security;

create or replace function public.is_teacher(current_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = current_user_id
      and role = 'teacher'
  );
$$;

create or replace function public.can_access_child(target_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.children child
    where child.id = target_child_id
      and (
        child.teacher_id = auth.uid()
        or child.user_id = auth.uid()
        or child.id = auth.uid()
      )
  );
$$;

create or replace function public.can_access_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sessions session
    join public.children child on child.id = session.child_id
    where session.id = target_session_id
      and (
        child.teacher_id = auth.uid()
        or child.user_id = auth.uid()
        or child.id = auth.uid()
      )
  );
$$;

drop policy if exists "Profiles: read own" on public.profiles;
drop policy if exists "Profiles: insert own" on public.profiles;
drop policy if exists "Profiles: update own" on public.profiles;

create policy "Profiles: read own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Profiles: insert own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Profiles: update own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Children: read own" on public.children;
drop policy if exists "Children: update own" on public.children;
drop policy if exists "Children: teacher read" on public.children;
drop policy if exists "Children: teacher insert" on public.children;
drop policy if exists "Children: teacher update" on public.children;
drop policy if exists "Children: teacher delete" on public.children;

create policy "Children: read own"
  on public.children
  for select
  using (user_id = auth.uid() or id = auth.uid());

create policy "Children: update own"
  on public.children
  for update
  using (user_id = auth.uid() or id = auth.uid())
  with check (user_id = auth.uid() or id = auth.uid());

create policy "Children: teacher read"
  on public.children
  for select
  using (teacher_id = auth.uid());

create policy "Children: teacher insert"
  on public.children
  for insert
  with check (teacher_id = auth.uid());

create policy "Children: teacher update"
  on public.children
  for update
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "Children: teacher delete"
  on public.children
  for delete
  using (teacher_id = auth.uid());

drop policy if exists "Sessions: read own" on public.sessions;
drop policy if exists "Sessions: insert own" on public.sessions;
drop policy if exists "Sessions: update own" on public.sessions;
drop policy if exists "Sessions: delete own" on public.sessions;
drop policy if exists "Sessions: teacher read" on public.sessions;
drop policy if exists "Sessions: teacher insert" on public.sessions;
drop policy if exists "Sessions: teacher update" on public.sessions;
drop policy if exists "Sessions: teacher delete" on public.sessions;

create policy "Sessions: read own"
  on public.sessions
  for select
  using (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and (child.user_id = auth.uid() or child.id = auth.uid())
    )
  );

create policy "Sessions: insert own"
  on public.sessions
  for insert
  with check (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and (child.user_id = auth.uid() or child.id = auth.uid())
    )
  );

create policy "Sessions: update own"
  on public.sessions
  for update
  using (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and (child.user_id = auth.uid() or child.id = auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and (child.user_id = auth.uid() or child.id = auth.uid())
    )
  );

create policy "Sessions: delete own"
  on public.sessions
  for delete
  using (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and (child.user_id = auth.uid() or child.id = auth.uid())
    )
  );

create policy "Sessions: teacher read"
  on public.sessions
  for select
  using (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and child.teacher_id = auth.uid()
    )
  );

create policy "Sessions: teacher insert"
  on public.sessions
  for insert
  with check (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and child.teacher_id = auth.uid()
    )
  );

create policy "Sessions: teacher update"
  on public.sessions
  for update
  using (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and child.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and child.teacher_id = auth.uid()
    )
  );

create policy "Sessions: teacher delete"
  on public.sessions
  for delete
  using (
    exists (
      select 1
      from public.children child
      where child.id = sessions.child_id
        and child.teacher_id = auth.uid()
    )
  );

drop policy if exists "Session records: read own" on public.session_records;
drop policy if exists "Session records: insert own" on public.session_records;
drop policy if exists "Session records: update own" on public.session_records;
drop policy if exists "Session records: delete own" on public.session_records;
drop policy if exists "Session records: teacher read" on public.session_records;
drop policy if exists "Session records: teacher insert" on public.session_records;
drop policy if exists "Session records: teacher update" on public.session_records;
drop policy if exists "Session records: teacher delete" on public.session_records;

create policy "Session records: read own"
  on public.session_records
  for select
  using (public.can_access_session(session_id));

create policy "Session records: insert own"
  on public.session_records
  for insert
  with check (public.can_access_session(session_id));

create policy "Session records: update own"
  on public.session_records
  for update
  using (public.can_access_session(session_id))
  with check (public.can_access_session(session_id));

create policy "Session records: delete own"
  on public.session_records
  for delete
  using (public.can_access_session(session_id));

create policy "Session records: teacher read"
  on public.session_records
  for select
  using (
    exists (
      select 1
      from public.sessions session
      join public.children child on child.id = session.child_id
      where session.id = session_records.session_id
        and child.teacher_id = auth.uid()
    )
  );

create policy "Session records: teacher insert"
  on public.session_records
  for insert
  with check (
    exists (
      select 1
      from public.sessions session
      join public.children child on child.id = session.child_id
      where session.id = session_records.session_id
        and child.teacher_id = auth.uid()
    )
  );

create policy "Session records: teacher update"
  on public.session_records
  for update
  using (
    exists (
      select 1
      from public.sessions session
      join public.children child on child.id = session.child_id
      where session.id = session_records.session_id
        and child.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.sessions session
      join public.children child on child.id = session.child_id
      where session.id = session_records.session_id
        and child.teacher_id = auth.uid()
    )
  );

create policy "Session records: teacher delete"
  on public.session_records
  for delete
  using (
    exists (
      select 1
      from public.sessions session
      join public.children child on child.id = session.child_id
      where session.id = session_records.session_id
        and child.teacher_id = auth.uid()
    )
  );
