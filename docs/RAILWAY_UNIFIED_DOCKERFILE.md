# Railway Unified Dockerfile Configuration

## Solution: Unified Dockerfile with SERVICE Build Argument

Instead of using Root Directory (which doesn't work), we've created a unified `Dockerfile` at the root that can build both API and worker services based on a `SERVICE` build argument.

## Configuration

### Root Dockerfile
- Location: `/Dockerfile`
- Uses `SERVICE` build argument to determine which service to build
- Builds from repository root (can access all files)

### Service-Specific Configuration

**For API Service:**
1. Remove Root Directory (set to empty/`/`)
2. Set environment variable: `SERVICE=api`
3. Railway will use root `railway.json` → `Dockerfile` with `SERVICE=api`

**For Worker Service:**
1. Remove Root Directory (set to empty/`/`)
2. Set environment variable: `SERVICE=worker`
3. Railway will use root `railway.json` → `Dockerfile` with `SERVICE=worker`

## How It Works

The unified Dockerfile:
1. Copies all necessary files (API, worker, shared)
2. Builds shared package
3. Builds API (needed for worker's db schema)
4. Conditionally builds worker if `SERVICE=worker`
5. Installs only the target service's production dependencies
6. Copies the correct dist files based on `SERVICE`

## Railway Environment Variables

Set these in Railway Dashboard → Service → Variables:

- **API Service**: `SERVICE=api`
- **Worker Service**: `SERVICE=worker`

Railway will pass these as build arguments to Docker.

## Benefits

- ✅ No Root Directory needed
- ✅ Both services build from root context
- ✅ Single Dockerfile to maintain
- ✅ Railway uses root `railway.json` for both services

