# Deployment guide

## Release path

SelfReg AI uses one production path:

1. Validate the repository locally.
2. Commit and push `main` to GitHub.
3. GitHub Actions validates the pushed commit.
4. Vercel Git integration builds the same commit.
5. Verify `https://selfreg-ai.vercel.app/api/health` and the published product.

Do not use a direct Vercel deployment for the release project.

## Required environment variables

```env
NEXT_PUBLIC_SUPABASE_ENABLED=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-key
APP_BASE_URL=https://selfreg-ai.vercel.app
NEXT_PUBLIC_PROJECT_LANDING_URL=https://your-landing-domain.example
```

The newer Supabase key names are also supported:

```env
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-key
SUPABASE_SECRET_KEY=your-server-only-key
```

Never expose a service-role/secret key through a `NEXT_PUBLIC_` variable.

Optional server/provider variables are documented in `.env.example`. The release works in Mock mode without a provider key. User-supplied BYOK keys must not be placed in Vercel environment variables.

## Supabase

1. Enable Email authentication.
2. Set the minimum password length to `8` or more.
3. Set the Site URL to `https://selfreg-ai.vercel.app`.
4. Allow `https://selfreg-ai.vercel.app/auth/callback` and the required local callback URLs.
5. Apply every migration in `supabase/migrations/` in version order.
6. Confirm local and remote migration versions match.
7. Review Security and Performance advisors.

Compromised-password protection is plan-dependent. Its absence on a plan that does not provide it is an accepted platform limitation, not a reason to weaken the application's eight-character minimum.

See [Supabase setup](supabase/SETUP.md) and [RLS notes](supabase/README.md).

## Local release gate

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:unit -- --runInBand
npm.cmd run test:e2e
npm.cmd run build
```

The opt-in production account smoke is documented in [TESTING.md](TESTING.md). Credentials belong only in the current shell environment and must never be written to the repository, screenshots, traces, or CI logs.

## Post-push verification

- GitHub Actions is green for the pushed SHA.
- The latest Vercel production deployment is `READY`, has source `git`, branch `main`, and the same SHA.
- `/api/health` reports that short SHA.
- Student login reaches `/student/dashboard` and cannot open `/teacher`.
- Teacher login reaches `/teacher` and cannot mutate a student's session.
- The student can complete, resume, clarify, go back, restart, switch language, and submit feedback.
- The teacher sees linked sessions and can remove only the dashboard link.
- Vercel runtime errors and Supabase Auth/API/Postgres logs show no new unexpected failures from the acceptance run.

## Rollback

Rollback through Git, not by editing production directly:

1. Revert the faulty commit with a new commit.
2. Push `main`.
3. Wait for GitHub Actions and the Git-triggered Vercel deployment.
4. Re-run the post-push verification.

Database migrations are forward-only unless a separate reviewed recovery plan exists. Do not perform destructive production rollback SQL ad hoc.
