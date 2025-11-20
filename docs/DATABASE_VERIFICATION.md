# Database Verification Checklist

After setting up your production database, verify everything is working correctly.

## ✅ Post-Migration Verification

### 1. Verify Tables Exist

```sql
-- List all tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Expected tables:
-- analyses
-- analysis_attachments
-- analysis_sources
-- claims
-- collection_items
-- collections
-- explanation_steps
-- feedback
-- sources
-- subscriptions
-- user_usage
-- users
```

### 2. Verify Indexes Exist

```sql
-- List all indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Expected indexes:
-- idx_analyses_created_at
-- idx_analyses_status
-- idx_analyses_user_created
-- idx_analyses_user_id
-- idx_analysis_sources_analysis_id
-- idx_claims_analysis_id
-- idx_collection_items_collection_id
-- idx_collections_user_id
-- idx_explanation_steps_analysis_id
-- idx_feedback_analysis_id
-- idx_subscriptions_user_id
-- idx_user_usage_user_id
-- idx_users_external_id
```

### 3. Verify Enums Exist

```sql
-- Check subscription enums
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'subscription_plan'::regtype;
-- Should return: FREE, PLUS, PRO

SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'subscription_status'::regtype;
-- Should return: ACTIVE, CANCELLED, PAST_DUE, TRIALING

SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'billing_cycle'::regtype;
-- Should return: MONTHLY, ANNUAL
```

### 4. Test Queries

```sql
-- Test user lookup (should use index)
EXPLAIN ANALYZE
SELECT * FROM users WHERE external_id = 'test-id';

-- Should show: "Index Scan using idx_users_external_id"

-- Test user's analyses (should use composite index)
EXPLAIN ANALYZE
SELECT * FROM analyses 
WHERE user_id = (SELECT id FROM users LIMIT 1)
ORDER BY created_at DESC 
LIMIT 10;

-- Should show: "Index Scan using idx_analyses_user_created"

-- Test worker query (should use status index)
EXPLAIN ANALYZE
SELECT * FROM analyses 
WHERE status = 'QUEUED' 
LIMIT 10;

-- Should show: "Index Scan using idx_analyses_status"
```

### 5. Verify Constraints

```sql
-- Check foreign keys
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- Verify unique constraints
SELECT conname, conrelid::regclass 
FROM pg_constraint 
WHERE contype = 'u';

-- Should include:
-- users_external_id_unique
-- subscriptions_user_id_unique
-- user_usage_user_id_unique
```

### 6. Test Connection Pooling

```bash
# Test from your application
curl http://localhost:4000/health

# Check database connections
# (provider-specific, e.g., Supabase dashboard or AWS CloudWatch)
```

### 7. Verify pgvector Extension (Optional)

```sql
-- Check if pgvector is installed
SELECT * FROM pg_extension WHERE extname = 'vector';

-- If not installed:
CREATE EXTENSION IF NOT EXISTS vector;
```

## 🔍 Performance Checks

### Check Index Usage

```sql
-- See which indexes are being used
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Check Table Sizes

```sql
-- See table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Slow Queries

Enable slow query logging in `postgresql.conf`:
```
log_min_duration_statement = 1000  # Log queries > 1s
```

## ✅ Verification Checklist

- [ ] All tables exist (12 tables)
- [ ] All indexes exist (13 indexes)
- [ ] All enums exist (3 enums)
- [ ] Foreign keys configured correctly
- [ ] Unique constraints in place
- [ ] Test queries use indexes
- [ ] Connection pooling works
- [ ] pgvector extension enabled (if needed)
- [ ] Database accessible from application
- [ ] Performance is acceptable

## 🚨 Common Issues

### Issue: Indexes not being used

**Solution:**
```sql
-- Update table statistics
ANALYZE;

-- Check if index is actually faster
EXPLAIN ANALYZE SELECT ...;
```

### Issue: Connection pool errors

**Solution:**
- Increase pool size
- Check for connection leaks
- Verify database can handle connections

### Issue: Slow queries

**Solution:**
- Check if indexes are being used
- Review query plans
- Consider additional indexes
- Optimize queries

