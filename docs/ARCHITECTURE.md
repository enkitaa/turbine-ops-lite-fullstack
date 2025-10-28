# Architecture

Full-stack turbine inspection management system with REST + GraphQL APIs, real-time notifications, and role-based access control.

## Tech Stack

### Frontend
- **React 18** + TypeScript
- **Vite** for build tooling
- **SSE** for real-time updates
- Pages: Turbines, Inspections (list + detail)

### Backend
- **Node.js** + TypeScript
- **Express** for REST API
- **Apollo Server** for GraphQL
- **Prisma ORM** for PostgreSQL
- **MongoDB** for logging

### Infrastructure
- **Docker Compose** for multi-service orchestration
- **PostgreSQL** (primary database)
- **MongoDB** (NoSQL logs)
- **Nginx** (frontend production server)

## System Architecture

```
┌─────────────┐
│   Frontend  │ React SPA on port 3000
│   (Nginx)   │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────────────────────────────┐
│         Backend (Express)           │
│  ┌────────────┐   ┌──────────────┐  │
│  │   REST     │   │   GraphQL    │  │
│  │   /api/*   │   │   /graphql   │  │
│  └────────────┘   └──────────────┘  │
│  ┌────────────────────────────────┐ │
│  │     JWT Auth + RBAC            │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │     SSE Events                 │ │
│  │     /api/events                │ │
│  └────────────────────────────────┘ │
└──────┬──────────────────────┬───────┘
       │                      │
       ▼                      ▼
┌──────────────┐      ┌──────────────┐
│  PostgreSQL  │      │   MongoDB    │
│  (Prisma)    │      │   (Logs)     │
└──────────────┘      └──────────────┘
```

## Data Model

### Entity Relationships

```
User (auth)
  └─ Role: ADMIN | ENGINEER | VIEWER

Turbine (1) ───────< Inspection (N) ───────< Finding (N)
                             │
                             └─> RepairPlan (1:1)
```

### Models

**Turbine**
- Fields: id, name, manufacturer, mwRating, lat, lng
- Relations: has many Inspections

**Inspection**
- Fields: id, date, inspectorName, dataSource (DRONE/MANUAL), rawPackageUrl
- Indexes: (turbineId, date) for overlap prevention
- Relations: belongs to Turbine, has many Findings, has one RepairPlan

**Finding**
- Fields: id, category (BLADE_DAMAGE/LIGHTNING/EROSION/UNKNOWN), severity (1-10), estimatedCost, notes
- Indexes: (inspectionId)
- Relations: belongs to Inspection

**RepairPlan**
- Fields: id, priority (LOW/MEDIUM/HIGH), totalEstimatedCost, snapshotJson
- Relations: 1:1 with Inspection

## API Design

### REST Endpoints
- CRUD operations for Turbines, Inspections, Findings
- Query parameters for filtering (date range, turbine, data source, text search)
- Proper HTTP status codes and error responses

### GraphQL
- Query: inspection details with nested data
- Mutation: generateRepairPlan (complex business logic)

### Real-time Events
- SSE endpoint: `/api/events`
- Event types: `ping`, `plan`
- Auto-reconnect and error handling on client

## Business Logic

### Overlap Prevention
Prevents multiple inspections on the same turbine/date:
```typescript
if (existing) return 409 Conflict
```

### Severity Derivation Rule
BLADE_DAMAGE + "crack" in notes → minimum severity 4:
```typescript
if (category === "BLADE_DAMAGE" && notes.includes("crack")) {
  severity = Math.max(4, providedSeverity)
}
```

### Priority Calculation
Based on maximum severity across findings:
```typescript
priority = maxSeverity >= 5 ? "HIGH" 
         : maxSeverity >= 3 ? "MEDIUM" 
         : "LOW"
```

### Repair Plan Generation
1. Apply severity rules to findings
2. Sum estimated costs
3. Derive priority from max severity
4. Create/update plan with snapshot
5. Emit SSE notification

## Security

### Authentication
- JWT tokens with role-based authorization
- Passwords hashed with bcrypt (12 rounds)
- Token expiry: 24 hours

### Authorization
- **ADMIN**: Full CRUD + delete operations
- **ENGINEER**: Create/update (no delete)
- **VIEWER**: Read-only access

### Input Validation
- Prisma schema validation
- Explicit validation on endpoints
- Sanitized queries to prevent injection

## Testing

### Backend (Jest + Supertest)
- 150 integration tests covering:
  - CRUD operations with validation
  - Business rules (overlap, severity, priority)
  - RBAC enforcement
  - Error handling

### Frontend (Vitest + React Testing Library)
- 27 component tests for:
  - UI rendering
  - Form interactions
  - User flows

### CI/CD
- GitHub Actions workflows
- Automated testing on push/PR
- Database seeding for test environment

## Deployment

### Docker Compose
- 4 services: postgres, mongo, backend, frontend
- Health checks for dependencies
- Automatic restarts

### Environment Variables
- Database URLs
- JWT secrets
- Port configurations
- Mongo connection

## Design Decisions

1. **REST + GraphQL**: REST for simple CRUD, GraphQL for complex nested queries
2. **PostgreSQL + MongoDB**: SQL for structured data, NoSQL for flexible logs
3. **SSE over WebSockets**: Simpler unidirectional server-to-client notifications
4. **Prisma ORM**: Type-safe queries and migrations
5. **Role-based RBAC**: Granular permissions without complex policies
6. **Snapshot JSON**: Store repair plan state for auditability
