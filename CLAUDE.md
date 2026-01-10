# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vett is a credibility analysis platform that validates claims, detects bias, and scores content from social media posts to scientific claims. The system uses AI-powered analysis with multiple external APIs for fact-checking and source validation.

## Commands

### Development
```bash
pnpm install                    # Install all dependencies
docker compose up -d db redis   # Start local Postgres + Redis
pnpm dev:api                    # Start API server (port 4000)
pnpm dev:worker                 # Start background worker
pnpm dev:mobile                 # Start Expo mobile app
```

### Testing
```bash
pnpm test                       # Run all tests across workspaces
pnpm --filter vett-api test     # Run API tests only
pnpm --filter vett-api test:watch  # Watch mode for API tests
pnpm --filter vett-api test:coverage  # Coverage report
```

### Database
```bash
pnpm --filter vett-api db:generate   # Generate Drizzle migrations
pnpm --filter vett-api db:migrate    # Apply migrations to database
pnpm --filter vett-api db:studio     # Open Drizzle Studio GUI
```

### Build & Lint
```bash
pnpm build      # Build all packages
pnpm lint       # Lint all packages
pnpm typecheck  # Type-check all packages
```

## Architecture

### Monorepo Structure (pnpm workspaces)
- `apps/api` - Fastify + Mercurius GraphQL API
- `apps/worker` - BullMQ background processor for analysis pipeline
- `apps/mobile` - Expo React Native app with expo-router
- `packages/shared` - Shared TypeScript types, Zod schemas, and utilities (`@vett/shared`)

### API (`apps/api`)
- **Framework**: Fastify with Mercurius (GraphQL)
- **Database**: Drizzle ORM with PostgreSQL, schema at `src/db/schema.ts`
- **Auth**: Clerk integration via `@clerk/fastify`
- **Job Queue**: BullMQ for async analysis jobs
- **Key Services** (`src/services/`):
  - `analysis-service.ts` - Core analysis orchestration
  - `subscription-service.ts` - Plan management with RevenueCat
  - `instagram-service.ts` - Instagram DM bot integration
  - `vettai-service.ts` - AI chat functionality

### Worker (`apps/worker`)
The analysis pipeline processes content through multiple stages in `src/pipeline/`:

**Epistemic Pipeline** (`pipeline/epistemic/`):
1. `stage1_claimParsing.ts` - Extract claims from content
2. `stage2_claimTyping.ts` - Classify claim types
3. `stage3_evidenceRetrieval.ts` - Gather supporting/refuting evidence
4. `stage4_failureModes.ts` - Detect epistemic issues
5. `stage5_scoring.ts` - Calculate final score (0-100 scale)
6. `stage6_explanation.ts` - Generate human-readable explanation

**Retrievers** (`pipeline/retrievers/`): Brave Search, Serper, Google Fact Check, Perplexity

**Score Bands** (defined in `@vett/shared`):
- 90-100: Strongly Supported
- 75-89: Supported
- 60-74: Plausible
- 45-59: Mixed
- 30-44: Weakly Supported
- 15-29: Mostly False
- 0-14: False

### Mobile (`apps/mobile`)
- **Navigation**: expo-router file-based routing in `app/`
- **Tabs**: Analyze, Collections, Profile (`app/(tabs)/`)
- **State**: React Query for server state, local state in `src/state/`
- **Components**: Reusable UI in `src/components/`
- **Auth**: Clerk Expo SDK with passkey support
- **Subscriptions**: RevenueCat integration

### Shared Package (`packages/shared`)
- `AnalysisJobPayload` / `AnalysisJobInput` - Job queue schemas
- `EpistemicResult` / `EpistemicPenalty` - Scoring result types
- `EPISTEMIC_SCORE_BANDS` - Score band definitions
- `getEpistemicScoreBand()` - Score to band mapping

## Database Schema

Key tables in `apps/api/src/db/schema.ts`:
- `users` - User accounts (Clerk external ID)
- `analyses` - Analysis results with scores, verdicts, and metadata
- `claims` - Extracted claims per analysis
- `sources` / `analysisSources` - Evidence sources
- `subscriptions` / `userUsage` - Plan and usage tracking
- `socialAccounts` - Linked Instagram accounts

## Environment Variables

Each app requires `.env` files. Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection for BullMQ
- `CLERK_*` - Clerk authentication
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` - LLM providers
- `BRAVE_API_KEY` / `SERPER_API_KEY` / `PERPLEXITY_API_KEY` - Search APIs
- `REVENUECAT_*` - Subscription management

## GraphQL Schema

The API exposes GraphQL at `/graphql` with:
- Queries: `analysis`, `analyses`, `subscription`, `usage`, `chatUsage`
- Mutations: `submitAnalysis`, `chatWithVettAI`, `verifyClaimRealtime`, `syncSubscription`

Schema defined in `apps/api/src/graphql/schema.ts`.
