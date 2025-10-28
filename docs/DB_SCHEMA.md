# Database Schema

## PostgreSQL (Prisma ORM)

### Entity Relationships

```
Turbine (1) ────────< Inspection (N) ────────< Finding (N)
                              │
                              └──────< RepairPlan (1:1)

User (seeded for authentication)
```

### Models

**User**
```prisma
model User {
  id           String  @id @default(cuid())
  email        String  @unique
  name         String
  role         Role
  passwordHash String
}

enum Role { ADMIN, ENGINEER, VIEWER }
```

**Turbine**
```prisma
model Turbine {
  id           String   @id @default(cuid())
  name         String
  manufacturer String?
  mwRating     Float?
  lat          Float?
  lng          Float?
  inspections  Inspection[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Inspection**
```prisma
model Inspection {
  id            String   @id @default(cuid())
  date          DateTime
  inspectorName String?
  dataSource    DataSource
  rawPackageUrl String?
  turbineId     String
  turbine       Turbine  @relation(fields: [turbineId], references: [id])
  findings      Finding[]
  repairPlan    RepairPlan?
  createdAt     DateTime @default(now())
  
  @@index([turbineId, date])  // Overlap prevention
}

enum DataSource { DRONE, MANUAL }
```

**Finding**
```prisma
model Finding {
  id            String         @id @default(cuid())
  category      FindingCategory
  severity      Int
  estimatedCost Float
  notes         String?
  inspectionId  String
  inspection    Inspection     @relation(fields: [inspectionId], references: [id])
  createdAt     DateTime       @default(now())
  
  @@index([inspectionId])
}

enum FindingCategory { BLADE_DAMAGE, LIGHTNING, EROSION, UNKNOWN }
```

**RepairPlan**
```prisma
model RepairPlan {
  id                 String    @id @default(cuid())
  inspectionId       String    @unique
  inspection         Inspection @relation(fields: [inspectionId], references: [id])
  priority           Priority
  totalEstimatedCost Float
  snapshotJson       Json      // Snapshot of findings at generation time
  createdAt          DateTime  @default(now())
}

enum Priority { LOW, MEDIUM, HIGH }
```

### Indexes

- **Inspection**: `(turbineId, date)` - Composite index for overlap prevention queries
- **Finding**: `(inspectionId)` - Fast lookup of findings per inspection

### Constraints

- **Foreign Keys**: Cascade relationships maintained by Prisma
- **Unique**: One repair plan per inspection
- **Required Fields**: turbineId, date (inspection), inspectionId (finding)

## MongoDB (NoSQL Logs)

Collection: `ingestion_logs`

Logs repair plan generation events:
```json
{
  "kind": "PLAN_GENERATED",
  "inspectionId": "clxxxx",
  "at": ISODate("2024-01-15T10:30:00Z"),
  "total": 15000,
  "priority": "HIGH"
}
```

## Seed Data

Users (bcrypt hashed):
- `admin@example.com` / `admin123` (ADMIN)
- `eng@example.com` / `engineer123` (ENGINEER)
- `viewer@example.com` / `viewer123` (VIEWER)
