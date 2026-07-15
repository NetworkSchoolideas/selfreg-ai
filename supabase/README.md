# Supabase RLS and access model

## Tables

The release schema contains:

- `profiles`
- `children`
- `sessions`
- `session_records`

The legacy `teachers` table is not part of the release model. Teacher role and code live in `profiles`.

## Direct database access

RLS is enabled on all four public tables.

- A user may read their own profile and insert their own profile during bootstrap.
- A student may read the child row linked by `children.user_id` and its sessions/records.
- A teacher may read a child linked by `children.teacher_id = auth.uid()::text` and its sessions/records.
- Direct authenticated writes to children, sessions, and records are not granted by policy.

The application performs writes through server routes. Those routes authenticate the user and prove child ownership before using the server-only service-role client. Linked teachers remain read-only.

`service_role` intentionally bypasses RLS, so possession of a child ID is never treated as authorization in route code.

## Migrations

The source of truth is the ordered set in `supabase/migrations/`:

1. profile/schema alignment;
2. session metadata and record fields;
3. release RLS policies;
4. session visibility/status fields;
5. read-only teacher RLS enforcement.

Apply migrations with the Supabase CLI or reviewed SQL editor workflow. Local and remote migration versions must match before release.

## Verification

After applying migrations, verify:

- all four tables have RLS enabled;
- the only children/sessions/records policies are authorised reads;
- profiles have own-read and own-insert policies;
- every session has a child and every record has a session;
- fresh completed sessions contain stages 1 through 5;
- Security Advisor has no unexpected findings.

Do not repair or delete production data during a release audit without a separate reviewed data-cleanup task.
