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
│   └── analytics.test.ts
├── e2e/               # Playwright E2E tests
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

### Unit Tests (7 tests)
- `analytics.test.ts` — Class distribution, progress stats, total statistics

### E2E Tests (Mock)
- `teacher-flow.test.ts` — Teacher registration workflow (mock, needs real Playwright implementation)

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
- Add component tests with React Testing Library
- Implement real Playwright E2E tests (replace mocks)
- Add test for AI provider switching
- Add test for bilingual (RU/EN) switching