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
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy package files
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/tsup.config.ts ./packages/shared/
COPY packages/shared/src ./packages/shared/src

COPY apps/api/package.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/

# Install all dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Build shared package first
RUN pnpm --filter @vett/shared build

# Copy API source files
COPY apps/api/src ./apps/api/src

# Build API
RUN pnpm --filter vett-api build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install ONLY production dependencies for the specific package
# Don't use --filter with install, install everything then we'll only use what we need
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Verify critical dependencies exist
RUN test -d node_modules/@sentry/node || (echo "ERROR: @sentry/node not found" && ls -la node_modules/@sentry/ && exit 1)

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

USER nodejs

EXPOSE 4000

CMD ["node", "dist/index.js"]
