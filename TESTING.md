# Testing

The current product-like baseline journeys and issue ledger are in [docs/PRODUCT_TEST_MATRIX.md](docs/PRODUCT_TEST_MATRIX.md).

## Release gate

Run on Windows with `npm.cmd`:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:unit -- --runInBand
npm.cmd run test:e2e
npm.cmd run build
```

`npm.cmd run test:e2e` starts the local Next.js development server with the development-only E2E setup route. Tests create synthetic accounts in the configured Supabase project; they must not use participant data.

Run a focused Playwright file with:

```powershell
npm.cmd run test:e2e -- __tests__/e2e/auth-flow.test.ts
```

## Coverage areas

Unit tests cover the self-regulation model and flow machine, scenario selection, session helpers, provider routes, auth/profile bootstrap, authorization guards, data routes, analytics, i18n helpers, and security redaction.

Playwright covers:

- email authentication and role redirects;
- student and teacher dashboards;
- five-stage session completion;
- clarification, back, restart, resume, and language switching;
- feedback and session archive behaviour;
- teacher personal sessions;
- teacher read-only linked-student review;
- desktop and mobile layouts;
- provider-key UI without recording secrets.

## Live BYOK scenario pair

`__tests__/e2e/live-ai-flow.test.ts` is opt-in. It verifies a normal academic answer produces scenario A and a neighbouring overload/stuck answer produces scenario B from a real provider response.

```powershell
$env:SELFREG_LIVE_AI_API_KEY = "<temporary key>"
$env:SELFREG_LIVE_AI_PROVIDER = "github-models"
$env:SELFREG_LIVE_AI_MODEL = "openai/gpt-4o-mini"
npm.cmd exec playwright test __tests__/e2e/live-ai-flow.test.ts
```

The test disables trace, screenshots, and video. Remove the shell variable after the run.

## Production account smoke

`__tests__/e2e/production-auth-smoke.test.ts` is also opt-in and read-only. It signs in with reserved student and teacher accounts and checks role-appropriate dashboards.

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://selfreg-ai.vercel.app"
$env:SELFREG_PRODUCTION_TEACHER_EMAIL = "<reserved teacher email>"
$env:SELFREG_PRODUCTION_TEACHER_PASSWORD = "<reserved teacher password>"
$env:SELFREG_PRODUCTION_STUDENT_EMAIL = "<reserved student email>"
$env:SELFREG_PRODUCTION_STUDENT_PASSWORD = "<reserved student password>"
npm.cmd exec playwright test __tests__/e2e/production-auth-smoke.test.ts --workers=1
```

Do not save these values in `.env`, test code, documentation, screenshots, traces, or CI configuration.

## Browser acceptance

For any changed UI, verify both desktop and mobile widths. A release acceptance run should exercise Russian and English, inspect console errors, and confirm navigation after refresh and language changes. Never capture a screen while an API key or password is visible.
