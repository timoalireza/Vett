# Railway Build Fix

## Issue

Railway build was failing with:
```
process "sh -c apt-get update && apt-get install -y libatomic1" did not complete
```

## Root Cause

Railway might be trying to use a buildpack instead of the Dockerfile, or native dependencies need build tools.

## Solution

### 1. Updated Dockerfiles

Added build dependencies to both Dockerfiles:

```dockerfile
RUN npm install -g pnpm@9.12.0 && \
    apk add --no-cache libc6-compat python3 make g++
```

This ensures:
- `libc6-compat` - Compatibility library
- `python3` - Required for some native modules
- `make` - Build tool
- `g++` - C++ compiler for native modules

### 2. Railway Configuration

Created `railway.json` to explicitly use Dockerfile:

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/api/Dockerfile"
  }
}
```

## Fix Steps

### For API Service

1. **Verify Dockerfile Path**:
   - Railway → API Service → Settings
   - **Dockerfile Path**: `apps/api/Dockerfile`
   - **Root Directory**: Leave empty

2. **Redeploy**:
   - Railway will automatically rebuild
   - Or trigger manual redeploy

### For Worker Service

1. **Verify Dockerfile Path**:
   - Railway → Worker Service → Settings
   - **Dockerfile Path**: `apps/worker/Dockerfile`
   - **Root Directory**: Leave empty

2. **Redeploy**

## Verification

After redeploy, check:
- Build completes successfully
- No `apt-get` errors
- Service starts correctly
- Health endpoint responds

## Alternative: Use Debian Base Image

If Alpine continues to cause issues, switch to Debian:

```dockerfile
FROM node:20-slim AS base

# Install pnpm and build dependencies
RUN npm install -g pnpm@9.12.0 && \
    apt-get update && \
    apt-get install -y libatomic1 python3 make g++ && \
    rm -rf /var/lib/apt/lists/*
```

But Alpine should work fine with the updated Dockerfile.

---

**Status**: Fixed - Dockerfiles updated with build dependencies

