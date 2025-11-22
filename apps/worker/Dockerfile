# Dockerfile for Vett Worker
# 
# Build: docker build -t vett-worker -f apps/worker/Dockerfile .
# Run: docker run --env-file apps/worker/.env.production vett-worker

FROM node:20-alpine AS base

# Install pnpm and build dependencies
RUN npm install -g pnpm@9.12.0 && \
    apk add --no-cache libc6-compat python3 make g++

FROM base AS builder
WORKDIR /app

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json ./

# Copy package files
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/tsup.config.ts ./packages/shared/
COPY packages/shared/src ./packages/shared/src

# Worker needs API's db schema, so copy API files too
COPY apps/api/package.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/tsup.config.ts ./apps/api/
COPY apps/api/src/db ./apps/api/src/db

COPY apps/worker/package.json ./apps/worker/
COPY apps/worker/tsconfig.json ./apps/worker/
COPY apps/worker/tsup.config.ts ./apps/worker/

# Install all dependencies (including devDependencies for building)
# Add cache-busting ARG to force rebuild when lockfile changes
ARG CACHE_BUST=20241122
RUN pnpm install --frozen-lockfile

# Build shared package first
RUN pnpm --filter @vett/shared build

# Copy API source files (needed for building API)
COPY apps/api/src ./apps/api/src

# Build API db schema (needed by worker)
RUN pnpm --filter vett-api build

# Copy worker source files
COPY apps/worker/src ./apps/worker/src

# Build Worker (ensure we're in the right directory)
WORKDIR /app/apps/worker
RUN pnpm build
WORKDIR /app

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy pnpm config
COPY .npmrc ./

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/worker/package.json ./apps/worker/

# Install ONLY worker's production dependencies (not API's dependencies like mercurius)
# This prevents pnpm from hoisting mercurius from the API package
# Add cache-busting ARG to force rebuild when lockfile changes
ARG CACHE_BUST=20241122
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter vett-worker...

# Copy built files
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Worker imports from ../../api/src/db/schema.js, so copy API's db schema
COPY --from=builder /app/apps/api/dist/db ./apps/api/dist/db
COPY --from=builder /app/apps/api/src/db ./apps/api/src/db

# Worker needs API's database schema (it imports from ../../api/src/db/schema.js)
# Copy the built schema files from API
COPY --from=builder /app/apps/api/dist/db ./dist/db

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

USER nodejs

CMD ["node", "dist/index.js"]
