# Test Setup Guide

## Quick Setup

### 1. Create Test Database

```bash
# Create test database
createdb vett_test

# Or if using Docker
docker exec -it vett-db-1 createdb -U postgres vett_test
```

### 2. Run Migrations on Test Database

```bash
# Set test database URL
export TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vett_test

# Run migrations
cd apps/api
DATABASE_URL=$TEST_DATABASE_URL pnpm db:migrate
```

Or manually run migrations:

```bash
psql $TEST_DATABASE_URL -f ../../scripts/run-migrations-to-supabase.sql
```

### 3. Run Tests

```bash
pnpm --filter vett-api test
```

---

## Test Database Setup

### Option 1: Separate Test Database (Recommended)

```bash
# Create test database
createdb vett_test

# Set in .env.test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vett_test
```

### Option 2: Use Same Database (Not Recommended)

Tests will clean up data, but there's risk of conflicts:

```bash
# In .env.test, use same database
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vett
```

---

## Troubleshooting

### Error: "database vett_test does not exist"

**Solution:**
```bash
createdb vett_test
```

### Error: "Sentry.configureScope is not a function"

**Solution:** Already fixed - Sentry is mocked in test setup.

### Tests hanging or timing out

**Solution:**
1. Check database connection
2. Check Redis connection
3. Increase timeout in `vitest.config.ts`

---

## Test Environment Variables

Create `.env.test` file:

```bash
NODE_ENV=test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vett_test
TEST_REDIS_URL=redis://localhost:6379/1
TEST_CLERK_SECRET_KEY=sk_test_mock_key_for_testing
LOG_LEVEL=silent
```

---

## Next Steps

1. ✅ Create test database
2. ✅ Run migrations
3. ✅ Run tests
4. ✅ Write more tests

