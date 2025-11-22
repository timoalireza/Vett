# Force Railway API Service to Use Dockerfile

## Problem
Railway is using Railpack (buildpack) instead of Dockerfile for the API service, causing build failures because Railpack expects `.env.example` files in the root directory.

## Solution

### Option 1: Set Root Directory (Recommended)
1. Go to Railway Dashboard → API Service → Settings
2. Set **Root Directory** to `apps/api`
3. Railway will then use `apps/api/railway.json` which specifies Dockerfile

### Option 2: Force Dockerfile via Environment Variable
1. Go to Railway Dashboard → API Service → Variables
2. Add environment variable:
   ```
   RAILWAY_DISABLE_BUILDPACK=1
   ```
3. This forces Railway to use Dockerfile instead of Railpack

### Option 3: Ensure Root railway.json is Detected
The root `railway.json` specifies Dockerfile, but Railway might not be detecting it. Ensure:
- Root Directory is NOT set (or set to `/` or empty)
- Railway should detect root `railway.json` automatically

## Current Configuration

- **Root railway.json**: Points to `apps/api/Dockerfile` (for API service)
- **apps/api/railway.json**: Also points to `apps/api/Dockerfile` (backup)

## Why Railway Uses Railpack

Railway uses Railpack when:
1. No `railway.json` is detected
2. Railway detects a Node.js project and auto-selects Railpack
3. Root Directory is set but Railway can't find the railway.json file

## Verification

After configuring Railway correctly, check build logs:
- Should show: `[internal] load build definition from Dockerfile` (not Railpack)
- Should build using `apps/api/Dockerfile`
- Should NOT show Railpack messages like "Detected Node" or "Using pnpm package manager"

