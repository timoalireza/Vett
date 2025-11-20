# Database Migrations Guide

## ✅ Migration Files Created

### Migration 0002: Subscriptions & Usage Tables
**File:** `apps/api/drizzle/0002_watery_corsair.sql`

**Creates:**
- `subscriptions` table (plan, status, billing cycle)
- `user_usage` table (usage tracking)
- Enums: `subscription_plan`, `subscription_status`, `billing_cycle`
- Foreign keys and constraints

### Migration 0003: Performance Indexes
**File:** `apps/api/drizzle/0003_add_indexes.sql`

**Creates indexes for:**
- `users.external_id` - Fast Clerk ID lookups
- `analyses.user_id` - User's analysis queries
- `analyses.status` - Worker status queries
- `analyses.created_at` - Sorting and history
- `analyses(user_id, created_at)` - Composite for user history
- `collections.user_id` - User's collections
- `claims.analysis_id` - Analysis detail queries
- `analysis_sources.analysis_id` - Analysis detail queries
- `explanation_steps.analysis_id` - Analysis detail queries
- `feedback.analysis_id` - Feedback queries
- `collection_items.collection_id` - Collection detail queries
- `subscriptions.user_id` - Subscription lookups
- `user_usage.user_id` - Usage lookups

## 🚀 Running Migrations

### Local Development

```bash
# Apply migrations to local database
pnpm --filter vett-api db:migrate

# The command will show you what will be executed
# Type "Yes" to confirm
```

### Production

**Option 1: Using Drizzle CLI**
```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://user:pass@prod-db:5432/vett"

# Run migrations
pnpm --filter vett-api db:migrate
```

**Option 2: Manual SQL Execution**
```bash
# Copy migration files to production server
# Execute manually:
psql $DATABASE_URL -f apps/api/drizzle/0002_watery_corsair.sql
psql $DATABASE_URL -f apps/api/drizzle/0003_add_indexes.sql
```

**Option 3: Using Migration Tool**
- Use your deployment tool's migration runner
- Or execute via database admin panel

## 📋 Migration Checklist

### Before Running Migrations

- [ ] Backup production database
- [ ] Test migrations on staging database first
- [ ] Review migration SQL files
- [ ] Ensure database has sufficient disk space
- [ ] Schedule maintenance window if needed

### Running Migrations

- [ ] Run migration 0002 (subscriptions tables)
- [ ] Verify tables created successfully
- [ ] Run migration 0003 (indexes)
- [ ] Verify indexes created successfully
- [ ] Test queries to ensure indexes work

### After Migrations

- [ ] Verify all tables exist
- [ ] Verify all indexes exist
- [ ] Test critical queries
- [ ] Monitor query performance
- [ ] Check database size increase

## 🔍 Verifying Migrations

### Check Tables Exist

```sql
-- Check subscriptions table
SELECT * FROM subscriptions LIMIT 1;

-- Check user_usage table
SELECT * FROM user_usage LIMIT 1;

-- Check enums
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'subscription_plan'::regtype;
```

### Check Indexes Exist

```sql
-- List all indexes
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Verify specific indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'analyses' AND indexname LIKE 'idx_%';
```

### Test Query Performance

```sql
-- Test user analysis query (should use index)
EXPLAIN ANALYZE
SELECT * FROM analyses 
WHERE user_id = 'some-uuid' 
ORDER BY created_at DESC 
LIMIT 10;

-- Should show "Index Scan using idx_analyses_user_created"
```

## ⚠️ Rollback Instructions

If you need to rollback migrations:

### Rollback Migration 0003 (Indexes)

```sql
-- Drop indexes (safe, doesn't affect data)
DROP INDEX IF EXISTS idx_users_external_id;
DROP INDEX IF EXISTS idx_analyses_user_id;
DROP INDEX IF EXISTS idx_analyses_status;
DROP INDEX IF EXISTS idx_analyses_created_at;
DROP INDEX IF EXISTS idx_analyses_user_created;
DROP INDEX IF EXISTS idx_collections_user_id;
DROP INDEX IF EXISTS idx_claims_analysis_id;
DROP INDEX IF EXISTS idx_analysis_sources_analysis_id;
DROP INDEX IF EXISTS idx_explanation_steps_analysis_id;
DROP INDEX IF EXISTS idx_feedback_analysis_id;
DROP INDEX IF EXISTS idx_collection_items_collection_id;
DROP INDEX IF EXISTS idx_subscriptions_user_id;
DROP INDEX IF EXISTS idx_user_usage_user_id;
```

### Rollback Migration 0002 (Subscriptions)

**⚠️ WARNING: This will delete subscription and usage data!**

```sql
-- Drop tables (cascade will handle foreign keys)
DROP TABLE IF EXISTS user_usage CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

-- Drop enums
DROP TYPE IF EXISTS billing_cycle;
DROP TYPE IF EXISTS subscription_status;
DROP TYPE IF EXISTS subscription_plan;
```

## 📊 Expected Database Size

After migrations:
- **Subscriptions table**: ~1KB per user
- **User usage table**: ~1KB per user
- **Indexes**: ~10-50MB depending on data volume

## 🔄 Migration Best Practices

1. **Always backup first**
   ```bash
   pg_dump $DATABASE_URL > backup_before_migration.sql
   ```

2. **Test on staging first**
   - Run migrations on staging database
   - Verify everything works
   - Then run on production

3. **Monitor during migration**
   - Watch for locks
   - Monitor query performance
   - Check error logs

4. **Verify after migration**
   - Check table counts
   - Test critical queries
   - Verify indexes are used

## 🚨 Troubleshooting

### Issue: Migration fails with "relation already exists"

**Solution:** Tables may already exist. Check with:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### Issue: Index creation is slow

**Solution:** 
- Indexes are created in background
- Large tables may take time
- Consider creating indexes concurrently:
  ```sql
  CREATE INDEX CONCURRENTLY idx_analyses_user_id ON analyses(user_id);
  ```

### Issue: Foreign key constraint fails

**Solution:** Ensure referenced tables exist:
```sql
-- Check users table exists
SELECT COUNT(*) FROM users;
```

## 📝 Next Steps

After migrations:
1. [ ] Set up production database
2. [ ] Run migrations on production
3. [ ] Verify indexes improve query performance
4. [ ] Set up automated backups
5. [ ] Monitor database performance

