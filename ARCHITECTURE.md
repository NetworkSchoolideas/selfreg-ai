# SelfReg AI — Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                 │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Adolescent  │  │   Teacher    │  │   Student      │ │
│  │  Prototype   │  │  Dashboard   │  │   Dashboard    │ │
│  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘ │
│         │                 │                   │          │
│  ┌──────┴─────────────────┴───────────────────┴────────┐ │
│  │                    Hooks Layer                       │ │
│  │  useSessionSubmit  │  useSessionHistory  │  useAuth  │ │
│  └──────────────────────┬───────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────┴───────────────────────────────┐ │
│  │                  Service Layer                       │ │
│  │  AIService  │  DataService  │  SessionManager        │ │
│  └──────┬───────────────────┬───────────────────────────┘ │
│         │                   │                             │
│  ┌──────┴──────┐  ┌────────┴────────┐                    │
│  │  AI Providers│  │  Storage Layer  │                    │
│  │  (BYOK)     │  │  ┌──────────┐   │                    │
│  │  ┌────────┐ │  │  │ Supabase │   │                    │
│  │  │ GigaChat│ │  │  │(optional)│   │                    │
│  │  │OpenRouter│ │  │  └──────────┘   │                    │
│  │  │GitHub   │ │  │  ┌──────────┐   │                    │
│  │  │Vercel   │ │  │  │localStor.│   │                    │
│  │  │Mock     │ │  │  │ (default)│   │                    │
│  │  └────────┘ │  │  └──────────┘   │                    │
│  └─────────────┘  └─────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## Core Domain: Self-Regulation Model

The application implements a **5-stage self-regulation cycle**:

```
Goal → Move to action → Feedback → Comparison → Adjustment
  1          2              3            4            5
```

### Stage Details

| Stage | ID | Description |
|-------|----|-------------|
| Goal | `1` | Define the goal of the session |
| Move to action | `2` | Describe actions taken toward the goal |
| Feedback | `3` | Receive and process feedback |
| Comparison | `4` | Compare results with the goal |
| Adjustment | `5` | Plan adjustments for next time |

### A/B Scenario System

Based on the user's answers, the system detects whether the user is in:
- **Scenario A** — Normal support (constructive, encouraging)
- **Scenario B** — Pressure/self-attack support (addressing self-criticism)
- **Clarify** — Ambiguous answers trigger clarification questions

Detection is done heuristically in [`lib/scenario-engine.ts`](lib/scenario-engine.ts) using keyword analysis.

### Flow State Machine

The [`lib/selfreg-flow-machine.ts`](lib/selfreg-flow-machine.ts) implements a deterministic state machine:

```
States: 1 → 2 → 3 → 4 → 5 → COMPLETE
         ↑    ↓    ↓    ↓
         └────┴────┴────┘ (BACK)
         CLARIFY_REQUEST (at any stage)
```

Events: `ANSWER`, `BACK`, `CLARIFY_REQUEST`, `SKIP`, `RETRY`, `COMPLETE`

## Storage Architecture

### Two-Layer Storage

The app supports two storage backends, managed by [`lib/data-service.ts`](lib/data-service.ts):

```
DataService
├── Supabase (primary, when enabled + authenticated)
│   ├── children table
│   ├── sessions table
│   └── session_records table
└── localStorage (fallback, always available)
    ├── selfreg_children key
    ├── selfreg_sessions key
    └── selfreg_onboarding_seen_* keys
```

### Data Flow

```
Component → Hook → DataService → Supabase/localStorage
                              ↕
                    SessionManager (caching layer)
```

### Key Files

| File | Purpose |
|------|---------|
| [`lib/data-service.ts`](lib/data-service.ts) | Unified data layer, auto-selects storage backend |
| [`lib/children-storage.ts`](lib/children-storage.ts) | localStorage operations for children/sessions |
| [`lib/session-manager.ts`](lib/session-manager.ts) | Session CRUD with caching |
| [`lib/server-storage.ts`](lib/server-storage.ts) | Supabase server-side operations |
| [`lib/supabase.ts`](lib/supabase.ts) | Supabase client initialization |

## AI Provider System (BYOK)

### Architecture

```
AIService (services/ai-service.ts)
├── MockProvider (lib/mock-provider.ts) — No AI, deterministic responses
├── GigaChatProvider (lib/gigachat-provider.ts)
├── OpenRouterProvider (lib/openrouter-provider.ts)
├── GitHubModelsProvider (lib/github-models-provider.ts)
└── VercelGatewayProvider (lib/vercel-gateway-provider.ts)
```

### BYOK Flow

1. User selects provider on the session page
2. User enters API key (stored in localStorage only)
3. Key is tested via `/api/provider-check`
4. All subsequent AI calls use the selected provider + key
5. Mock mode requires no key — app works fully without AI

### Key Files

| File | Purpose |
|------|---------|
| [`services/ai-service.ts`](services/ai-service.ts) | AI service orchestration |
| [`lib/provider-registry.ts`](lib/provider-registry.ts) | Provider metadata and lookup |
| [`lib/ai-provider.ts`](lib/ai-provider.ts) | Provider interface |
| [`app/components/ApiKeyManager.tsx`](app/components/ApiKeyManager.tsx) | UI for key management |
| [`app/api/provider-check/route.ts`](app/api/provider-check/route.ts) | Key validation endpoint |

## Bilingual System (RU/EN)

### How It Works

1. Language is detected from `localStorage` → cookie → URL param → browser preference
2. [`lib/app-i18n.ts`](lib/app-i18n.ts) provides `normalizeAppLang()` and `withLang()` helper
3. Each page/component defines a `ui` object with all text in both languages
4. [`app/components/LanguageToggle.tsx`](app/components/LanguageToggle.tsx) switches language and preserves current page

### Pattern

```typescript
const lang = normalizeAppLang();
const ui = {
  title: lang === "ru" ? "Привет" : "Hello",
  description: lang === "ru" ? "Описание" : "Description",
};
```

## Routing

### Next.js 16 App Router

- All pages in `app/` directory with `page.tsx` convention
- **Next.js 16 uses `proxy.ts` instead of `middleware.ts`** — they cannot coexist
- [`proxy.ts`](proxy.ts) handles auth checks, language detection, and route protection

### Route Map

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Landing page | No |
| `/role-selection` | Choose teacher/student | No |
| `/auth/login` | Login | No |
| `/auth/register` | Register | No |
| `/adolescent` | Self-regulation session | No |
| `/teacher` | Teacher dashboard (working) | No |
| `/teacher/dashboard` | Teacher dashboard (redirect) | No |
| `/teacher/dashboard/child` | Child detail view | No |
| `/student/dashboard` | Student dashboard | No |
| `/settings` | Settings | No |

## Testing Infrastructure

### Unit Tests (Jest)

- **Config**: [`jest.config.ts`](jest.config.ts) — `ts-jest` preset, `tsconfig.test.json`
- **Location**: `__tests__/unit/`
- **Run**: `npm run test:unit`
- **Coverage**: `npm run test:coverage`

### E2E Tests (Playwright)

- **Config**: [`playwright.config.ts`](playwright.config.ts) — Chromium, `http://localhost:3000`
- **Location**: `__tests__/e2e/`
- **Run**: `npm run test:e2e`

### CI Pipeline

- **Config**: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
- **Triggers**: Push to `main`, Pull Request to `main`
- **Jobs**:
  1. `lint-and-typecheck` — `tsc --noEmit` + `eslint .`
  2. `unit-tests` — `jest __tests__/unit`
  3. `build` — `next build` (depends on 1 + 2)

## CSS Architecture

### Approach

- Pure CSS, no Tailwind or external UI libraries
- Custom CSS variables in `:root` for theming
- Mobile-first responsive design

### Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| Desktop | > 1024px | Full layout |
| Tablet | ≤ 1024px | Stacked layout, 1-column grids |
| Mobile | ≤ 768px | Vertical stacking, full-width elements |

### Key Layout Classes

| Class | Purpose |
|-------|---------|
| `.shell` | Page container, `max-width: 1180px`, centered |
| `.topbar` | Page header with title + actions |
| `.dashboard-layout` | Sidebar + main content flex layout |
| `.dashboard-sidebar` | Fixed-width sidebar (288px) |
| `.prototype-layout` | Two-column grid for session page |
| `.analytics-grid` | 2-column analytics grid |
| `.stat-grid-3col` | 3-column stat cards |
| `.modal-overlay` / `.modal-content` | Modal dialog pattern |

## Development Workflow

```
1. Code locally
2. npm run check:full (tsc --noEmit && eslint . && next build)
3. Git commit
4. Push to GitHub
5. Vercel auto-deploys
6. Apply SQL migrations to Supabase (if schema changed)
```

### Build Check

Always run before committing:
```bash
npm run check:full
```

This runs: `tsc --noEmit` → `eslint .` → `next build`

## Key Design Decisions

1. **BYOK over server-side keys** — Users bring their own API keys, stored only in localStorage. No server-side key management needed.
2. **localStorage as default** — App works immediately without any backend setup. Supabase is optional.
3. **No external UI libraries** — Pure CSS keeps bundle size small and avoids dependency churn.
4. **Bilingual from day one** — All components support RU/EN, not retrofitted.
5. **State machine for flow** — Deterministic flow control prevents invalid state transitions.
6. **Error boundaries on all pages** — Prevents full app crashes from component errors.
7. **`queueMicrotask` pattern** — Used for `setState` in `useEffect` to comply with ESLint `react-hooks/set-state-in-effect` rule.