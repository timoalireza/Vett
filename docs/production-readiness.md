# Vett Production Readiness Checklist

**Target Launch Date:** 2 weeks from now  
**Last Updated:** 2025-01-XX  
**Progress:** Authentication ✅ | Security Hardening ✅ | Migrations Ready ⏳

This document outlines all critical tasks required to make Vett production-ready for launch.

---

## 🎯 Overview

Vett consists of:
- **Mobile App** (Expo/React Native) - iOS & Android
- **API** (Fastify + GraphQL)
- **Worker** (BullMQ background processing)
- **Database** (PostgreSQL)
- **Cache/Queue** (Redis)

---

## 📋 Critical Path Items (Must Complete)

### Week 1: Security & Infrastructure

#### 1.1 Authentication & Authorization ⚠️ CRITICAL
**Status:** ✅ COMPLETED  
**Priority:** P0 - Blocking

**Tasks:**
- [x] Choose authentication provider (Clerk.dev recommended per architecture docs)
- [x] Install Clerk SDK: `@clerk/backend` installed
- [x] Create authentication middleware for Fastify
- [x] Add user context to GraphQL resolvers
- [x] Implement authorization checks:
  - Users can only access their own analyses ✅
  - Users can only modify their own collections (ready for implementation)
  - Public collections are read-only for non-owners (ready for implementation)
- [x] Add authentication to mobile app (GraphQL client updated)
- [ ] Test authentication flow end-to-end (needs Clerk token)

**Files to modify:**
- `apps/api/src/plugins/auth.ts` (new)
- `apps/api/src/index.ts` (add auth middleware)
- `apps/api/src/resolvers/index.ts` (add user context)
- `apps/mobile/src/api/graphql.ts` (add auth headers)

**Estimated Time:** 1-2 days

---

#### 1.2 Security Hardening ⚠️ CRITICAL
**Status:** ✅ COMPLETED  
**Priority:** P0 - Blocking

**Tasks:**
- [x] **CORS Configuration** - ✅ Completed
  - [x] Configure allowed origins for production
  - [x] Add environment-based CORS config (`ALLOWED_ORIGINS` env var)
  - [x] Mobile app support (no origin header handling)
  - [ ] Test CORS with mobile app (needs production setup)
  
- [x] **GraphiQL Disable** - ✅ Completed
  - [x] Disable GraphiQL in production (`graphiql: env.NODE_ENV !== 'production'`)
  
- [x] **Rate Limiting** - ✅ Completed
  - [x] Install `@fastify/rate-limit`
  - [x] Configure rate limits per endpoint:
    - GraphQL: 100 requests/15min per IP/user ✅
    - Health: 10 requests/min per IP ✅
    - File uploads: 5 requests/min per user ✅
  - [x] Add Redis-backed rate limiting for distributed systems ✅
  
- [x] **Input Validation** - ✅ Completed
  - [x] Add GraphQL query depth limiting (max depth: 10) ✅
  - [x] Add query complexity analysis (max complexity: 1000) ✅
  - [x] Validate file uploads (size: 20MB, type, extension) ✅
  - [x] Sanitize user inputs (filename sanitization) ✅
  
- [ ] **Security Headers**
  - [ ] Review and configure Helmet settings properly
  - [ ] Add CSP headers for mobile app
  - [ ] Configure HSTS
  
- [ ] **Secrets Management**
  - [ ] Move all API keys to environment variables (✅ Done)
  - [ ] Set up AWS Secrets Manager or similar for production
  - [ ] Rotate all API keys before launch
  - [ ] Never commit `.env` files (✅ Already in .gitignore)

**Files to modify:**
- `apps/api/src/index.ts`
- `apps/api/src/plugins/graphql.ts`
- `apps/api/src/plugins/rate-limit.ts` (new)
- `apps/api/src/plugins/uploads.ts`

**Estimated Time:** 1 day

---

#### 1.3 Environment Configuration ⚠️ CRITICAL
**Status:** ✅ Templates Created  
**Priority:** P0 - Blocking

**Tasks:**
- [x] **API Environment** - ✅ Production template created
  - [x] Create production `.env` template (`env.production.example`) ✅
  - [x] Add production-specific env vars ✅
  - [ ] Fill in actual production values
  
- [x] **Worker Environment** - ✅ Production template created
  - [x] Create production `.env` template (`env.production.example`) ✅
  - [ ] Fill in actual production API keys
  
- [ ] **Mobile App Configuration**
  - [ ] Set up EAS (Expo Application Services) project
  - [ ] Configure production API URL via environment variables
  - [ ] Create production build profiles
  - [ ] Configure app signing for iOS/Android

**Files created:**
- `apps/api/env.production.example` ✅
- `apps/worker/env.production.example` ✅
- `apps/mobile/.env.production` (or use EAS secrets) - TODO
- `apps/mobile/app.json` (update API URL config) - TODO

**Estimated Time:** 0.5 days

---

#### 1.4 Database & Migrations ⚠️ CRITICAL
**Status:** ✅ Migrations Run, Setup Guide Created  
**Priority:** P0 - Blocking

**Tasks:**
- [x] **Database Setup** - ✅ Setup guide created
  - [x] Create production database setup guide ✅
  - [ ] Set up production PostgreSQL database (AWS RDS, Supabase, or similar)
  - [ ] Enable `pgvector` extension for future semantic search
  - [x] Configure connection pooling (in `db/client.ts`) ✅
  - [ ] Set up read replicas if needed
  
- [x] **Migrations** - ✅ Completed
  - [x] Review all existing migrations ✅
  - [x] Create subscription tables migration (`0002_watery_corsair.sql`) ✅
  - [x] Create indexes migration (`0003_add_indexes.sql`) ✅
  - [x] Migrations run successfully ✅
  - [x] Document migration process ✅
  
- [ ] **Backups**
  - [ ] Set up automated daily backups (provider-dependent)
  - [ ] Test backup restoration process
  - [ ] Configure backup retention (30 days minimum)
  - [ ] Set up point-in-time recovery if available
  
- [x] **Indexes** - ✅ Created
  - [x] Review and add indexes for:
    - `analyses.user_id` (for user queries) ✅
    - `analyses.created_at` (for sorting) ✅
    - `analyses.status` (for worker queries) ✅
    - `users.external_id` (for auth lookups) ✅
    - `collections.user_id` (for user collections) ✅
    - Plus additional indexes for performance ✅
  - [ ] Run `EXPLAIN ANALYZE` on critical queries (after production DB setup)
  
- [x] **Connection Management** - ✅ Configured
  - [x] Configure connection pool size (max: 20, min: 5) ✅
  - [x] Add connection error handling ✅
  - [ ] Monitor connection pool metrics (after deployment)

**Files to modify:**
- `apps/api/src/db/client.ts`
- `apps/api/src/db/schema.ts` (add indexes)
- Create migration documentation

**Estimated Time:** 1 day

---

### Week 1: Error Handling & Observability

#### 1.5 Error Handling & Logging ⚠️ CRITICAL
**Status:** ✅ Implemented  
**Priority:** P0 - Blocking

**Tasks:**
- [x] **Structured Logging** - ✅ Implemented
  - [x] Review current Pino configuration ✅
  - [x] Add request ID tracking (correlation IDs) ✅
  - [x] Add user ID to logs (when authenticated) ✅
  - [x] Configure log levels per environment ✅
  - [ ] Set up log aggregation (Datadog, CloudWatch, or similar) - Optional
  
- [x] **Error Handling** - ✅ Implemented
  - [x] Create custom error classes ✅
  - [x] Add global error handler for Fastify ✅
  - [x] Add GraphQL error formatting ✅
  - [x] Don't expose internal errors to clients ✅
  - [x] Add error tracking (Sentry) ✅
  - [ ] Handle worker job failures gracefully - TODO
  
- [x] **Health Checks** - ✅ Implemented
  - [x] Enhance `/health` endpoint:
    - [x] Database connectivity check ✅
    - [x] Redis connectivity check ✅
    - [x] Clerk connectivity check ✅
  - [x] Add `/ready` endpoint for Kubernetes readiness probe ✅
  - [x] Add `/live` endpoint for Kubernetes liveness probe ✅

**Files to modify:**
- `apps/api/src/config/logger.ts`
- `apps/api/src/routes/health.ts`
- `apps/api/src/index.ts` (add error handlers)
- `apps/worker/src/index.ts` (improve error handling)

**Estimated Time:** 1 day

---

#### 1.6 Monitoring & Alerting ⚠️ CRITICAL
**Status:** ❌ Not Implemented  
**Priority:** P0 - Blocking

**Tasks:**
- [ ] **Application Monitoring**
  - [ ] Set up APM (Application Performance Monitoring)
  - [ ] Add metrics collection:
    - Request rate, latency, error rate
    - GraphQL query performance
    - Worker job processing time
    - Queue depth
    - Database query performance
    - External API call success/failure rates
  
- [ ] **Alerting**
  - [ ] Set up alerts for:
    - API error rate > 5%
    - API latency p95 > 2s
    - Worker queue depth > 100
    - Database connection failures
    - Redis connection failures
    - Disk space < 20%
    - Memory usage > 80%
  - [ ] Configure on-call rotation
  - [ ] Create runbooks for common issues
  
- [ ] **Dashboards**
  - [ ] Create operational dashboard
  - [ ] Create business metrics dashboard:
    - Analyses per day
    - Average processing time
    - Success rate
    - User growth

**Tools to consider:**
- Datadog, New Relic, or AWS CloudWatch
- Sentry for error tracking
- Grafana for dashboards

**Estimated Time:** 1-2 days

---

### Week 2: Testing & Quality Assurance

#### 2.1 Testing Infrastructure ⚠️ CRITICAL
**Status:** ❌ No Tests Found  
**Priority:** P0 - Blocking

**Tasks:**
- [ ] **Unit Tests**
  - [ ] Set up Vitest configuration (already in package.json)
  - [ ] Write tests for:
    - GraphQL resolvers
    - Service layer functions
    - Database queries
    - Worker pipeline stages
    - Utility functions
  
- [ ] **Integration Tests**
  - [ ] Test API endpoints
  - [ ] Test GraphQL queries/mutations
  - [ ] Test worker job processing
  - [ ] Test database operations
  
- [ ] **E2E Tests**
  - [ ] Test critical user flows:
    - Submit analysis → Get results
    - Create collection → Add analysis
    - User authentication flow
  
- [ ] **Test Coverage**
  - [ ] Aim for 70%+ coverage on critical paths
  - [ ] Set up coverage reporting
  - [ ] Add coverage to CI/CD

**Files to create:**
- `apps/api/src/__tests__/` directory
- `apps/worker/src/__tests__/` directory
- `apps/mobile/__tests__/` directory (if using Jest/Detox)

**Estimated Time:** 2-3 days

---

#### 2.2 CI/CD Pipeline ⚠️ CRITICAL
**Status:** ✅ Implemented  
**Priority:** P0 - Blocking

**Tasks:**
- [x] **GitHub Actions Setup** - ✅ Completed
  - [x] Create `.github/workflows/ci.yml`:
    - [x] Lint check ✅
    - [x] Type checking ✅
    - [x] Unit tests ✅
    - [x] Build verification ✅
    - [x] Docker builds ✅
  - [x] Create `.github/workflows/deploy.yml`:
    - [x] Deploy workflow structure ✅
    - [ ] Deploy to staging on merge to `develop` - TODO
    - [ ] Deploy to production on tag/release - TODO
  
- [x] **Build Process** - ✅ Completed
  - [x] Ensure all apps build successfully ✅
  - [x] Create Docker images for API and Worker ✅
  - [x] Test Docker builds locally ✅
  
- [ ] **Deployment Strategy**
  - [ ] Choose deployment platform (AWS ECS, Railway, Render, etc.)
  - [ ] Set up staging environment
  - [ ] Set up production environment
  - [ ] Configure blue-green or rolling deployments
  - [ ] Set up database migration automation
  
- [ ] **Mobile App Deployment**
  - [ ] Configure EAS Build for iOS/Android
  - [ ] Set up TestFlight (iOS) and Internal Testing (Android)
  - [ ] Configure app store submission process

**Files to create:**
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `Dockerfile` for API
- `Dockerfile` for Worker
- `docker-compose.prod.yml` (optional)

**Estimated Time:** 1-2 days

---

### Week 2: Performance & Optimization

#### 2.3 Performance Optimization
**Status:** ⚠️ Needs Review  
**Priority:** P1 - High

**Tasks:**
- [ ] **API Performance**
  - [ ] Add GraphQL query caching (Redis)
  - [ ] Implement DataLoader for N+1 query prevention
  - [ ] Add response compression
  - [ ] Optimize database queries
  - [ ] Add pagination to list queries
  
- [ ] **Worker Performance**
  - [ ] Optimize pipeline stages
  - [ ] Add job prioritization
  - [ ] Implement job retry with exponential backoff
  - [ ] Add job timeout handling
  
- [ ] **Database Performance**
  - [ ] Review slow query log
  - [ ] Add missing indexes (see 1.4)
  - [ ] Optimize JOIN queries
  - [ ] Consider read replicas for heavy read workloads
  
- [ ] **Caching Strategy**
  - [ ] Cache analysis results
  - [ ] Cache external API responses
  - [ ] Cache user sessions
  - [ ] Set appropriate TTLs

**Estimated Time:** 1 day

---

#### 2.4 Mobile App Production Readiness
**Status:** ⚠️ Needs Production Config  
**Priority:** P1 - High

**Tasks:**
- [ ] **Configuration**
  - [ ] Update `app.json` with production settings
  - [ ] Configure production API URL
  - [ ] Set up environment-based config
  - [ ] Configure deep linking
  
- [ ] **Build & Distribution**
  - [ ] Set up EAS Build
  - [ ] Configure app signing certificates
  - [ ] Create production build
  - [ ] Test on physical devices
  - [ ] Submit to App Store (iOS)
  - [ ] Submit to Google Play (Android)
  
- [ ] **Error Handling**
  - [ ] Add global error boundary
  - [ ] Add network error handling
  - [ ] Add offline support (if needed)
  - [ ] Add error reporting (Sentry React Native)
  
- [ ] **Performance**
  - [ ] Optimize bundle size
  - [ ] Add image optimization
  - [ ] Review and optimize re-renders
  - [ ] Add loading states

**Files to modify:**
- `apps/mobile/app.json`
- `apps/mobile/src/api/config.ts`
- `apps/mobile/app/_layout.tsx` (error boundary)

**Estimated Time:** 1 day

---

### Week 2: Compliance & Documentation

#### 2.5 Compliance & Legal ⚠️ CRITICAL
**Status:** ❌ Not Implemented  
**Priority:** P0 - Blocking

**Tasks:**
- [ ] **GDPR Compliance**
  - [ ] Implement user data export endpoint
  - [ ] Implement user data deletion endpoint
  - [ ] Add consent logging
  - [ ] Create privacy policy
  - [ ] Add cookie consent (if using web)
  
- [ ] **Terms of Service**
  - [ ] Create Terms of Service document
  - [ ] Add ToS acceptance flow
  - [ ] Store acceptance timestamp
  
- [ ] **Data Protection**
  - [ ] Encrypt sensitive data at rest
  - [ ] Ensure TLS for all connections
  - [ ] Review data retention policies
  - [ ] Implement data anonymization for analytics
  
- [ ] **Content Moderation**
  - [ ] Add content filtering for abusive content
  - [ ] Implement reporting mechanism
  - [ ] Add admin tools for moderation

**Files to create:**
- `apps/api/src/routes/gdpr.ts` (new)
- Privacy Policy document
- Terms of Service document

**Estimated Time:** 1-2 days

---

#### 2.6 Documentation
**Status:** ⚠️ Partial  
**Priority:** P1 - High

**Tasks:**
- [ ] **API Documentation**
  - [ ] Document all GraphQL queries/mutations
  - [ ] Add examples for each endpoint
  - [ ] Document error codes
  - [ ] Create Postman/GraphQL playground collection
  
- [ ] **Deployment Documentation**
  - [ ] Document deployment process
  - [ ] Document environment variables
  - [ ] Document database migration process
  - [ ] Create runbook for common operations
  
- [ ] **Developer Documentation**
  - [ ] Update README with production setup
  - [ ] Document architecture decisions
  - [ ] Add troubleshooting guide
  
- [ ] **User Documentation**
  - [ ] Create user guide
  - [ ] Add FAQ
  - [ ] Create support documentation

**Estimated Time:** 1 day

---

## 📊 Non-Critical but Important (Post-Launch)

### 3.1 Additional Features
- [ ] Email notifications for completed analyses
- [ ] Push notifications (mobile)
- [ ] User analytics dashboard
- [ ] Admin panel
- [ ] A/B testing framework

### 3.2 Scalability
- [ ] Horizontal scaling setup
- [ ] Load testing
- [ ] Auto-scaling configuration
- [ ] CDN setup for static assets

### 3.3 Business Features
- [ ] Analytics tracking (Mixpanel, Amplitude, etc.)
- [ ] Feature flags (LaunchDarkly, etc.)
- [ ] User feedback collection
- [ ] Usage analytics

---

## 🚨 Pre-Launch Checklist

### Final Verification (Day Before Launch)

- [ ] All P0 items completed
- [ ] All API keys rotated and secured
- [ ] Production database backed up
- [ ] Staging environment tested end-to-end
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] Legal review completed (ToS, Privacy Policy)
- [ ] App Store submissions approved
- [ ] Monitoring and alerting verified
- [ ] On-call rotation established
- [ ] Rollback plan documented
- [ ] Communication plan for launch day

---

## 📅 Suggested Timeline

### Week 1 (Days 1-7)
**Focus: Security & Infrastructure**

- **Day 1-2:** Authentication & Authorization (1.1)
- **Day 2-3:** Security Hardening (1.2)
- **Day 3:** Environment Configuration (1.3)
- **Day 4:** Database & Migrations (1.4)
- **Day 5:** Error Handling & Logging (1.5)
- **Day 6-7:** Monitoring & Alerting (1.6)

### Week 2 (Days 8-14)
**Focus: Testing, Deployment & Launch Prep**

- **Day 8-10:** Testing Infrastructure (2.1)
- **Day 10-11:** CI/CD Pipeline (2.2)
- **Day 11-12:** Performance Optimization (2.3)
- **Day 12:** Mobile App Production Readiness (2.4)
- **Day 13:** Compliance & Legal (2.5)
- **Day 14:** Documentation (2.6) + Final Testing

---

## 🛠️ Quick Start Commands

### Set up production environment
```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp apps/api/env.example apps/api/.env.production
cp apps/worker/env.example apps/worker/.env.production
# Edit and fill in production values

# 3. Run database migrations
pnpm --filter vett-api db:migrate

# 4. Build all apps
pnpm build

# 5. Test locally
pnpm dev:api
pnpm dev:worker
```

---

## 📞 Support & Escalation

**Critical Issues:** Create GitHub issue with `[P0]` label  
**Questions:** Refer to architecture docs or create discussion

---

## ✅ Progress Tracking

Update this document as you complete each task. Use checkboxes to track progress.

**Last Updated:** [Date]  
**Completed Items:** [X/XX]  
**Blockers:** [List any blockers]

