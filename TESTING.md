# Testing

## Setup

Tests are already configured. No additional setup needed after `npm install`.

### Unit Tests (Jest)

```bash
npm run test:unit
```

### E2E Tests (Playwright)

```bash
# First install Playwright browsers (one-time)
npx playwright install

# Then run E2E tests
npm run test:e2e
```

### All Tests

```bash
npm test
```

### With Coverage

```bash
npm run test:coverage
```

## Test Structure

```
__tests__/
├── unit/              # Jest unit tests
│   ├── ai-service.test.ts
│   ├── analytics.test.ts
│   ├── answer-validator.test.ts
│   ├── auth-callback-route.test.ts
│   ├── api-key-manager.test.tsx
│   ├── chat-route.test.ts
│   ├── children-route.test.ts
│   ├── children-storage.test.ts
│   ├── confirm-dialog.test.tsx
│   ├── cycle-route.test.ts
│   ├── e2e-setup-route.test.ts
│   ├── e2e-runner.test.ts
│   ├── error-boundary.test.tsx
│   ├── join-teacher-route.test.ts
│   ├── language-toggle.test.tsx
│   ├── onboarding-modal.test.tsx
│   ├── proxy-auth.test.ts
│   ├── proxy-route.test.ts
│   ├── provider-check-route.test.ts
│   ├── scenario-engine.test.ts
│   ├── security.test.ts
│   ├── selfreg-flow-machine.test.ts
│   ├── selfreg-model.test.ts
│   ├── session-helpers.test.ts
│   ├── session-manager.test.ts
│   ├── session-sync-route.test.ts
│   ├── session-sync.test.ts
│   ├── student-dashboard.test.ts
│   ├── supabase-auth.test.ts
│   ├── teacher-dashboard-analytics.test.ts
│   ├── teacher-data-route.test.ts
│   └── teacher-link.test.ts
├── e2e/               # Playwright E2E tests
│   ├── auth-flow.test.ts
│   └── teacher-flow.test.ts
└── README.md          # Test documentation
```

## Configuration

- **Jest**: [`jest.config.ts`](jest.config.ts) — uses `ts-jest` with `tsconfig.test.json`
- **Playwright**: [`playwright.config.ts`](playwright.config.ts) — Chromium only, base URL `http://localhost:3000`
- **Test TypeScript**: [`tsconfig.test.json`](tsconfig.test.json) — extends main config with CommonJS module resolution

## Writing Tests

### Unit Tests

Place in `__tests__/unit/`. Use Jest globals (`describe`, `it`, `expect`):

```typescript
describe("Feature", () => {
  it("should work", () => {
    expect(1 + 1).toBe(2);
  });
});
```

### E2E Tests

Place in `__tests__/e2e/`. Use Playwright's test API:

```typescript
import { test, expect } from "@playwright/test";

test("page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/SelfReg/);
});
```

## Current Tests

### Unit Tests
- 32 Jest suites, 93 tests.
- Core domain coverage: self-regulation model, flow machine, scenario engine, session helpers, session manager, AI service.
- Auth/data coverage: callback route, children route, children storage, provider-check/chat/cycle routes, session sync, Supabase auth, teacher/student dashboard helpers.
- Component coverage: ErrorBoundary, ConfirmDialog, LanguageToggle, ApiKeyManager, OnboardingModal.
- Edge/security coverage: answer validation, proxy route protection, secret redaction.
- Test infrastructure coverage: E2E runner process invocation.

### E2E Tests
- 2 Playwright files, 15 tests.
- `auth-flow.test.ts` — Authentication and RBAC smoke coverage.
- `teacher-flow.test.ts` — Public, teacher, student, and dashboard smoke coverage.

## CI Integration

Tests run automatically on every push to `main` and on Pull Requests via GitHub Actions (see `.github/workflows/ci.yml`).

## Manual Testing Checklist

### Teacher Flow
- [ ] Navigate to /role-selection
- [ ] Select "Teacher" role
- [ ] Complete registration form
- [ ] Get teacher code
- [ ] Access dashboard
- [ ] Add students
- [ ] View analytics
- [ ] Export CSV

### Student Flow
- [ ] Navigate to /adolescent
- [ ] Start self-regulation session
- [ ] Complete 5 stages
- [ ] View session history
- [ ] Link to teacher

### Security
- [ ] Teacher can only see their students
- [ ] Student can only see their own data
- [ ] RLS policies enforced (when Supabase enabled)

## Future Work

- Add integration tests for API endpoints
- Add deeper component interaction tests with React Testing Library/jsdom if richer DOM assertions become necessary
- Add test for AI provider switching
- Add test for bilingual (RU/EN) switching
