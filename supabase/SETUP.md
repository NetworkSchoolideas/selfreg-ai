# Supabase Setup for SelfReg AI

This project no longer uses a dedicated `teachers` table as the primary auth model.

Current source of truth:

- `profiles` - auth-linked user profile with role and metadata
- `children` - student/participant records linked to a teacher and optionally to an auth user
- `sessions` - saved self-regulation sessions
- `session_records` - per-stage records inside each session

Teacher code is stored in:

- `profiles.metadata.teacher_code`

Teacher school or organization can also be stored in:

- `profiles.metadata.school`

## 1. Create a Supabase project

1. Create a new project in [Supabase](https://supabase.com).
2. Save the project URL, anon key, and service role key.
3. Enable Email auth.
4. Configure OAuth providers only if you need them.

## 2. Create the current schema

Run this SQL in the Supabase SQL editor.

```sql
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null check (role in ('teacher', 'student')),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class text not null default '',
  user_id uuid references auth.users(id) on delete set null,
  teacher_id uuid references public.profiles(id) on delete set null,
  consent_given boolean default false,
  consent_timestamp timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  context text not null,
  final_note text,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  lang text check (lang in ('ru', 'en')),
  history_insight text,
  adolescent_feedback jsonb
);

create table if not exists public.session_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  stage_id integer not null,
  stage_title text not null,
  scenario text not null,
  event_type text check (event_type in ('answer', 'clarify_request', 'back', 'skip')),
  provider text,
  model text,
  response_mode text check (response_mode in ('mock', 'llm-json', 'llm-text', 'llm-fallback')),
  feedback text not null,
  question text,
  answer text,
  created_at timestamptz not null default now()
);
```

## 3. Create indexes

Recommended indexes for the current app:

```sql
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_metadata_gin on public.profiles using gin (metadata);

create index if not exists idx_children_teacher_id on public.children(teacher_id);
create index if not exists idx_children_user_id on public.children(user_id);
create index if not exists idx_children_updated_at on public.children(updated_at desc);

create index if not exists idx_sessions_child_id on public.sessions(child_id);
create index if not exists idx_sessions_updated_at on public.sessions(updated_at desc);
create index if not exists idx_sessions_status on public.sessions(status);

create index if not exists idx_session_records_session_id on public.session_records(session_id);
create index if not exists idx_session_records_created_at on public.session_records(created_at);
```

The GIN index on `profiles.metadata` is important if you expect frequent teacher-code lookup via `metadata @> '{"teacher_code":"..."}'`.

## 4. Apply RLS

Apply:

- [migrations/001-rls-policies.sql](migrations/001-rls-policies.sql)

## 5. Configure auth

### Email auth

Enable Email provider in Supabase Auth.

### Google auth

If using Google login:

1. Enable Google provider in Supabase Auth.
2. Set redirect URL to:
   - `http://localhost:3000/auth/callback` for local
   - `https://your-app-domain/auth/callback` for production

## 6. Configure the app

Set `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_ENABLED=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_PROJECT_LANDING_URL=https://selfreg-ai-networkschool.vercel.app
```

## 7. Verify the setup

Minimum verification flow:

1. Run `npm run check`
2. Run `npm run build`
3. Run `npm run test:e2e`
4. Register a teacher
5. Confirm the teacher gets a code
6. Create or link a child
7. Complete a session
8. Confirm teacher dashboard shows the saved data

## Important notes

- `profiles.role` is required for auth-based redirects.
- `children.teacher_id` is the canonical teacher-child link.
- `children.user_id` is optional and can be used for auth-linked student accounts.
- `session_records` are written separately from `sessions`; both must exist for server analytics and history views.
