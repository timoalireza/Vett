# Production Database Quick Start

**Choose your provider and follow the steps:**

## 🚀 Supabase (Recommended - Easiest)

```bash
# 1. Create project at https://supabase.com
#    ⚠️ IMPORTANT: Choose Pro Plan ($25/month) for production
#    Free tier pauses after 1 week inactivity (not suitable for production)
# 2. Get connection string from Settings → Database
# 3. Enable pgvector extension in SQL Editor:
CREATE EXTENSION IF NOT EXISTS vector;

# 4. Set DATABASE_URL and run migrations
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
pnpm --filter vett-api db:migrate

# 5. Verify
psql $DATABASE_URL -c "\dt"
```

**Time:** 5 minutes  
**Cost:** $25/month (Pro Plan) - See `SUPABASE_PRICING_RECOMMENDATION.md` for details

---

## 🏢 AWS RDS

```bash
# 1. Create RDS PostgreSQL instance in AWS Console
# 2. Configure security group (allow port 5432)
# 3. Create database:
psql -h [endpoint] -U postgres
CREATE DATABASE vett;
\q

# 4. Enable pgvector:
psql -h [endpoint] -U postgres -d vett
CREATE EXTENSION IF NOT EXISTS vector;

# 5. Run migrations
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[endpoint]:5432/vett"
pnpm --filter vett-api db:migrate
```

**Time:** 15-20 minutes  
**Cost:** ~$15-30/month (db.t3.small)

---

## 🚂 Railway

```bash
# 1. Create project at https://railway.app
# 2. Add PostgreSQL service
# 3. Copy DATABASE_URL from Variables tab
# 4. Enable pgvector (already included):
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 5. Run migrations
pnpm --filter vett-api db:migrate
```

**Time:** 3 minutes  
**Cost:** ~$5-20/month

---

## ✅ Verification

After setup, verify everything works:

```bash
# Check tables exist
psql $DATABASE_URL -c "\dt"

# Check indexes exist
psql $DATABASE_URL -c "\di idx_*"

# Test connection from app
curl http://localhost:4000/health
```

See `docs/DATABASE_VERIFICATION.md` for detailed checks.

---

## 📋 Next Steps

1. ✅ Set up production database
2. ✅ Run migrations
3. ✅ Verify setup
4. [ ] Configure backups (usually automatic)
5. [ ] Set up monitoring
6. [ ] Test connection pooling

---

**Need help?** See `docs/PRODUCTION_DATABASE_SETUP.md` for detailed instructions.

