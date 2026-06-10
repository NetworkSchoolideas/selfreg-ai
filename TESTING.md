# Testing

## Setup

1. Install Vitest:
```bash
npm install -D vitest @types/node
```

2. Run tests:
```bash
npm run test:unit
```

## Test Structure

- `__tests__/unit/` - Unit tests for components and utilities
- `__tests__/e2e/` - End-to-end test scenarios

## Current Tests

### Unit Tests
- `analytics.test.ts` - Analytics data processing tests

### E2E Tests (Mock)
- `teacher-flow.test.ts` - Teacher registration workflow

## Manual Testing Checklist

### Teacher Flow
- [x] Navigate to /role-selection
- [x] Select "Teacher" role
- [x] Complete registration form
- [x] Get teacher code
- [x] Access dashboard

### Student Flow  
- [ ] Navigate to /role-selection
- [ ] Select "Student" role
- [ ] Complete registration
- [ ] Enter teacher code
- [ ] Verify linkage

### Security
- [ ] Teacher can only see their students
- [ ] Student can only see their own data
- [ ] RLS policies enforced

## Future Work

- Install Playwright for real E2E tests
- Add integration tests for API endpoints
- Add component tests with React Testing Library
- Set up CI/CD pipeline