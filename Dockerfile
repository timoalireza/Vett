# Unified Dockerfile for Vett API and Worker
# Build API: docker build --build-arg SERVICE=api -t vett-api .
# Build Worker: docker build --build-arg SERVICE=worker -t vett-worker .

ARG SERVICE=api
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

# Copy API files (needed for both API and worker)
COPY apps/api/package.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/tsup.config.ts ./apps/api/
COPY apps/api/src ./apps/api/src

# Copy worker files (needed for worker)
COPY apps/worker/package.json ./apps/worker/
COPY apps/worker/tsconfig.json ./apps/worker/
COPY apps/worker/tsup.config.ts ./apps/worker/
COPY apps/worker/src ./apps/worker/src

# Install all dependencies
ARG CACHE_BUST=20241122
RUN pnpm install --frozen-lockfile

# Build shared package first
RUN pnpm --filter @vett/shared build

# Build API (needed for worker's db schema)
RUN pnpm --filter vett-api build

# Build worker if SERVICE=worker
ARG SERVICE=api
RUN if [ "$SERVICE" = "worker" ]; then \
      cd /app/apps/worker && \
      pnpm build; \
    fi

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy pnpm config
COPY .npmrc ./

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/

ARG SERVICE=api

# Install production dependencies based on service
RUN if [ "$SERVICE" = "worker" ]; then \
      pnpm install --frozen-lockfile --prod --ignore-scripts --filter vett-worker...; \
    else \
      pnpm install --frozen-lockfile --prod --ignore-scripts; \
    fi

# Copy built files - always copy both, then select based on SERVICE
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Select the correct dist based on SERVICE
RUN mkdir -p /app/dist && \
    if [ "$SERVICE" = "worker" ]; then \
      cp -r /app/apps/worker/dist/* /app/dist/ && \
      cp -r /app/apps/api/src/db /app/dist/db && \
      mkdir -p /app/apps/api/src && \
      cp -r /app/apps/api/src/db /app/apps/api/src/db; \
    else \
      cp -r /app/apps/api/dist/* /app/dist/ && \
      cp /app/apps/api/package.json /app/package.json && \
      mkdir -p /app/uploads && \
      chmod 755 /app/uploads; \
    fi

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Change ownership (API only)
RUN if [ "$SERVICE" = "api" ]; then \
      chown -R nodejs:nodejs /app/uploads; \
    fi

USER nodejs

# Expose port
EXPOSE 4000

WORKDIR /app

CMD ["node", "dist/index.js"]
