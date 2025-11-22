# Force Railway to Use Dockerfile Instead of Railpack

## Problem
Railway is using Railpack (buildpack) instead of Dockerfile for the worker service, and Railpack is auto-detecting `vett-api` instead of `vett-worker`.

## Solution

Railway uses Railpack when it doesn't find a `railway.json` file. To force Railway to use Dockerfile:

### For Worker Service:

1. **Set Root Directory** (Recommended):
   - Go to Railway Dashboard → Worker Service → Settings
   - Set **Root Directory** to `apps/worker`
   - Railway will then use `apps/worker/railway.json` which specifies Dockerfile

2. **OR Use RAILWAY_DOCKERFILE_PATH**:
   - Ensure `RAILWAY_DOCKERFILE_PATH=apps/worker/Dockerfile` is set in Worker Service → Variables
   - Railway should use this to override railway.json

3. **OR Disable Railpack**:
   - Add `RAILWAY_DISABLE_BUILDPACK=1` environment variable to Worker Service
   - This forces Railway to use Dockerfile instead of Railpack

### Current Configuration:

- **Root railway.json**: Points to `apps/api/Dockerfile` (for API service)
- **apps/worker/railway.json**: Points to `apps/worker/Dockerfile` (for worker service)
- **Worker Service**: Needs Root Directory set to `apps/worker` OR `RAILWAY_DOCKERFILE_PATH` environment variable

## Why Railway Uses Railpack

Railway uses Railpack (buildpack) when:
1. No `railway.json` is found
2. Root Directory is not set AND Railway can't detect service-specific railway.json files

Railpack auto-detects packages in monorepos and builds them. It's currently detecting `vett-api` instead of `vett-worker` for the worker service.

## Verification

After configuring Railway correctly, check build logs:
- Should show: `[internal] load build definition from Dockerfile` (not Railpack)
- Should build using `apps/worker/Dockerfile` (not `apps/api/Dockerfile`)
- Worker logs should show worker-specific startup messages

