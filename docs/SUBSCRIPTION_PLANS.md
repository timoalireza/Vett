# Subscription Plans Implementation

## Overview

Vett implements a three-tier subscription model with usage tracking and plan-based feature restrictions. Usage is tracked separately for in-app analyses and Instagram DM analyses.

## Plans

### FREE Tier
- **Price**: €0/month
- **Limits**:
  - 10 analyses per month (in-app)
  - 3 analyses per month (via Instagram DM)
  - Watermark on result cards
  - History retention: 30 days
  - Max sources: 10
- **Features**:
  - Standard processing speed
  - Basic fact-checking

### PLUS Tier
- **Price**: €2.99/month or €19.99/year
- **Limits**:
  - Unlimited analyses (in-app)
  - 10 analyses per month (via Instagram DM)
  - No watermark
  - Unlimited history
  - Max sources: 10
- **Features**:
  - Standard processing speed
  - Limited Vett Chat access (specifics TBD)

### PRO Tier
- **Price**: €6.99/month or €49.99/year
- **Limits**:
  - Unlimited analyses (in-app)
  - Unlimited analyses (via Instagram DM)
  - No watermark
  - Unlimited history
  - Max sources: 20
- **Features**:
  - Priority processing
  - Unlimited Vett Chat access

## Feature Comparison Table

| Feature | FREE | PLUS | PRO |
|---------|------|------|-----|
| App Analyses | 10/month | Unlimited | Unlimited |
| DM Analyses | 3/month | 10/month | Unlimited |
| Watermark | Yes | No | No |
| History Retention | 30 days | Unlimited | Unlimited |
| Max Sources | 10 | 10 | 20 |
| Processing Speed | Standard | Standard | Priority |
| Vett Chat | No | Limited | Unlimited |

## Database Schema

### `subscriptions` Table
- `id`: UUID primary key
- `user_id`: Foreign key to users (unique)
- `plan`: Enum (FREE, PLUS, PRO)
- `status`: Enum (ACTIVE, CANCELLED, PAST_DUE, TRIALING)
- `billing_cycle`: Enum (MONTHLY, ANNUAL)
- `current_period_start`: Timestamp
- `current_period_end`: Timestamp
- `cancel_at_period_end`: Boolean
- `clerk_subscription_id`: External subscription ID (legacy)
- `revenuecat_customer_id`: RevenueCat customer ID
- `revenuecat_subscription_id`: RevenueCat subscription ID

### `user_usage` Table
- `id`: UUID primary key
- `user_id`: Foreign key to users (unique)
- `analyses_count`: Integer (count for current period - in-app analyses)
- `period_start`: Timestamp
- `period_end`: Timestamp
- `last_reset_at`: Timestamp

### `instagram_dm_usage` Table
- `id`: UUID primary key
- `instagram_user_id`: Instagram user ID (not FK)
- `analyses_count`: Integer (count for current period - DM analyses)
- `period_start`: Timestamp
- `period_end`: Timestamp
- `last_reset_at`: Timestamp

## Usage Tracking

### In-App Analyses
Usage is tracked per billing period in `user_usage` table:
- **Monthly plans**: Resets on the 1st of each month
- **Annual plans**: Resets on anniversary date
- **FREE tier**: Limited to 10 analyses/month

Usage is automatically incremented when:
- User submits an analysis (`submitAnalysis` mutation)
- Analysis is successfully queued

### Instagram DM Analyses
Usage is tracked per month in `instagram_dm_usage` table:
- **FREE tier**: Limited to 3 DM analyses/month
- **PLUS tier**: Limited to 10 DM analyses/month
- **PRO tier**: Unlimited DM analyses

Usage is checked and incremented in `instagram-service.ts` when:
- User sends content to analyze via Instagram DM
- Content is successfully queued for analysis

## API Endpoints

### GraphQL Queries

#### `subscription`
Returns current subscription information:
```graphql
query {
  subscription {
    plan
    status
    billingCycle
    currentPeriodStart
    currentPeriodEnd
    cancelAtPeriodEnd
    limits {
      maxAppAnalysesPerMonth
      maxDmAnalysesPerMonth
      hasWatermark
      historyRetentionDays
      hasPriorityProcessing
      maxSources
      hasVettChat
      hasLimitedVettChat
    }
    prices {
      monthly
      annual
    }
    usage {
      analysesCount
      maxAnalyses
      periodStart
      periodEnd
      hasUnlimited
    }
  }
}
```

#### `usage`
Returns current usage information:
```graphql
query {
  usage {
    analysesCount
    maxAnalyses
    periodStart
    periodEnd
    hasUnlimited
  }
}
```

### GraphQL Mutations

#### `submitAnalysis`
Automatically checks limits before allowing submission:
- Returns error if monthly limit reached (FREE tier: 10/month)
- Increments usage counter on success
- Associates analysis with user

## Watermark Logic

Watermarks are applied based on plan:
- **FREE**: Always watermarked
- **PLUS/PRO**: No watermark
- **Unauthenticated**: Always watermarked

Watermark flag is included in `AnalysisSummary.hasWatermark` field.

## History Retention

History retention is enforced per plan:
- **FREE**: 30 days
- **PLUS/PRO**: Unlimited

The `getHistoryCutoffDate()` method returns the cutoff date for filtering old analyses.

## Implementation Files

- `apps/api/src/db/schema.ts` - Database schema
- `apps/api/src/services/subscription-service.ts` - Subscription logic & plan limits
- `apps/api/src/services/instagram-service.ts` - Instagram DM usage tracking
- `apps/api/src/services/analysis-service.ts` - Analysis with watermark
- `apps/api/src/resolvers/index.ts` - GraphQL resolvers
- `apps/api/src/graphql/schema.ts` - GraphQL schema
- `apps/api/src/types/subscription.ts` - TypeScript types
- `apps/mobile/app/modals/subscription.tsx` - Paywall UI

## RevenueCat Integration

Subscriptions are managed via RevenueCat. See `apps/api/REVENUECAT_SETUP.md` for setup instructions.

### Product IDs (App Store Connect)
- `vett_plus_monthly` - Plus plan, monthly
- `vett_plus_annual` - Plus plan, annual
- `vett_pro_monthly` - Pro plan, monthly
- `vett_pro_annual` - Pro plan, annual

## Migration Required

Run database migration to create/update tables:
```bash
pnpm --filter vett-api db:generate
pnpm --filter vett-api db:migrate
```

## Future Features

### Vett Chat
- **PLUS**: Limited access (specifics to be defined)
- **PRO**: Unlimited access

Implementation pending - will be added as a separate feature.
