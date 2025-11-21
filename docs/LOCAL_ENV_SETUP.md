# Local Environment Setup

**Error:** `Invalid environment configuration: { DATABASE_URL: [ 'Required' ], REDIS_URL: [ 'Required' ], CLERK_SECRET_KEY: [ 'Required' ] }`

## Quick Fix

You need to create/update `.env` file in `apps/api/` directory.

### Step 1: Copy Example File

```bash
cd apps/api
cp env.example .env
```

### Step 2: Update Required Variables

Edit `apps/api/.env` and set these required values:

```bash
# Database (use local PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vett

# Redis (use local Redis)
REDIS_URL=redis://localhost:6379

# Clerk (get from https://dashboard.clerk.com)
CLERK_SECRET_KEY=sk_test_...  # Your Clerk secret key
```

### Step 3: Start Local Services

**Start PostgreSQL:**
```bash
brew services start postgresql@15
```

**Start Redis:**
```bash
# If using Docker
docker compose up -d redis

# Or if installed locally
redis-server
```

### Step 4: Verify Database Exists

```bash
# Check if database exists
/opt/homebrew/opt/postgresql@15/bin/psql -h localhost -l | grep vett

# If not, create it
createdb vett
```

### Step 5: Run Migrations

```bash
pnpm --filter vett-api db:migrate
```

### Step 6: Start API

```bash
pnpm dev:api
```

---

## Required Environment Variables

### Minimum Required (for API to start)

```bash
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vett
REDIS_URL=redis://localhost:6379
CLERK_SECRET_KEY=sk_test_...
```

### Optional (for full functionality)

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PINECONE_API_KEY=...
```

---

## Quick Setup Script

```bash
# 1. Copy example
cd apps/api
cp env.example .env

# 2. Edit .env and add:
#    - DATABASE_URL (local PostgreSQL)
#    - REDIS_URL (local Redis)
#    - CLERK_SECRET_KEY (from Clerk dashboard)

# 3. Start services
brew services start postgresql@15
docker compose up -d redis

# 4. Create database (if needed)
createdb vett

# 5. Run migrations
pnpm --filter vett-api db:migrate

# 6. Start API
pnpm dev:api
```

---

## Troubleshooting

### Database Connection Failed

**Check PostgreSQL is running:**
```bash
brew services list | grep postgresql
```

**Check database exists:**
```bash
psql -h localhost -l | grep vett
```

### Redis Connection Failed

**Check Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

**Or with Docker:**
```bash
docker compose ps | grep redis
```

### Clerk Key Invalid

**Get your Clerk secret key:**
1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to **API Keys**
4. Copy **Secret Key** (starts with `sk_test_` or `sk_live_`)

---

**After setting up `.env`, run `pnpm dev:api` again!**

