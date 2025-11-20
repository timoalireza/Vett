# Dockerfile for Vett Worker
# 
# Build: docker build -t vett-worker -f apps/worker/Dockerfile .
# Run: docker run --env-file apps/worker/.env.production vett-worker

FROM node:20-alpine AS base

# Install pnpm and build dependencies
RUN npm install -g pnpm@9.12.0 && \
    apk add --no-cache libc6-compat python3 make g++

FROM base AS deps
WORKDIR /app

# Copy workspace files (minimal for dependency installation)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/worker/package.json ./apps/worker/

# Install production dependencies only (for final image)
RUN pnpm install --frozen-lockfile --prod --filter vett-worker...

FROM base AS builder
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/worker ./apps/worker

# Install all dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Build shared package first (needs tsup from devDependencies)
RUN pnpm --filter @vett/shared build

# Build Worker
RUN pnpm --filter vett-worker build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

USER nodejs

CMD ["node", "dist/index.js"]

