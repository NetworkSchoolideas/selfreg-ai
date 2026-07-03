# Testing Guide for SelfReg AI

## Overview

This project uses **Jest** for unit tests and **Playwright** for E2E tests.

## Test Structure

```
__tests__/
├── e2e/           # End-to-end tests (Playwright)
│   ├── auth-flow.test.ts
│   └── teacher-flow.test.ts
└── unit/          # Unit tests (Jest)
    ├── ai-service.test.ts
    ├── analytics.test.ts
    ├── auth-callback-route.test.ts
    ├── chat-route.test.ts
    ├── children-route.test.ts
    ├── children-storage.test.ts
    ├── cycle-route.test.ts
    ├── e2e-setup-route.test.ts
    ├── join-teacher-route.test.ts
    ├── proxy-auth.test.ts
    ├── provider-check-route.test.ts
    ├── scenario-engine.test.ts
    ├── selfreg-flow-machine.test.ts
    ├── selfreg-model.test.ts
    ├── session-helpers.test.ts
    ├── session-manager.test.ts
    ├── session-sync-route.test.ts
    ├── session-sync.test.ts
    ├── student-dashboard.test.ts
    ├── supabase-auth.test.ts
    ├── teacher-dashboard-analytics.test.ts
    ├── teacher-data-route.test.ts
    └── teacher-link.test.ts
```

## Running Tests

### Unit Tests (Jest)
```bash
npm run test:unit
```

### E2E Tests (Playwright)
```bash
npm run test:e2e
```

### All Tests
```bash
npm test
```
Runs Jest unit tests. E2E tests are intentionally excluded from Jest and run through `npm run test:e2e`.

### Test with Coverage
```bash
npm run test:coverage
```

## Test Configuration

- **Jest config**: [`jest.config.ts`](../jest.config.ts) — uses `ts-jest` with `tsconfig.test.json`
- **Playwright config**: [`playwright.config.ts`](../playwright.config.ts) — Chromium only, base URL `http://localhost:3000`
- **Test tsconfig**: [`tsconfig.test.json`](../tsconfig.test.json) — extends main `tsconfig.json` with CommonJS module resolution

## Writing Tests

### Unit Tests
Place unit tests in `__tests__/unit/`. Use Jest's global `describe`, `it`, `expect`:

```typescript
describe("Feature Name", () => {
  it("should do something", () => {
    expect(true).toBe(true);
  });
});
```

### E2E Tests
Place E2E tests in `__tests__/e2e/`. Use Playwright's test API:

```typescript
import { test, expect } from "@playwright/test";

test("page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/SelfReg/);
});
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Main branch pushes
- Release tags

See `.github/workflows/ci.yml` for the CI pipeline configuration.

## Current Baseline

- Unit: 23 Jest suites, 72 tests.
- E2E: 2 Playwright files, 15 tests.
