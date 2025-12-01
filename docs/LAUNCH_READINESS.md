# Vett Launch Readiness Checklist

## ✅ Completed

- [x] Core pipeline functionality (ingestion, classification, claim extraction, evidence retrieval, reasoning)
- [x] Social media platform support (Instagram, X/Twitter, Facebook, Threads, TikTok, YouTube Shorts)
- [x] RevenueCat integration for subscriptions
- [x] SocialKit integration for TikTok/YouTube transcriptions
- [x] Apify integration for reliable content scraping
- [x] Mobile app share intent functionality
- [x] Error tracking (Sentry configured)
- [x] Database schema and migrations
- [x] Authentication (Clerk)
- [x] GraphQL API with proper authorization
- [x] Analysis deletion functionality
- [x] Contextual information display with read more
- [x] Scoring improvements for accurate claims

## 🔴 Critical (Must Complete Before Launch)

### 1. Production Environment Configuration
- [ ] **Environment Variables**
  - [ ] Verify all required API keys are set in production:
    - `OPENAI_API_KEY` (required)
    - `CLERK_SECRET_KEY` (required)
    - `DATABASE_URL` (required)
    - `REDIS_URL` (required)
    - `APIFY_API_TOKEN` (recommended for social media scraping)
    - `SOCIALKIT_API_KEY` (recommended for TikTok/YouTube)
    - `BRAVE_SEARCH_API_KEY` or `SERPER_API_KEY` (required for evidence retrieval)
    - `REVENUECAT_API_KEY` and `REVENUECAT_WEBHOOK_SECRET` (required for subscriptions)
    - `SENTRY_DSN` (highly recommended)
  - [ ] Set `NODE_ENV=production` in all services
  - [ ] Configure `LOG_LEVEL=info` or `warn` for production
  - [ ] Set `SENTRY_TRACES_SAMPLE_RATE=0.1` for production

### 2. Database & Infrastructure
- [ ] **Database**
  - [ ] Run all migrations in production: `pnpm --filter vett-api db:migrate`
  - [ ] Verify database backups are configured
  - [ ] Set up connection pooling limits (`DB_POOL_MAX`, `DB_POOL_MIN`)
  - [ ] Enable pgvector extension if using vector search
- [ ] **Redis**
  - [ ] Verify Redis persistence is enabled
  - [ ] Configure Redis memory limits and eviction policies
  - [ ] Set up Redis monitoring/alerting
- [ ] **Queue Management**
  - [ ] Configure BullMQ retry policies
  - [ ] Set up queue monitoring dashboard
  - [ ] Configure dead letter queue handling

### 3. Security & Compliance
- [ ] **Authentication**
  - [ ] Verify Clerk production keys are configured
  - [ ] Test authentication flow end-to-end
  - [ ] Configure CORS properly (`ALLOWED_ORIGINS`)
- [ ] **API Security**
  - [ ] Implement rate limiting (per user/IP)
  - [ ] Add request size limits
  - [ ] Configure GraphQL query depth/complexity limits
  - [ ] Set up API key rotation schedule
- [ ] **Data Protection**
  - [ ] Verify TLS/HTTPS is enforced
  - [ ] Review PII handling and GDPR compliance
  - [ ] Set up data retention policies
  - [ ] Configure audit logging for sensitive operations

### 4. Monitoring & Observability
- [ ] **Error Tracking**
  - [ ] Configure Sentry with production DSN
  - [ ] Set up Sentry alert rules for critical errors
  - [ ] Configure error sampling rates
- [ ] **Metrics & Logging**
  - [ ] Set up application metrics (analysis success rate, latency, queue depth)
  - [ ] Configure log aggregation (e.g., Datadog, LogRocket, or CloudWatch)
  - [ ] Set up uptime monitoring
  - [ ] Create dashboards for key metrics:
    - Analysis pipeline success rate
    - Average analysis time
    - API error rates
    - Queue depth and processing time
    - Cost per analysis (API usage)
- [ ] **Alerting**
  - [ ] Set up alerts for:
    - High error rates (>5%)
    - Queue backup (>100 pending jobs)
    - Database connection failures
    - Redis connection failures
    - API quota exhaustion warnings

### 5. Mobile App
- [ ] **Build & Distribution**
  - [ ] Configure production app signing certificates
  - [ ] Set up App Store Connect / Google Play Console
  - [ ] Configure app versioning and build numbers
  - [ ] Set up TestFlight (iOS) / Internal Testing (Android)
- [ ] **Configuration**
  - [ ] Update API endpoint to production URL
  - [ ] Configure deep linking for production
  - [ ] Set up push notifications (if applicable)
  - [ ] Configure app icons and splash screens
- [ ] **Testing**
  - [ ] Test on physical devices (iOS and Android)
  - [ ] Test share intent functionality
  - [ ] Test subscription flow end-to-end
  - [ ] Test offline behavior
  - [ ] Test error handling and retry logic

### 6. Performance & Scalability
- [ ] **API Performance**
  - [ ] Load test API endpoints (target: handle 100+ concurrent requests)
  - [ ] Optimize database queries (add indexes if needed)
  - [ ] Configure CDN for static assets (if applicable)
  - [ ] Set up caching strategy (Redis cache layer)
- [ ] **Worker Performance**
  - [ ] Verify worker horizontal scaling works
  - [ ] Test queue processing under load
  - [ ] Optimize analysis pipeline (target: 5-8 seconds per analysis)
  - [ ] Configure worker concurrency limits
- [ ] **Cost Optimization**
  - [ ] Set up API usage monitoring and alerts
  - [ ] Configure rate limiting to prevent abuse
  - [ ] Review LLM usage and optimize prompts
  - [ ] Set up cost budgets and alerts

## 🟡 Important (Should Complete Soon)

### 7. Documentation
- [ ] **User Documentation**
  - [ ] Create user guide/FAQ
  - [ ] Document subscription tiers and limits
  - [ ] Create troubleshooting guide
- [ ] **Developer Documentation**
  - [ ] Document API endpoints and GraphQL schema
  - [ ] Create deployment guide
  - [ ] Document environment variables
  - [ ] Create runbook for common issues

### 8. Testing
- [ ] **End-to-End Testing**
  - [ ] Test complete analysis flow for each platform (Instagram, TikTok, Twitter, etc.)
  - [ ] Test subscription upgrade/downgrade flows
  - [ ] Test error scenarios (network failures, API errors)
  - [ ] Test edge cases (very long content, malformed URLs, etc.)
- [ ] **Integration Testing**
  - [ ] Test all external API integrations
  - [ ] Test RevenueCat webhook handling
  - [ ] Test Clerk authentication flows
- [ ] **Performance Testing**
  - [ ] Load test with realistic traffic patterns
  - [ ] Test database under load
  - [ ] Test Redis under load

### 9. Legal & Compliance
- [ ] **Terms of Service**
  - [ ] Review and publish Terms of Service
  - [ ] Review and publish Privacy Policy
  - [ ] Add GDPR compliance notices (if applicable)
- [ ] **Data Handling**
  - [ ] Document data retention policies
  - [ ] Set up data export functionality (GDPR)
  - [ ] Configure data deletion workflows

### 10. Marketing & Onboarding
- [ ] **App Store Optimization**
  - [ ] Write compelling app description
  - [ ] Create screenshots and preview videos
  - [ ] Set up app categories and keywords
- [ ] **Onboarding Flow**
  - [ ] Test first-time user experience
  - [ ] Verify onboarding tutorials work
  - [ ] Test sign-up flow

## 🟢 Nice to Have (Post-Launch)

### 11. Advanced Features
- [ ] Browser extension
- [ ] API access for developers
- [ ] Advanced analytics dashboard
- [ ] Community features (if planned)

### 12. Optimization
- [ ] A/B testing framework
- [ ] Advanced caching strategies
- [ ] CDN for media assets
- [ ] Database query optimization

## Pre-Launch Verification Steps

1. **Smoke Tests**
   ```bash
   # Test API health
   curl https://api.vett.app/health
   
   # Test GraphQL endpoint
   curl -X POST https://api.vett.app/graphql \
     -H "Content-Type: application/json" \
     -d '{"query": "{ health { status timestamp } }"}'
   ```

2. **Database Verification**
   - Verify all migrations applied
   - Check database connection pool
   - Verify indexes exist

3. **Redis Verification**
   - Test Redis connection
   - Verify queue workers can connect
   - Check Redis memory usage

4. **Mobile App Verification**
   - Test on iOS device
   - Test on Android device
   - Verify deep linking works
   - Test share intent functionality

5. **Integration Tests**
   - Test analysis submission
   - Test analysis retrieval
   - Test subscription flow
   - Test error handling

## Launch Day Checklist

- [ ] All critical items above are completed
- [ ] Monitoring dashboards are live
- [ ] Alerting is configured and tested
- [ ] Team is briefed on launch plan
- [ ] Rollback plan is documented
- [ ] Support channels are ready
- [ ] App Store submissions are approved
- [ ] Production environment is stable
- [ ] Backup systems are verified

## Post-Launch Monitoring

- Monitor error rates for first 24 hours
- Watch queue depth and processing times
- Monitor API costs
- Track user sign-ups and conversions
- Monitor app store reviews
- Watch for performance degradation

---

**Last Updated**: 2025-01-XX
**Status**: In Progress

