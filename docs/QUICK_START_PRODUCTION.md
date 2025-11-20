# Quick Start: Production Readiness

This is a condensed guide to get Vett production-ready. For detailed instructions, see `docs/production-readiness.md`.

## 🚀 Week 1 Priority Actions

### Day 1-2: Authentication (CRITICAL)
```bash
# 1. Install Clerk
pnpm --filter vett-api add @clerk/fastify

# 2. Set up auth plugin
cp apps/api/src/plugins/auth.ts.example apps/api/src/plugins/auth.ts
# Edit auth.ts with your Clerk credentials

# 3. Update env.ts to include CLERK_SECRET_KEY
# 4. Register auth plugin in apps/api/src/index.ts BEFORE GraphQL
```

### Day 2-3: Security Hardening
```bash
# 1. Install rate limiting
pnpm --filter vett-api add @fastify/rate-limit

# 2. Set up rate limiting
cp apps/api/src/plugins/rate-limit.ts.example apps/api/src/plugins/rate-limit.ts
# Register in index.ts

# 3. Fix CORS - Update apps/api/src/index.ts:
# Replace `origin: true` with specific origins for production

# 4. GraphiQL already disabled in production (✅ Done)
```

### Day 3: Environment Setup
```bash
# 1. Create production env files
cp apps/api/env.example apps/api/.env.production
cp apps/worker/env.example apps/worker/.env.production

# 2. Fill in all production values:
# - Production DATABASE_URL
# - Production REDIS_URL  
# - All API keys
# - NODE_ENV=production
# - LOG_LEVEL=info

# 3. Mobile app - Update app.json with production API URL
# Or use EAS environment variables
```

### Day 4: Database
```bash
# 1. Set up production PostgreSQL (AWS RDS, Supabase, etc.)
# 2. Run migrations
pnpm --filter vett-api db:migrate

# 3. Add indexes (create migration):
# - analyses.user_id
# - analyses.created_at
# - analyses.status
# - users.external_id
# - collections.user_id

# 4. Set up automated backups
```

### Day 5: Error Handling & Monitoring
```bash
# 1. Install Sentry
pnpm --filter vett-api add @sentry/node

# 2. Set up error tracking in apps/api/src/index.ts

# 3. Health checks already enhanced (✅ Done)

# 4. Set up monitoring (Datadog, CloudWatch, etc.)
# 5. Configure alerts
```

### Day 6-7: Monitoring Setup
- Set up APM tool (Datadog/New Relic/CloudWatch)
- Configure dashboards
- Set up alerts for critical metrics
- Test alerting

## 🚀 Week 2 Priority Actions

### Day 8-10: Testing
```bash
# 1. Set up test infrastructure
# Tests should be in:
# - apps/api/src/__tests__/
# - apps/worker/src/__tests__/

# 2. Write critical path tests:
# - Authentication flow
# - Analysis submission → result retrieval
# - GraphQL queries/mutations
# - Worker job processing

# 3. Run tests
pnpm test
```

### Day 10-11: CI/CD
```bash
# 1. Set up GitHub Actions
cp .github/workflows/ci.yml.example .github/workflows/ci.yml
# Customize as needed

# 2. Create Dockerfiles
cp apps/api/Dockerfile.example apps/api/Dockerfile
cp apps/worker/Dockerfile.example apps/worker/Dockerfile

# 3. Test builds locally
docker build -t vett-api -f apps/api/Dockerfile .
docker build -t vett-worker -f apps/worker/Dockerfile .

# 4. Set up deployment pipeline
```

### Day 11-12: Performance
- Add GraphQL query caching (Redis)
- Implement DataLoader for N+1 prevention
- Optimize database queries
- Add pagination

### Day 12: Mobile App
```bash
# 1. Configure EAS
eas build:configure

# 2. Create production build
eas build --platform ios --profile production
eas build --platform android --profile production

# 3. Submit to app stores
```

### Day 13: Compliance
```bash
# 1. Set up GDPR endpoints
cp apps/api/src/routes/gdpr.ts.example apps/api/src/routes/gdpr.ts
# Register in index.ts

# 2. Create Privacy Policy
# 3. Create Terms of Service
# 4. Add consent logging
```

### Day 14: Final Prep
- Complete documentation
- Final testing
- Security audit
- Load testing
- Prepare rollback plan

## 📋 Files Created/Modified

### New Files Created:
- ✅ `docs/production-readiness.md` - Comprehensive guide
- ✅ `PRODUCTION_CHECKLIST.md` - Quick reference
- ✅ `apps/api/src/plugins/auth.ts.example` - Auth template
- ✅ `apps/api/src/plugins/rate-limit.ts.example` - Rate limit template
- ✅ `apps/api/src/routes/gdpr.ts.example` - GDPR endpoints
- ✅ `.github/workflows/ci.yml.example` - CI/CD template
- ✅ `apps/api/Dockerfile.example` - Docker template
- ✅ `apps/worker/Dockerfile.example` - Docker template

### Files Modified:
- ✅ `apps/api/src/plugins/graphql.ts` - Disabled GraphiQL in production
- ✅ `apps/api/src/routes/health.ts` - Enhanced with /ready and /live endpoints

## 🔑 Key Environment Variables Needed

### API (.env.production):
```
NODE_ENV=production
PORT=4000
LOG_LEVEL=info
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
PINECONE_API_KEY=...
CLERK_SECRET_KEY=... (if using Clerk)
PUBLIC_UPLOAD_BASE_URL=https://cdn.yourdomain.com
UPLOADS_DIR=/app/uploads
```

### Worker (.env.production):
```
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
OPENAI_API_KEY=...
BRAVE_SEARCH_API_KEY=...
SERPER_API_KEY=...
GOOGLE_FACT_CHECK_API_KEY=...
# ... other API keys
```

## 🎯 Critical Success Metrics

Before launch, verify:
- [ ] Authentication works end-to-end
- [ ] Rate limiting prevents abuse
- [ ] Health checks respond correctly
- [ ] Database backups are working
- [ ] Monitoring alerts are configured
- [ ] Tests pass (>70% coverage on critical paths)
- [ ] CI/CD pipeline works
- [ ] Production builds succeed
- [ ] GDPR endpoints functional
- [ ] Mobile app builds and submits successfully

## 🆘 Getting Help

- See `docs/production-readiness.md` for detailed instructions
- Check `PRODUCTION_CHECKLIST.md` for quick status
- Review architecture docs in `docs/architecture.md`

---

**Next Steps:** Start with Day 1-2 (Authentication) - it's blocking everything else!

