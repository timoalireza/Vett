# Subscription Plans Implementation

## Overview

Vett implements a three-tier subscription model with usage tracking and plan-based feature restrictions.

## Plans

### FREE Tier
- **Price**: €0/month
- **Limits**:
  - 10 analyses per month
  - Basic score + summary + sources
  - Watermark on result cards
  - History retention: 30 days
  - Max sources: 5
- **Features**:
  - Standard processing speed
  - No advanced interpretations

### PLUS Tier
- **Price**: €2.99/month or €19.99/year
- **Limits**:
  - Unlimited analyses
  - No watermark
  - Unlimited history
  - Max sources: 10
- **Features**:
  - Priority processing
  - Download/share results
  - Extended source list

### PRO Tier
- **Price**: €6.99/month or €49.99/year
- **Limits**:
  - Unlimited analyses
  - No watermark
  - Unlimited history
  - Max sources: 20
- **Features**:
  - Everything in PLUS, plus:
  - Advanced bias analysis
  - Extended summaries
  - Cross-platform sync
  - Custom alerts for specific topics

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
- `clerk_subscription_id`: External subscription ID

### `user_usage` Table
- `id`: UUID primary key
- `user_id`: Foreign key to users (unique)
- `analyses_count`: Integer (count for current period)
- `period_start`: Timestamp
- `period_end`: Timestamp
- `last_reset_at`: Timestamp

## Usage Tracking

Usage is tracked per billing period:
- **Monthly plans**: Resets on the 1st of each month
- **Annual plans**: Resets on anniversary date
- **FREE tier**: Resets monthly

Usage is automatically incremented when:
- User submits an analysis (`submitAnalysis` mutation)
- Analysis is successfully queued

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
      maxAnalysesPerMonth
      hasWatermark
      historyRetentionDays
      hasPriorityProcessing
      hasAdvancedBiasAnalysis
      hasExtendedSummaries
      hasCrossPlatformSync
      hasCustomAlerts
      maxSources
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
- Returns error if monthly limit reached (FREE tier)
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
- `apps/api/src/services/subscription-service.ts` - Subscription logic
- `apps/api/src/services/analysis-service.ts` - Analysis with watermark
- `apps/api/src/resolvers/index.ts` - GraphQL resolvers
- `apps/api/src/graphql/schema.ts` - GraphQL schema
- `apps/api/src/types/subscription.ts` - TypeScript types

## Migration Required

Run database migration to create new tables:
```bash
pnpm --filter vett-api db:generate
pnpm --filter vett-api db:migrate
```

## Next Steps

1. **Payment Integration**: Integrate with Stripe/Paddle for subscription management
2. **Webhooks**: Set up webhooks for subscription events (upgrade, cancel, etc.)
3. **History Cleanup**: Implement scheduled job to delete old analyses for FREE tier
4. **Analytics**: Track conversion rates and plan distribution
5. **Mobile UI**: Add subscription management UI in mobile app

