# Next Steps - Production Readiness

**Last Updated:** 2025-01-XX  
**Status:** Authentication ✅ | Subscriptions ✅ | Security Hardening ⏳

## ✅ Completed

1. **Authentication** - Clerk.dev integration complete
2. **Subscriptions** - Three-tier plan system implemented
3. **Database Schema** - Subscriptions and usage tracking tables created
4. **Clerk Connection** - Fixed and verified

---

## 🎯 Priority 1: Security Hardening (CRITICAL - Do This First)

### 1.1 Rate Limiting ⚠️ HIGH PRIORITY
**Why:** Prevents abuse and protects your API from DDoS

**Steps:**
```bash
pnpm --filter vett-api add @fastify/rate-limit
```

Then implement:
- [ ] Copy `apps/api/src/plugins/rate-limit.ts.example` to `rate-limit.ts`
- [ ] Register in `apps/api/src/index.ts`
- [ ] Configure limits:
  - GraphQL: 100 requests/15min per IP
  - File uploads: 5 requests/min per user
  - Health endpoints: 10 requests/min per IP

**Estimated Time:** 30 minutes

---

### 1.2 CORS Configuration ⚠️ HIGH PRIORITY
**Why:** Currently `origin: true` allows any origin - security risk

**Steps:**
- [ ] Update `apps/api/src/index.ts`:
  ```typescript
  await app.register(cors, {
    origin: env.NODE_ENV === "production" 
      ? ["https://yourdomain.com", "https://app.yourdomain.com"] 
      : true,
    credentials: true
  });
  ```
- [ ] Add `ALLOWED_ORIGINS` to `env.ts` for production

**Estimated Time:** 15 minutes

---

### 1.3 GraphQL Security ⚠️ MEDIUM PRIORITY
**Why:** Prevent expensive queries and abuse

**Steps:**
```bash
pnpm --filter vett-api add graphql-depth-limit
```

- [ ] Add query depth limiting (max depth: 10)
- [ ] Add query complexity analysis
- [ ] Update `apps/api/src/plugins/graphql.ts`

**Estimated Time:** 30 minutes

---

## 🎯 Priority 2: Database & Migrations

### 2.1 Run Migrations ⚠️ CRITICAL
**Why:** Subscriptions tables need to be created

**Steps:**
```bash
# Generate migration (already done)
# Apply migration
pnpm --filter vett-api db:migrate
```

**Estimated Time:** 5 minutes

---

### 2.2 Add Database Indexes ⚠️ HIGH PRIORITY
**Why:** Improve query performance

**Steps:**
- [ ] Create migration for indexes:
  ```sql
  CREATE INDEX idx_analyses_user_id ON analyses(user_id);
  CREATE INDEX idx_analyses_created_at ON analyses(created_at);
  CREATE INDEX idx_analyses_status ON analyses(status);
  CREATE INDEX idx_users_external_id ON users(external_id);
  CREATE INDEX idx_collections_user_id ON collections(user_id);
  ```

**Estimated Time:** 15 minutes

---

### 2.3 Set Up Production Database ⚠️ CRITICAL
**Why:** Need production database before launch

**Options:**
- AWS RDS PostgreSQL
- Supabase
- Railway
- Neon

**Steps:**
- [ ] Create production database
- [ ] Update `DATABASE_URL` in production env
- [ ] Run migrations on production
- [ ] Set up automated backups

**Estimated Time:** 1-2 hours

---

## 🎯 Priority 3: Error Handling & Monitoring

### 3.1 Error Tracking (Sentry) ⚠️ HIGH PRIORITY
**Why:** Need to catch and track errors in production

**Steps:**
```bash
pnpm --filter vett-api add @sentry/node
```

- [ ] Initialize Sentry in `apps/api/src/index.ts`
- [ ] Add error handlers
- [ ] Configure source maps for production

**Estimated Time:** 30 minutes

---

### 3.2 Enhanced Health Checks ⚠️ MEDIUM PRIORITY
**Why:** Already done, but verify it works

**Steps:**
- [ ] Test `/health` endpoint
- [ ] Test `/ready` endpoint (checks DB, Redis, Clerk)
- [ ] Test `/live` endpoint

**Estimated Time:** 10 minutes

---

### 3.3 Monitoring Setup ⚠️ HIGH PRIORITY
**Why:** Need visibility into production

**Options:**
- Datadog (recommended)
- New Relic
- AWS CloudWatch

**Steps:**
- [ ] Set up APM tool
- [ ] Configure dashboards
- [ ] Set up alerts:
  - API error rate > 5%
  - API latency p95 > 2s
  - Queue depth > 100
  - Database connection failures

**Estimated Time:** 2-3 hours

---

## 🎯 Priority 4: Testing

### 4.1 Write Critical Tests ⚠️ HIGH PRIORITY
**Why:** Catch bugs before production

**Focus Areas:**
- [ ] Authentication flow
- [ ] Subscription limits (FREE tier: 10 analyses)
- [ ] Analysis submission → result retrieval
- [ ] Watermark logic (FREE vs PLUS/PRO)

**Estimated Time:** 4-6 hours

---

## 🎯 Priority 5: CI/CD Pipeline

### 5.1 GitHub Actions ⚠️ HIGH PRIORITY
**Why:** Automate testing and deployment

**Steps:**
- [ ] Copy `.github/workflows/ci.yml.example` to `ci.yml`
- [ ] Set up workflow:
  - Lint check
  - Type checking
  - Tests
  - Build verification
- [ ] Test workflow

**Estimated Time:** 1-2 hours

---

### 5.2 Docker Setup ⚠️ HIGH PRIORITY
**Why:** Need containerized deployments

**Steps:**
- [ ] Copy `apps/api/Dockerfile.example` to `Dockerfile`
- [ ] Copy `apps/worker/Dockerfile.example` to `Dockerfile`
- [ ] Test builds locally:
  ```bash
  docker build -t vett-api -f apps/api/Dockerfile .
  docker build -t vett-worker -f apps/worker/Dockerfile .
  ```

**Estimated Time:** 1 hour

---

## 🎯 Priority 6: Mobile App Production

### 6.1 EAS Configuration ⚠️ HIGH PRIORITY
**Why:** Need to build and submit mobile apps

**Steps:**
```bash
cd apps/mobile
eas build:configure
```

- [ ] Create production build profiles
- [ ] Configure app signing
- [ ] Set up environment variables

**Estimated Time:** 1 hour

---

### 6.2 Update API URL ⚠️ CRITICAL
**Why:** Mobile app currently uses localhost

**Steps:**
- [ ] Update `apps/mobile/app.json` with production API URL
- [ ] Or use EAS environment variables
- [ ] Test API connection from mobile app

**Estimated Time:** 15 minutes

---

## 🎯 Priority 7: Compliance

### 7.1 GDPR Endpoints ⚠️ MEDIUM PRIORITY
**Why:** Legal requirement for EU users

**Steps:**
- [ ] Copy `apps/api/src/routes/gdpr.ts.example` to `gdpr.ts`
- [ ] Register routes in `apps/api/src/index.ts`
- [ ] Test data export
- [ ] Test data deletion

**Estimated Time:** 1 hour

---

### 7.2 Legal Documents ⚠️ MEDIUM PRIORITY
**Why:** Required for app stores

**Steps:**
- [ ] Create Privacy Policy
- [ ] Create Terms of Service
- [ ] Add acceptance flow in mobile app

**Estimated Time:** 2-4 hours (with legal review)

---

## 📅 Recommended Timeline

### This Week (Days 1-3)
1. **Day 1 Morning:** Rate Limiting + CORS (1.5 hours)
2. **Day 1 Afternoon:** Database migrations + indexes (1 hour)
3. **Day 2:** Error tracking + Monitoring setup (4 hours)
4. **Day 3:** CI/CD pipeline (3 hours)

### Next Week (Days 4-7)
5. **Day 4:** Critical tests (6 hours)
6. **Day 5:** Mobile app production config (2 hours)
7. **Day 6:** GDPR endpoints + Legal docs (4 hours)
8. **Day 7:** Final testing + Documentation (4 hours)

---

## 🚨 Critical Before Launch

1. ✅ Authentication working
2. ✅ Subscriptions implemented
3. ⏳ Rate limiting configured
4. ⏳ CORS restricted
5. ⏳ Database migrations applied
6. ⏳ Error tracking set up
7. ⏳ Monitoring configured
8. ⏳ Production database set up
9. ⏳ Mobile app builds successfully
10. ⏳ CI/CD pipeline working

---

## 🛠️ Quick Start Commands

```bash
# 1. Install rate limiting
pnpm --filter vett-api add @fastify/rate-limit

# 2. Run database migrations
pnpm --filter vett-api db:migrate

# 3. Install error tracking
pnpm --filter vett-api add @sentry/node

# 4. Set up CI/CD
cp .github/workflows/ci.yml.example .github/workflows/ci.yml

# 5. Test Docker builds
docker build -t vett-api -f apps/api/Dockerfile .
```

---

## 📞 Need Help?

- See `docs/production-readiness.md` for detailed instructions
- Check `docs/AUTHENTICATION_SETUP.md` for Clerk setup
- Review `docs/SUBSCRIPTION_PLANS.md` for subscription details

---

**Next Immediate Action:** Start with Rate Limiting (Priority 1.1) - it's quick and critical for security!

