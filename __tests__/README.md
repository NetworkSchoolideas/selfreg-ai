# Testing Guide for SelfReg AI

## Overview

This project uses **Jest** for unit tests and **Playwright** for E2E tests.

## Test Structure

```
__tests__/
├── e2e/           # End-to-end tests (Playwright)
│   └── teacher-flow.test.ts
└── unit/          # Unit tests (Jest)
    └── analytics.test.ts
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