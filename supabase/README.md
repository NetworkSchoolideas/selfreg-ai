# Supabase RLS Notes for SelfReg AI

## Current schema covered by RLS

The current RLS migration targets:

- `profiles`
- `children`
- `sessions`
- `session_records`

It does not target the legacy `teachers` table flow as the primary model anymore.

## Access model

### Profiles

- users can read their own profile
- users can insert their own profile during auth bootstrap
- users can update their own profile

### Children

- teachers can read and manage children linked through `children.teacher_id`
- students can read and update their own child row when linked through `children.user_id`
- legacy direct access by `children.id = auth.uid()` is preserved for backward compatibility

### Sessions

- teachers can access sessions of their linked children
- students can access sessions that belong to their own linked child row

### Session records

- teachers can access records of sessions that belong to their linked children
- students can access records of sessions that belong to their own linked child row

## Why this matters

The app uses a mix of:

- auth-aware client access for `profiles`
- server routes with service-role access for teacher dashboard and session sync
- local fallback storage when Supabase is unavailable

If the schema and RLS do not match the current runtime model, auth and teacher-student linking may appear to work partially while server-backed analytics silently fail.

## Applying the policies

Use either:

```bash
supabase db push
```

or paste the SQL from:

- [migrations/001-rls-policies.sql](migrations/001-rls-policies.sql)

into the Supabase SQL editor.
