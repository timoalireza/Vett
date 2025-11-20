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
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy package files
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/tsup.config.ts ./packages/shared/
COPY packages/shared/src ./packages/shared/src

COPY apps/worker/package.json ./apps/worker/
COPY apps/worker/tsconfig.json ./apps/worker/

# Install all dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Build shared package first
RUN pnpm --filter @vett/shared build

# Copy worker source files
COPY apps/worker/src ./apps/worker/src

# Build Worker
RUN pnpm --filter vett-worker build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/worker/package.json ./apps/worker/

# Install ONLY production dependencies
# Install all workspace deps to ensure transitive dependencies are available
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built files
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

USER nodejs

CMD ["node", "dist/index.js"]
