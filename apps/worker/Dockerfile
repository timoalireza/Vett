# Dockerfile for Vett Worker
# 
# Build: docker build -t vett-worker -f apps/worker/Dockerfile .
# Run: docker run --env-file apps/worker/.env.production vett-worker

FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9.12.0

FROM base AS deps
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY apps/worker/package.json ./apps/worker/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter vett-worker...

FROM base AS builder
WORKDIR /app

# Copy workspace files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .

# Build shared package first
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

