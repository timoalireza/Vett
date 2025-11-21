# Dockerfile Final Fix - Copy node_modules Strategy

## Problem

pnpm workspace production installs (`pnpm install --prod`) were not installing all dependencies correctly, causing `ERR_MODULE_NOT_FOUND` errors at runtime.

## Root Cause

- pnpm workspaces use symlinks and nested node_modules
- Production installs with `--prod` flag don't always resolve transitive dependencies correctly
- Workspace structure breaks module resolution in Docker

## Solution

**Copy node_modules from builder stage** instead of reinstalling:

1. Builder stage installs ALL dependencies (dev + prod)
2. Runner stage copies node_modules from builder
3. Prune devDependencies to reduce image size
4. All production dependencies are guaranteed to be available

## Why This Works

- Builder stage has complete dependency tree
- Copying preserves pnpm workspace structure
- Pruning removes devDependencies but keeps all production deps
- Module resolution works because structure is intact

## Trade-offs

**Pros:**
- ✅ Guaranteed to have all dependencies
- ✅ Preserves workspace structure
- ✅ No module resolution issues

**Cons:**
- ⚠️ Slightly larger image (but pruned)
- ⚠️ Copies more files

## Current Strategy

```dockerfile
# Builder: Install all deps
RUN pnpm install --frozen-lockfile

# Runner: Copy node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Prune devDependencies
RUN pnpm prune --prod
```

This ensures all production dependencies are available while keeping image size reasonable.

---

**Status:** This should fix the `@sentry/node` and other missing dependency errors.

