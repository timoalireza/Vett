# Final Solution: Railway Worker Service Configuration

## The Problem

Railway prioritizes `railway.json` files over `RAILWAY_DOCKERFILE_PATH` environment variable. When Root Directory is not set, Railway detects `apps/api/railway.json` and uses it for the worker service, causing it to build the API instead of the worker.

## The Solution

Railway needs to detect `apps/worker/railway.json` for the worker service. Railway detects `railway.json` files based on:

1. **Root Directory setting**: If Root Directory is set to `apps/worker`, Railway looks for `railway.json` in that directory
2. **Service name matching**: Railway might auto-detect `apps/worker/railway.json` if the service name matches

## Configuration Steps

### For Worker Service:

1. **Set Root Directory**:
   - Go to Railway Dashboard → Worker Service → Settings
   - Set **Root Directory** to `apps/worker`
   - Railway will detect `apps/worker/railway.json`

2. **Update Worker Dockerfile**:
   - The Dockerfile needs to work when built from `apps/worker` context
   - However, Docker can't copy files outside the build context
   - **Solution**: Railway needs to build from root, not from `apps/worker`

### Alternative Solution: Build from Root

Since the Dockerfile needs root context, Railway must build from root:

1. **Remove Root Directory** for worker service (set to empty/`/`)
2. **Ensure `RAILWAY_DOCKERFILE_PATH=apps/worker/Dockerfile`** is set in Variables
3. **Rename or remove `apps/api/railway.json`** temporarily so Railway doesn't detect it
4. Railway should then use `RAILWAY_DOCKERFILE_PATH` and build from root

## Current Status

- `apps/worker/railway.json` exists and points to `apps/worker/Dockerfile`
- `apps/api/railway.json` exists and points to `apps/api/Dockerfile`
- Root `railway.json` has been renamed to `railway.api.json` (Railway won't detect it)

## Next Steps

Try setting Root Directory to `apps/worker` for the worker service. If Railway still builds from `apps/worker` context and fails, we need Railway to build from root context while using the worker Dockerfile.

