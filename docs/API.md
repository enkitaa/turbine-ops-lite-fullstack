# API Documentation

Base URL: `http://localhost:4000`

## Authentication

All endpoints require a Bearer token in the Authorization header (except login).

```http
Authorization: Bearer <jwt-token>
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id", "email", "role" }
}
```

## REST API Endpoints

### Turbines

#### Get All Turbines
```http
GET /api/turbines
Authorization: Bearer <token>

Response: [{ id, name, manufacturer, mwRating, lat, lng }]
```

#### Create Turbine
```http
POST /api/turbines
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "T-500",
  "manufacturer": "WindTech",
  "mwRating": 2.5,
  "lat": 12.98,
  "lng": 77.59
}

Validation:
- name: required
- mwRating: 0-100
- lat: -90 to 90
- lng: -180 to 180
```

#### Update Turbine
```http
PUT /api/turbines/:id
Authorization: Bearer <token>
Content-Type: application/json

{ "name", "manufacturer", "mwRating", "lat", "lng" }
```

#### Delete Turbine
```http
DELETE /api/turbines/:id
Authorization: Bearer <token>

Returns 409 if turbine has inspections
```

### Inspections

#### List Inspections (with filters)
```http
GET /api/inspections?turbineId=xxx&startDate=2024-01-01&endDate=2024-12-31&dataSource=DRONE&searchNotes=crack
Authorization: Bearer <token>

Filters (all optional):
- turbineId: Filter by specific turbine
- startDate: Filter inspections from this date (ISO format)
- endDate: Filter inspections up to this date (ISO format)
- dataSource: DRONE or MANUAL
- searchNotes: Text search in findings notes (case-insensitive)
```

#### Create Inspection
```http
POST /api/inspections
Authorization: Bearer <token>
Content-Type: application/json

{
  "turbineId": "clxxxx",
  "date": "2024-01-15",
  "inspectorName": "John Doe",
  "dataSource": "DRONE",
  "rawPackageUrl": "https://..."
}

Validation:
- turbineId, date, dataSource: required
- Returns 409 if inspection exists for same turbine/date
```

#### Get Inspection Details
```http
GET /api/inspections/:id
Authorization: Bearer <token>

Returns: { id, date, inspectorName, dataSource, rawPackageUrl, turbine, findings, repairPlan }
```

#### Update Inspection
```http
PUT /api/inspections/:id
Authorization: Bearer <token>
Content-Type: application/json

{ "date", "inspectorName", "dataSource", "rawPackageUrl" }
```

#### Delete Inspection
```http
DELETE /api/inspections/:id
Authorization: Bearer <token>
```

### Findings

#### Get Findings by Inspection
```http
GET /api/findings?inspectionId=xxx
Authorization: Bearer <token>
```

#### Create Finding
```http
POST /api/findings
Authorization: Bearer <token>
Content-Type: application/json

{
  "inspectionId": "clxxxx",
  "category": "BLADE_DAMAGE",
  "severity": 5,
  "estimatedCost": 1500,
  "notes": "Crack found in blade"
}

Validation:
- inspectionId, category, severity, estimatedCost: required
- severity: 1-10
- estimatedCost: >= 0
- category: BLADE_DAMAGE | LIGHTNING | EROSION | UNKNOWN

Business Rule:
- BLADE_DAMAGE + "crack" in notes → severity ≥ 4
```

#### Update Finding
```http
PUT /api/findings/:id
Authorization: Bearer <token>
Content-Type: application/json

{ "category", "severity", "estimatedCost", "notes" }
```

#### Delete Finding
```http
DELETE /api/findings/:id
Authorization: Bearer <token>
```

### Real-time Events (SSE)

```http
GET /api/events

Server-Sent Events stream for repair plan notifications.

Events:
- "ping": Initial connection test
- "plan": Repair plan generated
  {
    "inspectionId": "clxxxx",
    "at": "2024-01-15T10:30:00.000Z"
  }
```

## GraphQL

### Endpoint
```http
POST /graphql
Authorization: Bearer <token>
Content-Type: application/json
```

### Query - Get Inspection
```graphql
query GetInspection($id: ID!) {
  inspection(id: $id) {
    id
    date
    inspectorName
    dataSource
    turbine {
      id
      name
      manufacturer
      mwRating
    }
    findings {
      id
      category
      severity
      estimatedCost
      notes
    }
    repairPlan {
      id
      priority
      totalEstimatedCost
      createdAt
    }
  }
}

Variables:
{ "id": "clxxxx" }
```

### Query - Get Repairs Plan
```graphql
query GetRepairPlan($inspectionId: ID!) {
  repairPlan(inspectionId: $inspectionId) {
    id
    priority
    totalEstimatedCost
    createdAt
  }
}

Variables:
{ "inspectionId": "clxxxx" }
```

### Mutation - Generate Repair Plan
```graphql
mutation GenerateRepairPlan($inspectionId: ID!) {
  generateRepairPlan(inspectionId: $inspectionId) {
    id
    priority
    totalEstimatedCost
    createdAt
  }
}

Variables:
{ "inspectionId": "clxxxx" }

Business Logic:
- Applies severity rule (BLADE_DAMAGE + "crack" → min severity 4)
- Calculates total cost from all findings
- Derives priority: HIGH (≥5), MEDIUM (3-4), LOW (<3)
- Emits SSE notification
```
## Error Responses

```json
{
  "error": "Bad Request | Unauthorized | Forbidden | Not Found | Conflict",
  "message": "Detailed error message"
}
```

## Interactive API Docs

- **Swagger UI**: http://localhost:4000/api/docs
- **GraphQL Playground**: http://localhost:4000/graphql
