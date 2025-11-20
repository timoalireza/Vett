# Database Migration Instructions

## Quick Start

### Step 1: Review Migrations

Two migrations are ready to apply:

1. **0002_watery_corsair.sql** - Creates subscription tables
2. **0003_add_indexes.sql** - Creates performance indexes

### Step 2: Run Migrations

**Option A: Using Drizzle CLI (Recommended)**
```bash
# Make sure DATABASE_URL is set in your environment
export DATABASE_URL="postgresql://user:pass@localhost:5432/vett"

# Run migrations
pnpm --filter vett-api db:migrate

# When prompted, type "Yes" to confirm
```

**Option B: Manual SQL Execution**
```bash
# Connect to database
psql $DATABASE_URL

# Or if using docker-compose
docker exec -i vett-db-1 psql -U postgres -d vett < apps/api/drizzle/0002_watery_corsair.sql
docker exec -i vett-db-1 psql -U postgres -d vett < apps/api/drizzle/0003_add_indexes.sql
```

### Step 3: Verify

```sql
-- Check tables exist
\dt subscriptions
\dt user_usage

-- Check indexes
\di idx_*

-- Test a query
EXPLAIN ANALYZE SELECT * FROM analyses WHERE user_id IS NOT NULL LIMIT 1;
```

## Migration Details

### Migration 0002: Subscriptions

**Creates:**
- `subscriptions` table
- `user_usage` table  
- 3 enums: `subscription_plan`, `subscription_status`, `billing_cycle`

**Impact:** 
- No data loss (new tables only)
- ~2KB per user
- Safe to run anytime

### Migration 0003: Indexes

**Creates:** 13 performance indexes

**Impact:**
- Improves query performance significantly
- May take time on large tables
- Safe to run anytime (indexes don't affect data)

## Production Checklist

Before running in production:

- [ ] Backup database
- [ ] Test on staging first
- [ ] Schedule maintenance window (if needed)
- [ ] Verify DATABASE_URL is correct
- [ ] Run migrations
- [ ] Verify tables/indexes created
- [ ] Test critical queries
- [ ] Monitor performance

## Troubleshooting

**Migration fails:** Check database connection and permissions

**Index creation slow:** Normal for large tables, wait for completion

**Tables already exist:** Migrations use `IF NOT EXISTS`, safe to re-run

