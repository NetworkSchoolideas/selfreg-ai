# SelfReg AI architecture

This document describes the current release implementation. Historical implementation plans are intentionally not kept in the repository.

## Product boundaries

SelfReg AI is a bilingual learning-support application built around a fixed five-stage self-regulation process. The application, not the language model, controls stage order, scenario selection, clarification, back navigation, and completion.

The supported release roles are:

- **Student** — owns a profile, consent state, sessions, records, feedback, and teacher link.
- **Teacher** — receives a personal code, reviews linked student data in read-only mode, and may run an isolated personal browser-only session.

A student links their profile to one teacher by entering the teacher code. Once linked, saved student sessions are visible to that teacher automatically. Removing the student from the teacher dashboard removes only the link; it never deletes student sessions.

## Runtime topology

```text
Browser
  ├─ Next.js App Router pages and client components
  ├─ Supabase Auth session cookie
  ├─ sessionStorage for API keys by default
  └─ localStorage for explicit key persistence and isolated UI/session caches
       │
       ▼
Next.js route handlers
  ├─ authenticate the Supabase user
  ├─ enforce role and child ownership/link access
  ├─ call AI providers without persisting user keys
  └─ write through the server-only Supabase client
       │
       ▼
Supabase
  ├─ Auth users
  └─ PostgreSQL: profiles, children, sessions, session_records
```

Production is deployed by pushing `main` to GitHub. Vercel's Git integration builds that commit and assigns `selfreg-ai.vercel.app`; direct Vercel deploys are not part of the release process.

## Routes and access

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Product entry and role guides | Public |
| `/auth/login` | Email/password login | Public |
| `/auth/register` | Student registration and consent | Public |
| `/teacher/register` | Teacher registration | Public |
| `/role-selection` | Completes a profile without a role | Authenticated |
| `/adolescent` | Self-regulation session shell | Public shell; exercise requires an authenticated account |
| `/student/dashboard` | Student profile and session history | Student only |
| `/teacher` | Teacher dashboard and linked student analytics | Teacher only |
| `/settings` | User/provider settings | Authenticated |

`proxy.ts` applies role redirects for protected pages. Every API route remains responsible for its own authentication and authorization; route visibility is not treated as data authorization.

## Authentication and profiles

Supabase Auth is the identity provider. Email/password is the release path. New passwords must contain at least eight characters, matching the production Supabase Auth policy. Existing users are not rejected at the login form based on registration rules.

`profiles.id` equals `auth.users.id`. `profiles.role` is either `teacher` or `student`. Teacher code and organisation metadata live in `profiles.metadata`.

Google OAuth code remains behind explicit release flags:

```env
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
NEXT_PUBLIC_GOOGLE_AUTH_BETA_ACK=true
```

Without both flags, Google controls are not shown.

## Data model

### `profiles`

Auth-linked display name, email, role, avatar, and role metadata.

### `children`

Student participant row. `user_id` links the owning student account. `teacher_id` stores the linked teacher profile UUID as text for compatibility with the existing schema. Consent state is stored on this row.

### `sessions`

One self-regulation attempt with language, status, context, final note, feedback, completion time, and student archive state.

### `session_records`

Stage-level answers and feedback, including scenario, event type, provider, model, and response mode.

The checked-in source of truth for schema changes is `supabase/migrations/`. Generated Supabase types are compared with the maintained application type in `types/supabase.ts` during release audits.

## Storage and authorization

Authenticated student data is persisted in Supabase through protected server routes. Browser storage is not an authority for another user's data.

- Student writes require ownership of `children.user_id`.
- Teacher reads require `children.teacher_id` to equal the teacher profile ID.
- Teacher access to linked sessions and records is read-only.
- Teacher dashboard removal clears only the teacher/student link.
- Service-role database access is used only after the route has established the user and the relevant ownership or link.

RLS gives authenticated users only the direct reads needed for their own or linked data. Application writes to children, sessions, and records go through guarded server routes.

The teacher personal session is intentionally browser-only, namespaced to that authenticated account, and excluded from student dashboards and teacher analytics.

## Self-regulation engine

The five stages are fixed in domain code. Scenario A/B selection is computed before the provider call. The provider formats stage feedback in the selected session language but does not control the process.

Supported interaction events include normal answer, clarification request, back, and skip where allowed. Restart creates a clean attempt; language changes preserve the active attempt.

## AI providers and keys

- **Mock** — deterministic release fallback, no key.
- **GitHub Models** — recommended live BYOK provider.
- **OpenRouter** — advanced live option after key/model verification.
- **GigaChat** — visible as in development and disabled for live sessions.
- **Vercel AI Gateway** — hidden from the release UI.

User keys are stored in `sessionStorage` by default. Persistent `localStorage` is an explicit opt-in. A key is sent only for the provider check or model request and is never written to PostgreSQL, logs, traces, screenshots, or source control.

## Internationalisation

The UI supports Russian and English through the `lang` query parameter and shared language helpers. The selected language is sent with each AI request and saved on the session. New feedback and teacher-facing session content must remain in that language.

## Verification boundary

The release gate is:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:unit -- --runInBand
npm.cmd run test:e2e
npm.cmd run build
```

Production acceptance additionally checks the published commit, student and teacher accounts, Supabase RLS/integrity, and Vercel runtime logs.
