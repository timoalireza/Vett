# CI/CD Pipeline Setup

## Overview

Vett uses GitHub Actions for CI/CD. The pipeline includes linting, type checking, testing, building, and Docker image creation.

## GitHub Actions Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs:**
1. **Lint & Type Check**
   - Runs ESLint
   - Runs TypeScript type checking
   - Fast feedback on code quality

2. **Test**
   - Sets up PostgreSQL and Redis services
   - Runs database migrations
   - Executes all tests
   - Generates coverage report

3. **Build**
   - Builds API, Worker, and Shared packages
   - Verifies all builds succeed

4. **Docker Build**
   - Builds Docker images for API and Worker
   - Uses Docker Buildx with caching
   - Verifies images build successfully

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers:**
- Version tags (e.g., `v1.0.0`)
- Manual workflow dispatch

**Jobs:**
- Builds application
- Creates Docker images
- Placeholder for deployment steps

---

## Docker Setup

### API Dockerfile

**Location:** `apps/api/Dockerfile`

**Build:**
```bash
docker build -t vett-api -f apps/api/Dockerfile .
```

**Run:**
```bash
docker run -p 4000:4000 --env-file apps/api/.env.production vett-api
```

### Worker Dockerfile

**Location:** `apps/worker/Dockerfile`

**Build:**
```bash
docker build -t vett-worker -f apps/worker/Dockerfile .
```

**Run:**
```bash
docker run --env-file apps/worker/.env.production vett-worker
```

---

## Testing Docker Builds Locally

### Build API

```bash
docker build -t vett-api -f apps/api/Dockerfile .
```

### Build Worker

```bash
docker build -t vett-worker -f apps/worker/Dockerfile .
```

### Test API Container

```bash
docker run -p 4000:4000 \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/vett \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e CLERK_SECRET_KEY=sk_test_xxx \
  vett-api
```

### Test Worker Container

```bash
docker run \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/vett \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e OPENAI_API_KEY=sk-xxx \
  vett-worker
```

---

## CI/CD Status Badge

Add to your README.md:

```markdown
![CI](https://github.com/your-org/vett/workflows/CI/badge.svg)
```

---

## Deployment Platforms

### Option 1: Railway (Recommended - Easiest)

1. **Connect Repository**
   - Go to Railway → New Project → Deploy from GitHub
   - Select your repository

2. **Configure Services**
   - Add API service (use `apps/api/Dockerfile`)
   - Add Worker service (use `apps/worker/Dockerfile`)
   - Add PostgreSQL (or use Supabase)
   - Add Redis

3. **Set Environment Variables**
   - Copy from `apps/api/env.production.example`
   - Add all required keys

4. **Deploy**
   - Railway auto-deploys on push to main
   - Or deploy manually

**Estimated Time:** 15 minutes

---

### Option 2: AWS ECS/Fargate

1. **Push Images to ECR**
   ```bash
   aws ecr create-repository --repository-name vett-api
   aws ecr create-repository --repository-name vett-worker
   
   docker tag vett-api:latest <account>.dkr.ecr.<region>.amazonaws.com/vett-api:latest
   docker push <account>.dkr.ecr.<region>.amazonaws.com/vett-api:latest
   ```

2. **Create ECS Task Definitions**
   - Define API task
   - Define Worker task
   - Configure environment variables

3. **Create ECS Services**
   - API service (Fargate)
   - Worker service (Fargate)

4. **Set Up Load Balancer**
   - Application Load Balancer for API
   - Health checks on `/health`

**Estimated Time:** 2-3 hours

---

### Option 3: Render

1. **Create Web Service**
   - Connect GitHub repo
   - Use `apps/api/Dockerfile`
   - Set environment variables

2. **Create Background Worker**
   - Use `apps/worker/Dockerfile`
   - Set environment variables

3. **Add PostgreSQL**
   - Render managed PostgreSQL
   - Or use Supabase

4. **Add Redis**
   - Render managed Redis

**Estimated Time:** 30 minutes

---

## Environment Variables for Deployment

### API Service

Required:
- `DATABASE_URL`
- `REDIS_URL`
- `CLERK_SECRET_KEY`

Optional but recommended:
- `SENTRY_DSN`
- `ALLOWED_ORIGINS`
- `NODE_ENV=production`
- `LOG_LEVEL=info`

### Worker Service

Required:
- `DATABASE_URL`
- `REDIS_URL`
- `OPENAI_API_KEY`

Optional:
- `ANTHROPIC_API_KEY`
- `BRAVE_SEARCH_API_KEY`
- Other API keys

---

## Database Migrations in CI/CD

### Option 1: Manual (Recommended for now)

Run migrations manually before deployment:

```bash
export DATABASE_URL="your-production-db-url"
pnpm --filter vett-api db:migrate
```

### Option 2: Automated (Future)

Add migration step to deploy workflow:

```yaml
- name: Run migrations
  run: |
    pnpm --filter vett-api db:migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Security Best Practices

1. **Secrets Management**
   - Store secrets in GitHub Secrets
   - Never commit `.env` files
   - Use environment variables in deployment platform

2. **Docker Security**
   - Use non-root user (already configured)
   - Keep base images updated
   - Scan images for vulnerabilities

3. **CI/CD Security**
   - Limit workflow permissions
   - Use branch protection rules
   - Require PR reviews

---

## Monitoring CI/CD

### GitHub Actions

- View workflow runs in Actions tab
- Set up notifications for failures
- Review logs for debugging

### Deployment Monitoring

- Monitor deployment health endpoints
- Set up alerts for failed deployments
- Track deployment frequency

---

## Troubleshooting

### Docker Build Fails

**Error:** "Cannot find module"
- **Solution:** Ensure `pnpm-workspace.yaml` is copied
- **Solution:** Check `package.json` files are included

### Tests Fail in CI

**Error:** Database connection failed
- **Solution:** Check PostgreSQL service is running
- **Solution:** Verify `DATABASE_URL` is correct

### Deployment Fails

**Error:** Environment variables missing
- **Solution:** Add all required env vars to deployment platform
- **Solution:** Check `.env.production.example` for required vars

---

## Next Steps

1. ✅ CI/CD workflows created
2. ✅ Dockerfiles created
3. [ ] Test Docker builds locally
4. [ ] Set up deployment platform
5. [ ] Configure environment variables
6. [ ] Test deployment
7. [ ] Set up automated deployments

---

**Need Help?**
- GitHub Actions: https://docs.github.com/en/actions
- Docker: https://docs.docker.com/
- Railway: https://docs.railway.app/
- Render: https://render.com/docs

