# Railway Service Detection After Moving railway.json

## What Changed

We moved the root `railway.json` to `apps/api/railway.json` to prevent Railway from using the API configuration for the worker service.

## Current Configuration

- **API Service**: `apps/api/railway.json` → `apps/api/Dockerfile`
- **Worker Service**: `apps/worker/railway.json` → `apps/worker/Dockerfile`
- **Worker Service**: `RAILWAY_DOCKERFILE_PATH=apps/worker/Dockerfile` (environment variable)

## How Railway Detects railway.json Files

Railway detects `railway.json` files in one of these ways:

1. **Root Directory Setting**: If Root Directory is set to `apps/api` or `apps/worker`, Railway looks for `railway.json` in that directory
2. **Service Name Matching**: Railway might auto-detect `railway.json` files based on service name matching directory name
3. **RAILWAY_DOCKERFILE_PATH**: Environment variable that overrides `dockerfilePath` in `railway.json`

## If Railway Still Uses API Dockerfile for Worker

If Railway is still building the worker with `apps/api/Dockerfile`, it means Railway is not detecting `apps/worker/railway.json`. In this case:

### Option 1: Set Root Directory (Recommended)
- Go to Railway Dashboard → Worker Service → Settings
- Set **Root Directory** to `apps/worker`
- Railway will then use `apps/worker/railway.json`

### Option 2: Verify RAILWAY_DOCKERFILE_PATH
- Ensure `RAILWAY_DOCKERFILE_PATH=apps/worker/Dockerfile` is set in Worker Service → Variables
- Railway should use this environment variable to override any railway.json settings

### Option 3: Service Name Matching
- Ensure the Worker Service is named exactly `worker` or `vett-worker`
- Railway might auto-detect `apps/worker/railway.json` if the service name matches

## Verification

After Railway rebuilds, check the build logs:
- Worker build should show: `[internal] load build definition from Dockerfile` pointing to `apps/worker/Dockerfile`
- Worker logs should show worker-specific startup messages, not API startup messages

