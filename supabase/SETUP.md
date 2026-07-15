# Supabase setup

## 1. Project and Auth

Create a Supabase project and enable Email authentication.

Configure:

- minimum password length: `8` or more;
- Site URL: the production app origin;
- Redirect URLs: `/auth/callback` for production and approved local development origins;
- email confirmation according to the release policy.

Google OAuth is optional and remains hidden in SelfReg AI unless both release flags are enabled.

## 2. Environment

Set local values in `.env.local` and production values in Vercel:

```env
NEXT_PUBLIC_SUPABASE_ENABLED=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-key
APP_BASE_URL=http://localhost:3000
```

The app also accepts the newer key names:

```env
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-key
SUPABASE_SECRET_KEY=your-server-only-key
```

Public/publishable keys may be used by the browser. Service-role/secret keys must remain server-only.

## 3. Schema and migrations

Do not copy a hand-maintained schema from documentation. The source of truth is `supabase/migrations/`.

With a linked Supabase CLI project:

```powershell
supabase migration list
supabase db push
```

Review every pending migration before applying it. Do not reset or perform a destructive migration against production.

## 4. Verify

Confirm that:

- local and remote migration lists match;
- `profiles`, `children`, `sessions`, and `session_records` exist;
- RLS is enabled and policies match [the access model](README.md);
- Email signup rejects a password shorter than eight characters;
- the project reports `ACTIVE_HEALTHY`;
- Security and Performance advisors have been reviewed.

Then run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:unit -- --runInBand
npm.cmd run test:e2e
npm.cmd run build
```

Finally verify the published student and teacher flows without exposing account credentials or participant data.
