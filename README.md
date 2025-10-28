# TurbineOps Lite

[<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />](https://nodejs.org/en/)  [<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />](https://reactjs.org/) [<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />](https://typescriptlang.org)  [<img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />](https://expressjs.com/) ![GraphQL](https://img.shields.io/badge/-GraphQL-E10098?style=for-the-badge&logo=graphql&logoColor=white) ![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white) ![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens) ![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white) [<img src="https://img.shields.io/badge/Jest-323330?style=for-the-badge&logo=Jest&logoColor=white" />](https://jestjs.io/) [<img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=Vitest&logoColor=white" />](https://vitest.dev/)

Full-stack turbine inspection and repair plan management system with REST + GraphQL APIs, real-time notifications, and comprehensive testing (177+ tests).

## Pre-requisites

- Node.js 20+ LTS
- Docker & Docker Compose

## Getting Started

### Option 1: Docker

```bash
# Start all services
docker compose up -d

# Setup database
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```

Access:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000/api
- **GraphQL**: http://localhost:4000/graphql
- **API Docs**: http://localhost:4000/api/docs

### Option 2: Local Development

```bash
# Start databases only
make dev-up

# Setup
make migrate
make seed

# Run
make backend    # http://localhost:4000
make frontend   # http://localhost:5173
```

## Login Credentials

- **Admin**: `admin@example.com` / `admin123`
- **Engineer**: `eng@example.com` / `engineer123`
- **Viewer**: `viewer@example.com` / `viewer123`

## Design Decisions

### Architecture
- **Hybrid API**: REST for CRUD, GraphQL for complex queries
- **Dual Database**: PostgreSQL (primary) via Prisma ORM, MongoDB (logs)
- **Real-time**: SSE for repair plan notifications

### Business Rules
- **Inspection Overlap**: Prevents duplicate inspections on same turbine/date
- **Severity Rule**: BLADE_DAMAGE + "crack" → minimum severity 4
- **Priority Logic**: HIGH (≥5), MEDIUM (3-4), LOW (<3)

### Testing & Security
- **177+ Tests**: 150 backend (Jest), 27 frontend (Vitest)
- **JWT + RBAC**: ADMIN, ENGINEER, VIEWER roles
- **CI/CD**: Automated testing via GitHub Actions

## Documentation

- `docs/ARCHITECTURE.md` - System design
- `docs/INSTALL.md` - Detailed setup
- `docs/TESTING.md` - Test coverage
- `backend/openapi.yaml` - REST API spec
- `backend/src/graphql/schema.graphql` - GraphQL schema
