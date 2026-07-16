# SelfReg AI

SelfReg AI is a bilingual (RU/EN) Next.js application for practicing self-regulation in a learning situation. A student works through a short five-stage cycle; a linked teacher can review the student's sessions and analytics in read-only mode.

The public release is available at [selfreg-ai.vercel.app](https://selfreg-ai.vercel.app).

## Release scope

### Student

- Authenticated personal dashboard and consent before the first saved session.
- Five stages: goal, move to action, feedback, comparison, and adjustment.
- Clarification, back, restart, and session history.
- Russian and English UI. New AI responses are requested in the language selected for the session.
- A student can link one profile to a teacher using the teacher's code.

### Teacher

- Personal teacher code and a list of linked student profiles.
- Read-only review of linked students' sessions, records, and analytics.
- Removing a student from the teacher dashboard removes only the link; it never deletes the student's sessions.

### AI and API keys

- **Mock** mode works without an external key and is suitable for a demonstration.
- **GitHub Models** is the recommended live BYOK provider.
- **OpenRouter** is an advanced alternative that must be checked with the selected model.
- **GigaChat** is shown as in development and is disabled for live release sessions.
- An API key stays in `sessionStorage` by default and is removed when the tab closes. Persistent browser storage is an explicit opt-in. Keys are not stored in the database.

## Architecture

- Next.js 16, TypeScript, App Router.
- Supabase Auth plus PostgreSQL for authenticated profiles, sessions, records, feedback, and teacher links.
- New email/password registrations require at least eight password characters, matching production Supabase Auth.
- Server routes enforce ownership for student writes. Linked teachers may read authorised student data but cannot modify sessions or feedback.
- GitHub Actions run lint, typecheck, unit tests, and production build.

## Local setup

```bash
git clone <repository-url>
cd selfreg-ai
npm install
copy .env.example .env.local
```

Set the Supabase variables in `.env.local`:

```env
NEXT_PUBLIC_PROJECT_LANDING_URL=https://selfreg-ai-networkschool.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_SUPABASE_ENABLED=true
```

Run the app:

```bash
npm.cmd run dev
```

On Windows, use `npm.cmd` because PowerShell may block `npm.ps1`.

## Testing

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:unit -- --runInBand
npm.cmd run build
```

Playwright starts a local development server with the isolated E2E setup enabled:

```bash
npm.cmd run test:e2e

# Run a focused E2E file
npm.cmd run test:e2e -- __tests__/e2e/adolescent-flow.test.ts
```

The E2E setup creates synthetic test users only. Do not use production participant data in E2E tests.

## User flow

1. A student creates an account or signs in.
2. The student confirms data processing and starts a personal session.
3. The student may use Mock mode or add a personal API key for a live provider.
4. The completed session is saved in the student dashboard.
5. If the student enters a teacher code, that teacher can review all of the student's sessions in read-only mode.

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Product development plan](DELIVERY_PLAN.md)
- [Testing guide](TESTING.md)
- [Deployment guide](DEPLOYMENT.md)
- [Supabase setup](supabase/SETUP.md)
- [RLS policies](supabase/README.md)

## Safety and privacy boundaries

- SelfReg AI is a learning-support tool, not therapy or emergency help.
- Do not enter passwords, access codes, or other secrets into session answers.
- The release does not provide clinical claims, diagnoses, or crisis support.
- Do not commit `.env` files, API keys, or private participant data.

## License

MIT License
