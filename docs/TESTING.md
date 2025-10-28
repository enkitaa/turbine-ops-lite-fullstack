# Testing

## Backend Tests

### Run Tests

```bash
cd backend
npm test
```

### Test Files

**rules.test.ts** - Priority logic
- Derives priority from max severity (HIGH ≥5, MEDIUM 3-4, LOW <3)

**turbines.test.ts** (24 tests)
- GET, POST, PUT, DELETE operations
- Input validation (name, mwRating, lat/lng)
- RBAC enforcement
- Conflict handling (turbine with inspections)

**inspections.test.ts** (18 tests)
- CRUD operations
- Overlap prevention (same turbine/date → 409)
- Filtering (turbineId, dataSource, date range, searchNotes)
- RBAC enforcement

**findings.test.ts** (17 tests)
- CRUD operations
- Severity rule (BLADE_DAMAGE + "crack" → min severity 4)
- Case-insensitive matching
- Validation (severity 1-10, cost ≥0)
- RBAC enforcement

**repair-plan.test.ts** (8 tests)
- Priority calculation (HIGH/MEDIUM/LOW)
- Severity rule application
- Cost summation
- GraphQL mutation integration

**auth.test.ts, jwt.test.ts, login.test.ts, middleware.test.ts, password.test.ts**
- Authentication and authorization logic

## Frontend Tests

### Run Tests

```bash
cd frontend
npm test
```

### Test Files

**App.test.tsx** (8 tests)
- Login/logout
- Page navigation
- SSE connection

**Turbines.test.tsx** (9 tests)
- List rendering
- Create/edit/delete forms
- Empty states
- Validation

**Inspections.test.tsx** (10 tests)
- List rendering
- Create form
- Details view
- Filter UI
- Findings display

## CI/CD

Tests run automatically on GitHub Actions on every push/PR:
- Backend tests with PostgreSQL service
- Frontend tests with mocked APIs
- Both build and test in CI workflow

## Business Rules Coverage

All business rules are tested:
- Overlap prevention for inspections
- Severity derivation rule (BLADE_DAMAGE + crack)
- Priority calculation from max severity
- RBAC enforcement across all endpoints

## Test Configuration

**Backend**: PostgreSQL with migrations and seed data  
**Frontend**: Mocks for EventSource, localStorage, fetch  
**UUID**: All test data cleaned up after each suite
