# Testing

## Backend
```bash
cd backend
npm test
```

### Implemented Tests

**Unit Tests:**
- Priority logic (`rules.test.ts`)
  - Tests priority derivation from max severity (LOW/MEDIUM/HIGH)
  
**Integration Tests (Supertest):**
- Turbine CRUD operations (`turbines.test.ts`)
  - GET, POST, PUT, DELETE operations
  - Input validation
  - Role-based access control
  - Boundary value testing

- Inspection CRUD + Overlap Prevention (`inspections.test.ts`)
  - GET, POST, PUT, DELETE operations
  - **Overlap prevention**: Prevents creating overlapping inspections on same turbine/date
  - Filtering by turbineId, dataSource, date range
  - Error handling

- Finding CRUD + Severity Derivation (`findings.test.ts`)
  - GET, POST, PUT, DELETE operations
  - **Severity derivation**: BLADE_DAMAGE + "crack" in notes → minimum severity 4
  - Case-insensitive matching for severity rule
  - Input validation

- Repair Plan Generation (`repair-plan.test.ts`)
  - GraphQL mutation integration
  - Priority calculation from max severity
  - Severity adjustment in plan generation
  - Cost summation
  - Happy path coverage

**Other Tests:**
- Auth service (`auth.test.ts`)
- JWT utilities (`jwt.test.ts`)
- Login handler (`login.test.ts`)
- Middleware (`middleware.test.ts`)
- Password utilities (`password.test.ts`)

## Frontend
```bash
cd frontend
npm test
```

### Implemented Tests

**Component Tests (Vitest + React Testing Library):**
- `App.test.tsx` - Main application component
  - Login/logout flow
  - Page navigation
  - Form interactions
  
- `Turbines.test.tsx` - Turbines component
  - Turbine list rendering
  - Create/edit/delete forms
  - Empty states
  - Form field validation
  
- `Inspections.test.tsx` - Inspections component
  - Inspection list rendering
  - Create form
  - Details view
  - Findings display
