# Dockerfile Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Missing Dependencies at Runtime (`ERR_MODULE_NOT_FOUND`)

**Symptoms:**
- `Cannot find package '@sentry/node'`
- `Cannot find package 'xyz'`
- Works in development but fails in production

**Root Cause:**
- pnpm workspace dependency resolution issues
- Filtering/pruning removes transitive dependencies
- Workspace symlinks not preserved

**Solution:**
```dockerfile
# Install ALL workspace production dependencies
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
# Don't use --filter or prune - it breaks dependency resolution
```

### Issue 2: Husky Prepare Script Fails

**Symptoms:**
- `sh: husky: not found`
- Build fails during `pnpm install`

**Root Cause:**
- Root `package.json` has `"prepare": "husky install"`
- Husky is a devDependency
- Prepare scripts run even in production installs

**Solution:**
```dockerfile
# Skip prepare scripts during production install
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
```

### Issue 3: TypeScript Build Errors

**Symptoms:**
- `Cannot find base config file "../../tsconfig.base.json"`
- `Cannot find module 'zod'`

**Root Cause:**
- Missing `tsconfig.base.json` in Docker image
- TypeScript module resolution issues

**Solution:**
```dockerfile
# Copy tsconfig.base.json
COPY tsconfig.base.json ./

# Use node moduleResolution
"moduleResolution": "node"
```

### Issue 4: tsup Not Found

**Symptoms:**
- `sh: tsup: not found`
- Build fails when building shared package

**Root Cause:**
- `tsup` is a devDependency
- Not available in production installs
- Need devDependencies for building

**Solution:**
```dockerfile
# Install ALL dependencies (including devDependencies) for building
RUN pnpm install --frozen-lockfile

# Then build
RUN pnpm --filter @vett/shared build
```

### Issue 5: Workspace Dependencies Not Found

**Symptoms:**
- `Cannot find package '@vett/shared'`
- Workspace packages not resolving

**Root Cause:**
- Workspace structure not preserved
- Missing `pnpm-workspace.yaml`
- Incorrect package.json copying

**Solution:**
```dockerfile
# Copy workspace config first
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package.json files
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile
```

## Best Practices

### 1. Multi-Stage Builds

```dockerfile
FROM node:20-alpine AS base
# Base image with pnpm and build tools

FROM base AS builder
# Install all deps (including devDependencies)
# Build packages

FROM base AS runner
# Install only production deps
# Copy built files
```

### 2. Layer Caching

```dockerfile
# Copy package.json files first (changes less frequently)
COPY package.json pnpm-lock.yaml ./

# Install dependencies (cached if package.json unchanged)
RUN pnpm install

# Copy source files last (changes frequently)
COPY src ./src
```

### 3. Production Dependencies

```dockerfile
# Install ALL workspace production deps
# Don't filter or prune - breaks transitive deps
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
```

### 4. Verify Dependencies

```dockerfile
# Add verification step
RUN test -d node_modules/@sentry/node || (echo "ERROR: @sentry/node not found" && exit 1)
```

## Current Dockerfile Strategy

### Builder Stage
1. Copy workspace config files
2. Copy package.json files
3. Install ALL dependencies (dev + prod)
4. Build packages
5. Copy source files
6. Build application

### Runner Stage
1. Copy workspace config files
2. Copy package.json files
3. Install ONLY production dependencies
4. Copy built files
5. Verify critical dependencies
6. Create non-root user
7. Start application

## Debugging Tips

### Check What's Installed
```dockerfile
RUN ls -la node_modules/@sentry/ || echo "Not found"
RUN pnpm list --depth=0
```

### Check Workspace Structure
```dockerfile
RUN cat pnpm-workspace.yaml
RUN ls -la packages/shared/
```

### Check Build Output
```dockerfile
RUN ls -la dist/
RUN ls -la packages/shared/dist/
```

## Railway-Specific Issues

### Build Fails
- Check Dockerfile path: `apps/api/Dockerfile`
- Check root directory: Leave empty
- Check build logs for specific errors

### Runtime Crashes
- Check environment variables are set
- Check database/Redis connections
- Check logs in Railway dashboard

### Missing Dependencies
- Verify `pnpm-lock.yaml` is committed
- Check `package.json` dependencies
- Ensure workspace structure is correct

---

**Last Updated:** After fixing `@sentry/node` missing dependency issue

