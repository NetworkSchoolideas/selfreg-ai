# Deployment Guide - SelfReg AI

## What must be true before deploy

The current app expects:

- Next.js app on Vercel or any Node-compatible host
- Supabase Auth enabled
- `profiles`, `children`, `sessions`, and `session_records` tables present
- RLS policies applied to the current schema
- server-side env for Supabase admin access

The old `teachers` table flow is no longer the source of truth. Teacher role and teacher code now live in `profiles`, and teacher code is stored in `profiles.metadata.teacher_code`.

## Recommended deployment path

### 1. Prepare Supabase

Follow [supabase/SETUP.md](supabase/SETUP.md) to create the current schema.

Then apply:

- [supabase/migrations/001-rls-policies.sql](supabase/migrations/001-rls-policies.sql)

### 2. Configure environment variables

Minimum required for production:

```env
NEXT_PUBLIC_SUPABASE_ENABLED=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_BASE_URL=https://your-app-domain.vercel.app
NEXT_PUBLIC_PROJECT_LANDING_URL=https://your-landing-domain.vercel.app
```

Optional provider env:

```env
DEFAULT_AI_PROVIDER=mock
GITHUB_MODELS_TOKEN=
GITHUB_MODELS_MODEL=openai/gpt-4o-mini
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
AI_GATEWAY_API_KEY=
AI_GATEWAY_MODEL=openai/gpt-oss-120b
GIGACHAT_CREDENTIALS=
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_AUTH_URL=https://ngw.devices.sberbank.ru:9443/api/v2/oauth
GIGACHAT_API_URL=https://gigachat.devices.sberbank.ru/api/v1/chat/completions
```

Security env:

```env
ALLOW_EPHEMERAL_USER_KEYS=true
ALLOW_STORED_USER_KEYS=false
APP_ENCRYPTION_KEY=
```

If `ALLOW_STORED_USER_KEYS=true`, `APP_ENCRYPTION_KEY` must be set.

### 3. Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project into [Vercel](https://vercel.com/new).
3. Add the environment variables above.
4. Deploy.

### 4. Set Supabase Auth URLs

In Supabase Auth settings, add:

- Site URL: your production app URL
- Redirect URL: `https://your-app-domain.vercel.app/auth/callback`

If you use preview deployments, add the preview domain pattern or explicit preview callback URLs as well.

## Local production check

Run these before any release:

```bash
npm run check
npm run build
npm run test:e2e
```

## Release checklist

### App readiness

- [ ] `npm run check` passes
- [ ] `npm run build` passes
- [ ] `npm run test:e2e` passes
- [ ] Home page opens and landing link points to the correct environment URL
- [ ] Teacher registration completes and shows a teacher code
- [ ] Teacher login reaches `/teacher`
- [ ] Student link or teacher-code join flow links the child to the correct teacher
- [ ] Teacher dashboard loads server-backed data
- [ ] Session sync writes `sessions` and `session_records`

### Supabase readiness

- [ ] `profiles`, `children`, `sessions`, `session_records` exist
- [ ] RLS SQL from `supabase/migrations/001-rls-policies.sql` is applied
- [ ] Email auth is enabled
- [ ] OAuth callback URL is configured if Google auth is used
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is present in the app host

### Operational readiness

- [ ] `APP_BASE_URL` matches the production app origin
- [ ] `NEXT_PUBLIC_PROJECT_LANDING_URL` matches the production landing origin
- [ ] Error logs are monitored in Vercel
- [ ] Supabase project backups and access controls are reviewed

## Troubleshooting

### `Supabase admin not configured`

The server-side key is missing. Check:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY` fallback if you intentionally use that name

### Auth works, but teacher/student linking fails

Check:

- teacher role is stored in `profiles.role`
- teacher code exists in `profiles.metadata.teacher_code`
- child row exists in `children`
- `children.teacher_id` updates are allowed through the server route

### Teacher dashboard opens but shows local fallback only

Check:

- `NEXT_PUBLIC_SUPABASE_ENABLED=true`
- public Supabase URL and anon key are set
- teacher data exists in `children`, `sessions`, and `session_records`

### OAuth redirects back to login with `auth=error`

Check:

- Supabase Site URL
- `/auth/callback` redirect URL
- `APP_BASE_URL`
- provider configuration in Supabase Auth

## Notes

- The app can still run in mock mode without external AI provider keys.
- The data model already supports server-backed teacher analytics and session history.
- The most fragile production edge is auth + teacher/student linking, not the static app shell.
