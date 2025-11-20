# Vett Monorepo

This repository houses the Vett credibility platform, including the mobile application, backend API, worker services, and shared libraries.

## Structure

- `apps/api` – Fastify + GraphQL API.
- `apps/worker` – Background processors (BullMQ) for asynchronous pipelines.
- `apps/mobile` – Expo React Native client.
- `packages/shared` – Shared TypeScript utilities, schemas, and types.
- `docs` – Architecture plans, product specifications.

## Getting Started

1. Install `pnpm` (minimum v9).
2. Install dependencies: `pnpm install`.
3. Bring up local infrastructure (Postgres + Redis):
   - `docker compose up -d db redis`
4. Copy `.env.example` to `.env` in each app and populate credentials.
5. Start services:
   - API: `pnpm dev:api`
   - Worker: `pnpm dev:worker`
   - Mobile: `pnpm dev:mobile`

## Database

- Configure `DATABASE_URL` in `apps/api/.env`.
- Generate migrations from the Drizzle schema: `pnpm --filter vett-api db:generate`
- Apply migrations to the target database: `pnpm --filter vett-api db:migrate`
- Explore data locally: `pnpm --filter vett-api db:studio`
- Redis is required for job orchestration; configure `REDIS_URL` alongside `DATABASE_URL`.

> Note: External API keys (OpenAI, Anthropic, Brave, etc.) are required for full functionality.

## Development Standards

- TypeScript strict mode enabled across packages.
- ESLint + Prettier configured via workspace scripts.
- Husky + lint-staged enforce formatting on commit.
- Tests executed with `pnpm test`.

## Documentation

Refer to `docs/architecture.md` for the detailed implementation roadmap and system design.

