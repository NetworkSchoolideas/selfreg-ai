# Testing Guide for SelfReg AI

## Overview

This project uses a combination of unit tests and E2E tests to ensure quality.

## Test Structure

```
__tests__/
├── e2e/           # End-to-end tests
│   ├── auth.test.ts
│   ├── teacher-flow.test.ts
│   └── student-flow.test.ts
└── unit/          # Unit tests
    ├── analytics/
    └── lib/
```

## Running Tests

### Unit Tests (Vitest)
```bash
npm run test:unit
```

### E2E Tests (Playwright)
```bash
npm run test:e2e
```

### All Tests
```bash
npm run test
```

### Test with Coverage
```bash
npm run test:coverage
```

## Test Categories

### 1. Authentication Flow
- [ ] Teacher registration
- [ ] Student registration
- [ ] Role selection
- [ ] Session management

### 2. Teacher Features
- [ ] Dashboard load
- [ ] Student list
- [ ] Analytics view
- [ ] Child detail page

### 3. Student Features
- [ ] Profile view
- [ ] Session history
- [ ] Teacher linkage

### 4. API Endpoints
- [ ] /api/children
- [ ] /api/join-teacher
- [ ] Health checks

## Setup for E2E Tests

1. Install Playwright:
```bash
npm install -D @playwright/test
npx playwright install
```

2. Set up test environment:
```bash
cp .env.test.example .env.test
```

3. Run tests:
```bash
npm run test:e2e
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Main branch pushes
- Release tags

## Manual Testing Checklist

### Teacher Flow
- [ ] Register as teacher
- [ ] Get teacher code
- [ ] View dashboard
- [ ] See student list
- [ ] View analytics
- [ ] Click student details

### Student Flow
- [ ] Register as student
- [ ] Enter teacher code
- [ ] View profile
- [ ] See session history

### Security
- [ ] Teacher can't access student routes
- [ ] Student can't access teacher routes
- [ ] RLS policies enforced
- [ ] Sessions expire correctly