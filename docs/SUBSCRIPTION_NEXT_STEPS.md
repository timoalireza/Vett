# Subscription Implementation - Next Steps

## ✅ Completed

1. **Database Schema**
   - Added `subscriptions` table
   - Added `user_usage` table
   - Added enums for plans, status, billing cycle
   - Migration generated: `drizzle/0002_watery_corsair.sql`

2. **Subscription Service**
   - Plan limits configuration
   - Usage tracking
   - Plan checking logic
   - Watermark determination
   - History retention calculation

3. **GraphQL Integration**
   - `subscription` query
   - `usage` query
   - `submitAnalysis` mutation with limit checking
   - Watermark flag in `AnalysisSummary`

4. **Analysis Service**
   - Watermark checking based on plan
   - User association with analyses

## 🔄 Immediate Next Steps

### 1. Run Database Migration
```bash
pnpm --filter vett-api db:migrate
```

### 2. Test Subscription Flow
- Create a test user
- Verify FREE plan is assigned by default
- Submit 10 analyses (should succeed)
- Submit 11th analysis (should fail with limit message)
- Verify watermark flag in responses

### 3. Payment Integration (Stripe Recommended)

#### Setup Stripe
1. Create Stripe account
2. Get API keys (test and live)
3. Create products:
   - Vett Plus Monthly: €2.99
   - Vett Plus Annual: €19.99
   - Vett Pro Monthly: €6.99
   - Vett Pro Annual: €49.99

#### Implement Stripe Integration
```typescript
// apps/api/src/services/payment-service.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session
async function createCheckoutSession(userId: string, plan: SubscriptionPlan, billingCycle: BillingCycle) {
  const priceId = getStripePriceId(plan, billingCycle);
  
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `${FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/subscription/cancel`,
    metadata: {
      userId,
      plan,
      billingCycle,
    },
  });
  
  return session;
}

// Handle webhook
async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      // Update subscription
      const session = event.data.object as Stripe.Checkout.Session;
      await subscriptionService.updateSubscription(
        session.metadata.userId,
        session.metadata.plan,
        session.metadata.billingCycle,
        session.subscription as string
      );
      break;
      
    case 'customer.subscription.updated':
      // Handle subscription changes
      break;
      
    case 'customer.subscription.deleted':
      // Downgrade to FREE
      break;
  }
}
```

### 4. Add GraphQL Mutations

```graphql
type Mutation {
  createCheckoutSession(plan: SubscriptionPlan!, billingCycle: BillingCycle!): CheckoutSession!
  cancelSubscription: Boolean!
  updateSubscription(plan: SubscriptionPlan!, billingCycle: BillingCycle!): SubscriptionInfo!
}

type CheckoutSession {
  url: String!
  sessionId: String!
}
```

### 5. History Cleanup Job

Create a scheduled job to delete old analyses for FREE tier users:

```typescript
// apps/api/src/jobs/cleanup-history.ts
import { subscriptionService } from '../services/subscription-service.js';
import { db } from '../db/client.js';
import { analyses } from '../db/schema.js';
import { lt } from 'drizzle-orm';

async function cleanupOldAnalyses() {
  // Get all FREE tier users
  const freeUsers = await db.query.subscriptions.findMany({
    where: eq(subscriptions.plan, 'FREE'),
  });
  
  for (const subscription of freeUsers) {
    const cutoffDate = await subscriptionService.getHistoryCutoffDate(subscription.userId);
    if (cutoffDate) {
      // Delete analyses older than cutoff
      await db
        .delete(analyses)
        .where(
          and(
            eq(analyses.userId, subscription.userId),
            lt(analyses.createdAt, cutoffDate)
          )
        );
    }
  }
}

// Run daily via cron or scheduled task
```

### 6. Mobile App Integration

#### Add Subscription UI
- Subscription status screen
- Plan comparison
- Upgrade/downgrade flows
- Usage display

#### Update Analysis Display
- Show watermark overlay for FREE tier
- Display usage counter
- Show upgrade prompts when limit reached

### 7. Analytics & Monitoring

Track key metrics:
- Conversion rate (FREE → PLUS/PRO)
- Average revenue per user (ARPU)
- Churn rate
- Plan distribution
- Usage patterns

## 📋 Testing Checklist

- [ ] FREE tier: 10 analyses limit enforced
- [ ] FREE tier: Watermark appears on results
- [ ] FREE tier: Old analyses deleted after 30 days
- [ ] PLUS tier: Unlimited analyses work
- [ ] PLUS tier: No watermark
- [ ] PRO tier: All features enabled
- [ ] Usage counter increments correctly
- [ ] Usage resets at period end
- [ ] Subscription upgrade flow works
- [ ] Subscription cancellation works
- [ ] Payment webhooks process correctly

## 🔒 Security Considerations

1. **Rate Limiting**: Prevent abuse of FREE tier
2. **Payment Verification**: Always verify webhook signatures
3. **Usage Validation**: Double-check limits server-side
4. **Watermark Security**: Don't allow client-side watermark removal

## 📊 Pricing Strategy Notes

- €2.99/month is optimized for EU market
- Annual plans provide ~30% discount (incentivizes commitment)
- FREE tier is tight enough to convert but generous enough to be useful
- PRO tier targets power users willing to pay premium

## 🚀 Launch Checklist

- [ ] Database migration applied
- [ ] Stripe integration complete
- [ ] Webhook endpoint secured
- [ ] Subscription UI implemented
- [ ] Usage tracking verified
- [ ] Watermark rendering tested
- [ ] History cleanup job scheduled
- [ ] Analytics tracking enabled
- [ ] Error handling tested
- [ ] Documentation complete

