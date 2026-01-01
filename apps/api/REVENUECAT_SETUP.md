# RevenueCat Backend Integration Setup Guide

This guide covers setting up RevenueCat webhook integration for subscription management in the Vett API.

## Prerequisites

1. **RevenueCat Account**: Sign up at [revenuecat.com](https://www.revenuecat.com)
2. **RevenueCat API Key**: Get from RevenueCat dashboard (Project Settings → API Keys)
3. **RevenueCat Webhook Secret**: Configure in RevenueCat dashboard (Project Settings → Webhooks)

## Step 1: Configure Environment Variables

Add the following to your `.env` file or deployment environment:

```bash
# RevenueCat Configuration
REVENUECAT_API_KEY=your_revenuecat_secret_api_key_here
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here
```

**Important**:
- `REVENUECAT_API_KEY` (backend) is a **RevenueCat Secret API key** from RevenueCat Dashboard → Project Settings → API Keys → **Secret API keys**
- This is **NOT** the mobile SDK key and it will **not** start with `test_`

**Note**: The webhook secret is optional but recommended for production. If not set, webhook verification will be skipped (useful for development).

## Step 2: Run Database Migration

The schema has been updated to include RevenueCat fields. Run the migration:

```bash
cd apps/api
pnpm drizzle-kit generate --name add_revenuecat_fields
pnpm drizzle-kit migrate
```

Or if using a migration tool:

```bash
# Generate migration
pnpm drizzle-kit generate

# Apply migration
pnpm drizzle-kit migrate
```

## Step 3: Configure RevenueCat Dashboard

### 3.1 Create Products

In RevenueCat dashboard, create products matching your subscription plans:

1. Go to **Products** → **Create Product**
2. Create products for each plan:
   - `vett_plus_monthly` - Plus plan, monthly billing
   - `vett_plus_annual` - Plus plan, annual billing
   - `vett_pro_monthly` - Pro plan, monthly billing
   - `vett_pro_annual` - Pro plan, annual billing

### 3.2 Create Entitlements

Create entitlements that map to subscription plans:

1. Go to **Entitlements** → **Create Entitlement**
2. Create entitlements:
   - `plus` - Maps to PLUS plan
   - `pro` - Maps to PRO plan

### 3.3 Configure Offerings

Create an offering that packages your products:

1. Go to **Offerings** → **Create Offering**
2. Add packages:
   - Monthly package with `vett_plus_monthly` and `vett_pro_monthly`
   - Annual package with `vett_plus_annual` and `vett_pro_annual`

### 3.4 Configure Webhook

1. Go to **Project Settings** → **Webhooks**
2. Add webhook URL: `https://your-api-domain.com/webhooks/revenuecat`
3. Enable events:
   - `INITIAL_PURCHASE`
   - `RENEWAL`
   - `CANCELLATION`
   - `UNCANCELLATION`
   - `EXPIRATION`
   - `BILLING_ISSUE`
   - `PRODUCT_CHANGE`
4. Copy the webhook secret and add it to your environment variables

## Step 4: Configure App Store Connect / Google Play Console

### iOS (App Store Connect)

1. Create in-app purchase products matching RevenueCat product IDs:
   - `vett_plus_monthly`
   - `vett_plus_annual`
   - `vett_pro_monthly`
   - `vett_pro_annual`

2. Set up subscription groups and pricing

### Android (Google Play Console)

1. Create subscription products matching RevenueCat product IDs
2. Set up pricing and availability

## Step 5: Test Webhook Integration

### Test Webhook Locally

Use a tool like [ngrok](https://ngrok.com/) to expose your local server:

```bash
ngrok http 4000
```

Then update the webhook URL in RevenueCat dashboard to your ngrok URL.

### Test Webhook Events

RevenueCat provides a test mode. Enable it in the dashboard and make test purchases.

## Step 6: Verify Integration

1. Make a test purchase in your app
2. Check RevenueCat dashboard for the event
3. Check your API logs for webhook processing
4. Verify subscription status in your database

## API Endpoints

### Webhook Endpoint

- **URL**: `POST /webhooks/revenuecat`
- **Authentication**: Bearer token (webhook secret)
- **Content-Type**: `application/json`

### Manual Sync (for debugging)

You can manually sync a user's subscription:

```typescript
import { syncUserSubscriptionFromRevenueCat } from './services/revenuecat-sync';

await syncUserSubscriptionFromRevenueCat('clerk_user_id');
```

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is correct and accessible
2. Verify webhook secret matches
3. Check RevenueCat dashboard logs
4. Check API server logs for errors

### Subscription Not Updating

1. Verify webhook events are being received
2. Check database for subscription records
3. Verify user ID mapping (Clerk ID → RevenueCat app_user_id)
4. Check API logs for processing errors

### Plan Mapping Issues

If plans aren't mapping correctly:

1. Check entitlement IDs match in `revenuecat-service.ts`
2. Verify product IDs contain plan identifiers (e.g., "pro", "plus")
3. Check webhook event payload for entitlement_ids

## Security Notes

- **Webhook Secret**: Always use a webhook secret in production
- **HTTPS**: Webhook endpoint must use HTTPS in production
- **Signature Verification**: Currently basic - implement full HMAC SHA256 verification for production

## Next Steps

1. ✅ Configure RevenueCat dashboard
2. ✅ Set up products in App Store Connect / Google Play
3. ✅ Test webhook integration
4. ✅ Monitor webhook events in production
5. ⏳ Implement full HMAC signature verification
6. ⏳ Add webhook retry handling
7. ⏳ Add webhook event logging/auditing

## Related Files

- `apps/api/src/services/revenuecat-service.ts` - RevenueCat service logic
- `apps/api/src/routes/revenuecat-webhook.ts` - Webhook route handler
- `apps/api/src/services/revenuecat-sync.ts` - Manual sync utility
- `apps/mobile/src/services/revenuecat.ts` - Mobile RevenueCat SDK integration

