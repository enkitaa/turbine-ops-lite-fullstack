# Installation Guide

## Prerequisites

- **Node.js** 20+ LTS
- **Docker** & Docker Compose
- **npm** 9+

## Installation Steps

### Clone Repository

```bash
git clone <repository-url>
cd turbine-ops-lite-fullstack
```

### Option 1: Docker (Production-like)

Start all services:

```bash
docker compose up -d
```

Setup database:

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- API Docs: http://localhost:4000/api/docs
- GraphQL: http://localhost:4000/graphql

### Option 2: Local Development

#### 1. Start Databases

```bash
make dev-up
# Or manually:
docker compose up -d postgres mongo
```

Wait for databases to be healthy (~10-15 seconds).

#### 2. Setup Backend

```bash
cd backend
npm install

# Configure environment
cp .env.example .env  # Update DATABASE_URL if needed

# Generate Prisma client and run migrations
npm run prisma:generate
npm run prisma:migrate

# Seed database
npm run seed

# Start development server
npm run dev
```

Backend will run on http://localhost:4000

#### 3. Setup Frontend

```bash
cd frontend
npm install

# Configure environment
cp .env.example .env  # Update VITE_API_BASE if needed

# Start development server
npm run dev
```

Frontend will run on http://localhost:5173

### Makefile Shortcuts

```bash
make dev-up      # Start postgres + mongo
make dev-down    # Stop all docker services
make migrate     # Run Prisma migrations
make seed        # Seed database
make backend     # Install + run backend dev server
make frontend    # Install + run frontend dev server
make test        # Run all tests
```

## Environment Variables

### Backend (.env)

```bash
DATABASE_URL=postgresql://app:app@localhost:5432/turbineops
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
MONGO_URL=mongodb://localhost:27017
MONGO_DB=turbineops
PORT=4000
```

### Frontend (.env)

```bash
VITE_API_BASE=http://localhost:4000
```

## Database Setup

### Manual Setup (without docker-compose)

**PostgreSQL:**
```bash
# Create database
createdb turbineops

# Or with psql
psql -U postgres
CREATE DATABASE turbineops;
```

**MongoDB:**
```bash
# Start MongoDB
mongod

# Or with Docker
docker run -d -p 27017:27017 mongo:7
```

## Verify Installation

### Test Backend

```bash
cd backend
npm test
```

### Test Frontend

```bash
cd frontend
npm test
```

### Manual Check

1. Visit http://localhost:4000/api/docs - Swagger UI should load
2. Visit http://localhost:3000 (or 5173) - Login page should appear
3. Login with: `admin@example.com` / `admin123`

## Troubleshooting

### Port Already in Use

```bash
# Change ports in docker-compose.yml or .env
PORT=4001  # Backend
VITE_API_BASE=http://localhost:4001
```

### Prisma Migration Errors

```bash
cd backend
npm run prisma:migrate reset
npm run seed
```

### Docker Issues

```bash
# Stop and restart
docker compose down
docker compose up -d

# Rebuild containers
docker compose up -d --build
```

## Seed Data

Pre-configured users:
- **Admin**: `admin@example.com` / `admin123`
- **Engineer**: `eng@example.com` / `engineer123`
- **Viewer**: `viewer@example.com` / `viewer123`

Sample turbines and inspections are created during seed.
