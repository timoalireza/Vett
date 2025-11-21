# Dockerfile for Vett API
# 
# Build: docker build -t vett-api -f apps/api/Dockerfile .
# Run: docker run -p 4000:4000 --env-file apps/api/.env.production vett-api

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

COPY apps/api/package.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/tsup.config.ts ./apps/api/

# Install all dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Build shared package first
RUN pnpm --filter @vett/shared build

# Copy API source files (including loaders directory)
COPY apps/api/src ./apps/api/src

# Verify loaders directory was copied (for debugging)
RUN test -d apps/api/src/loaders || (echo "ERROR: loaders directory not found" && ls -la apps/api/src/ && exit 1)

# Build API (ensure we're in the right directory)
WORKDIR /app/apps/api
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
COPY apps/api/package.json ./apps/api/

# Install production dependencies with hoisting enabled
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy package.json to root for Node.js module type detection
# This fixes the MODULE_TYPELESS_PACKAGE_JSON warning
COPY apps/api/package.json ./package.json

# Create uploads directory with proper permissions before switching to non-root user
RUN mkdir -p /app/uploads && \
    chmod 755 /app/uploads

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Change ownership of uploads directory to nodejs user
RUN chown -R nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 4000

# Ensure we're in /app directory (where dist/ is located)
WORKDIR /app

# Use absolute path to be explicit
CMD ["node", "/app/dist/index.js"]
