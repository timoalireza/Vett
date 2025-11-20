# Production Database Setup Guide

## Overview

This guide helps you set up a production PostgreSQL database for Vett. Choose a provider based on your needs and budget.

## 🎯 Recommended Providers

### Option 1: Supabase (Recommended for Startups)
- **Pros:** Easy setup, built-in backups, pgvector support, good pricing
- **Cons:** Free tier has project pausing (not suitable for production)
- **Best for:** Production with Pro plan ($25/month) - See `SUPABASE_PRICING_RECOMMENDATION.md`
- **Note:** Free tier OK for staging/testing, but **Pro plan required for production**

### Option 2: AWS RDS PostgreSQL
- **Pros:** Enterprise-grade, scalable, full control
- **Cons:** More complex setup, higher cost
- **Best for:** Production at scale

### Option 3: Railway
- **Pros:** Simple setup, good pricing, automatic backups
- **Cons:** Less control than AWS
- **Best for:** Quick deployment

### Option 4: Neon (Serverless PostgreSQL)
- **Pros:** Serverless, auto-scaling, pgvector support
- **Cons:** Newer service
- **Best for:** Variable traffic

---

## 🚀 Quick Setup: Supabase (Recommended)

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - **Name:** Vett Production
   - **Database Password:** Generate strong password (save it!)
   - **Region:** Choose closest to your users
   - **Pricing Plan:** **Pro Plan ($25/month) recommended for production**
     - ⚠️ Free tier pauses after 1 week inactivity (not suitable for production)
     - See `SUPABASE_PRICING_RECOMMENDATION.md` for detailed comparison

### Step 2: Get Connection String

1. Go to **Settings** → **Database**
2. Find **Connection string** section
3. Copy **URI** connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
4. Update `.env`:
   ```bash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### Step 3: Enable pgvector Extension

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 4: Run Migrations

```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres"

# Run migrations
pnpm --filter vett-api db:migrate
```

### Step 5: Verify Setup

```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Should see: analyses, subscriptions, user_usage, users, etc.

-- Check indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';

-- Should see 13 indexes
```

### Step 6: Configure Backups

Supabase automatically backs up:
- **Free tier:** Daily backups (7-day retention)
- **Pro tier:** Point-in-time recovery (7-day retention)
- **Team tier:** Point-in-time recovery (30-day retention)

No additional setup needed!

---

## 🏢 Enterprise Setup: AWS RDS PostgreSQL

### Step 1: Create RDS Instance

1. Go to AWS Console → RDS
2. Click "Create database"
3. Choose:
   - **Engine:** PostgreSQL 16
   - **Template:** Production (or Dev/Test for staging)
   - **DB instance identifier:** `vett-production`
   - **Master username:** `postgres` (or custom)
   - **Master password:** Generate strong password
   - **DB instance class:** `db.t3.micro` (free tier) or `db.t3.small` (recommended)
   - **Storage:** 20GB (minimum)
   - **VPC:** Default or create new
   - **Public access:** Yes (or configure VPC peering)
   - **Security group:** Create new or use existing

4. Click "Create database"

### Step 2: Configure Security Group

1. Go to **Security Groups**
2. Edit inbound rules:
   - **Type:** PostgreSQL
   - **Port:** 5432
   - **Source:** Your IP or 0.0.0.0/0 (for now, restrict later)

### Step 3: Get Connection String

1. Go to RDS → Databases → Your instance
2. Find **Endpoint** (e.g., `vett-production.xxxxx.us-east-1.rds.amazonaws.com`)
3. Connection string:
   ```
   postgresql://postgres:[PASSWORD]@vett-production.xxxxx.us-east-1.rds.amazonaws.com:5432/vett
   ```

### Step 4: Create Database

```bash
# Connect to RDS instance
psql -h vett-production.xxxxx.us-east-1.rds.amazonaws.com -U postgres

# Create database
CREATE DATABASE vett;
\q
```

### Step 5: Enable pgvector Extension

```sql
-- Connect to vett database
psql -h vett-production.xxxxx.us-east-1.rds.amazonaws.com -U postgres -d vett

-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 6: Run Migrations

```bash
export DATABASE_URL="postgresql://postgres:[PASSWORD]@vett-production.xxxxx.us-east-1.rds.amazonaws.com:5432/vett"
pnpm --filter vett-api db:migrate
```

### Step 7: Configure Backups

1. Go to RDS → Databases → Your instance → **Maintenance & backups**
2. Configure:
   - **Automated backups:** Enabled
   - **Backup retention period:** 7 days (minimum), 30 days (recommended)
   - **Backup window:** Off-peak hours
   - **Copy tags to snapshots:** Enabled

### Step 8: Set Up Connection Pooling

**Option A: Use RDS Proxy (Recommended)**
1. Create RDS Proxy
2. Configure target: Your RDS instance
3. Use proxy endpoint instead of direct endpoint

**Option B: Use PgBouncer**
- Install PgBouncer on EC2
- Configure connection pooling
- Use PgBouncer endpoint

---

## 🚂 Quick Setup: Railway

### Step 1: Create Railway Project

1. Go to https://railway.app
2. Sign up / Log in
3. Click "New Project"
4. Select "Provision PostgreSQL"

### Step 2: Get Connection String

1. Click on PostgreSQL service
2. Go to **Variables** tab
3. Copy `DATABASE_URL`
4. Use directly in your `.env`

### Step 3: Run Migrations

```bash
# Railway provides DATABASE_URL automatically
pnpm --filter vett-api db:migrate
```

### Step 4: Enable pgvector

Railway PostgreSQL includes pgvector by default. Just run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 5: Configure Backups

Railway automatically backs up:
- Daily backups included
- 7-day retention
- Upgrade for longer retention

---

## 🔧 Database Configuration

### Connection Pooling

Update `apps/api/src/db/client.ts`:

```typescript
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../env.js";
import * as schema from "./schema.js";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Connection pool settings
  max: 20, // Maximum connections in pool
  min: 5, // Minimum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s
});

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected database pool error", err);
  process.exit(-1);
});

export const db = drizzle(pool, { schema });
```

### Environment Variables

Add to production `.env`:

```bash
# Production Database
DATABASE_URL=postgresql://user:pass@host:5432/vett

# Connection pool settings (optional)
DB_POOL_MAX=20
DB_POOL_MIN=5
```

---

## 🔒 Security Checklist

- [ ] Strong database password (20+ characters, random)
- [ ] Database not publicly accessible (use VPC/private network)
- [ ] SSL/TLS enabled for connections
- [ ] Regular security updates enabled
- [ ] Database firewall configured
- [ ] Access restricted to application servers only
- [ ] Credentials stored in secrets manager (not code)

---

## 📊 Monitoring Setup

### Key Metrics to Monitor

1. **Connection Pool**
   - Active connections
   - Idle connections
   - Connection wait time

2. **Query Performance**
   - Slow queries (>1s)
   - Query frequency
   - Index usage

3. **Database Health**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Disk space

4. **Replication** (if using)
   - Replication lag
   - Replica health

### Set Up Alerts

Configure alerts for:
- Connection pool exhaustion
- Slow queries (>2s)
- High CPU (>80%)
- Low disk space (<20%)
- Database errors

---

## 🔄 Backup & Recovery

### Automated Backups

Most providers include automated backups:
- **Supabase:** Daily (free), PITR (paid)
- **AWS RDS:** Configurable (7-35 days)
- **Railway:** Daily (7-day retention)

### Manual Backup

```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore backup
psql $DATABASE_URL < backup_20250101.sql
```

### Backup Testing

**Monthly:** Test restore process:
1. Create test database
2. Restore backup
3. Verify data integrity
4. Document restore time

---

## 🚀 Performance Optimization

### After Migration

1. **Analyze Tables**
   ```sql
   ANALYZE;
   ```

2. **Check Index Usage**
   ```sql
   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes
   ORDER BY idx_scan DESC;
   ```

3. **Monitor Slow Queries**
   ```sql
   -- Enable query logging in postgresql.conf
   log_min_duration_statement = 1000  -- Log queries > 1s
   ```

4. **Review Query Plans**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM analyses WHERE user_id = 'xxx' ORDER BY created_at DESC LIMIT 10;
   ```

---

## 📋 Production Database Checklist

- [ ] Database instance created
- [ ] Strong password set
- [ ] Connection string configured
- [ ] pgvector extension enabled
- [ ] Migrations run successfully
- [ ] Indexes created and verified
- [ ] Connection pooling configured
- [ ] Backups enabled and tested
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Security group/firewall configured
- [ ] SSL/TLS enabled
- [ ] Performance baseline established

---

## 🆘 Troubleshooting

### Connection Issues

**Error: "Connection refused"**
- Check security group/firewall rules
- Verify endpoint/hostname
- Check database is running

**Error: "Authentication failed"**
- Verify username/password
- Check user permissions
- Verify database name

### Performance Issues

**Slow queries:**
- Check indexes are being used (`EXPLAIN ANALYZE`)
- Review query plans
- Consider additional indexes

**Connection pool exhaustion:**
- Increase pool size
- Check for connection leaks
- Use connection pooling service

---

## 📚 Next Steps

1. [ ] Set up production database
2. [ ] Run migrations
3. [ ] Configure connection pooling
4. [ ] Set up monitoring
5. [ ] Test backups
6. [ ] Document connection details securely

---

**Provider Recommendations:**
- **Startup/MVP:** Supabase (easiest, free tier)
- **Growing:** Railway (simple, good pricing)
- **Enterprise:** AWS RDS (full control, scalable)

