# RevenueCat Integration Summary

RevenueCat has been fully configured for membership functionality and feature integration. Here's what was implemented:

## ✅ Completed Components

### 1. Backend API Integration

#### Environment Configuration
- Added `REVENUECAT_API_KEY` to environment schema
- Added `REVENUECAT_WEBHOOK_SECRET` for webhook verification
- Updated `apps/api/src/env.ts` with RevenueCat configuration

#### Database Schema Updates
- Added `revenueCatCustomerId` field to `subscriptions` table
- Added `revenueCatSubscriptionId` field to `subscriptions` table
- Maintains backward compatibility with `clerkSubscriptionId`

#### RevenueCat Service (`apps/api/src/services/revenuecat-service.ts`)
- **Webhook Event Handling**: Processes all RevenueCat webhook events
- **Plan Mapping**: Maps RevenueCat entitlements/products to subscription plans (FREE, PLUS, PRO)
- **Status Mapping**: Converts RevenueCat event types to subscription statuses
- **Billing Cycle Detection**: Determines monthly vs annual from product IDs
- **Subscription Sync**: Manual sync function to fetch subscription from RevenueCat API
- **Webhook Verification**: Basic signature verification (HMAC SHA256 can be added)

#### Webhook Route (`apps/api/src/routes/revenuecat-webhook.ts`)
- **Endpoint**: `POST /webhooks/revenuecat`
- **Authentication**: Bearer token (webhook secret)
- **Error Handling**: Returns 200 OK even on errors to prevent retries
- **Logging**: Comprehensive logging for debugging

#### Subscription Service Updates
- Updated `updateSubscription()` to accept RevenueCat fields
- Maintains backward compatibility with Clerk subscription IDs

#### GraphQL Resolver Updates
- Subscription resolver now optionally syncs with RevenueCat
- Non-blocking sync - doesn't delay response if sync fails

### 2. Mobile App Integration (Already Exists)

The mobile app already has RevenueCat SDK integrated:
- ✅ RevenueCat SDK installed (`react-native-purchases`)
- ✅ Service layer (`apps/mobile/src/services/revenuecat.ts`)
- ✅ React hook (`apps/mobile/src/hooks/use-revenuecat.ts`)
- ✅ Auth sync with Clerk (`apps/mobile/app/_layout-revenuecat.tsx`)
- ✅ Subscription modal (`apps/mobile/app/modals/subscription.tsx`)

## 📋 Next Steps for Full Setup

### 1. Database Migration

Run the migration to add RevenueCat fields:

```bash
cd apps/api
pnpm drizzle-kit generate --name add_revenuecat_fields
pnpm drizzle-kit migrate
```

### 2. Configure Environment Variables

Add to your `.env` or deployment environment:

```bash
REVENUECAT_API_KEY=your_revenuecat_api_key
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret  # Optional but recommended
```

### 3. RevenueCat Dashboard Configuration

1. **Create Products**:
   - `vett_plus_monthly`
   - `vett_plus_annual`
   - `vett_pro_monthly`
   - `vett_pro_annual`

2. **Create Entitlements**:
   - `plus` → Maps to PLUS plan
   - `pro` → Maps to PRO plan

3. **Create Offering**: Package products into monthly/annual offerings

4. **Configure Webhook**:
   - URL: `https://your-api-domain.com/webhooks/revenuecat`
   - Events: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `UNCANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, `PRODUCT_CHANGE`
   - Copy webhook secret

### 4. App Store / Play Store Setup

- Create in-app purchase products matching RevenueCat product IDs
- Configure subscription groups and pricing
- Link products to RevenueCat

### 5. Testing

1. Test webhook locally using ngrok
2. Make test purchases in sandbox/test mode
3. Verify subscription updates in database
4. Check webhook events in RevenueCat dashboard

## 🔧 How It Works

### Purchase Flow

1. **User purchases** subscription in mobile app via RevenueCat SDK
2. **RevenueCat processes** payment with App Store/Google Play
3. **RevenueCat sends webhook** to `/webhooks/revenuecat`
4. **Backend processes** webhook event:
   - Maps entitlement/product to subscription plan
   - Updates or creates subscription record
   - Sets billing cycle and period dates
   - Updates subscription status
5. **GraphQL subscription query** returns updated subscription info

### Subscription Sync

- **Automatic**: Webhooks keep subscription in sync
- **On-Demand**: GraphQL subscription resolver optionally syncs on query
- **Manual**: `syncUserSubscriptionFromRevenueCat()` function available

### Plan Mapping

The system maps RevenueCat entitlements/products to subscription plans:

- Entitlement `pro` → PRO plan
- Entitlement `plus` → PLUS plan
- Product ID containing `pro` → PRO plan
- Product ID containing `plus` → PLUS plan
- Default → FREE plan

## 📁 Files Created/Modified

### Created
- `apps/api/src/services/revenuecat-service.ts` - RevenueCat service
- `apps/api/src/routes/revenuecat-webhook.ts` - Webhook route
- `apps/api/src/services/revenuecat-sync.ts` - Sync utility
- `apps/api/REVENUECAT_SETUP.md` - Detailed setup guide

### Modified
- `apps/api/src/env.ts` - Added RevenueCat env vars
- `apps/api/src/db/schema.ts` - Added RevenueCat fields
- `apps/api/src/services/subscription-service.ts` - Added RevenueCat support
- `apps/api/src/resolvers/index.ts` - Added RevenueCat sync
- `apps/api/src/index.ts` - Registered webhook route

## 🔒 Security Considerations

1. **Webhook Secret**: Always use in production
2. **HTTPS**: Required for webhook endpoint
3. **Signature Verification**: Currently basic - implement full HMAC SHA256 for production
4. **Rate Limiting**: Webhook endpoint should be excluded from rate limiting

## 📚 Documentation

- **Setup Guide**: `apps/api/REVENUECAT_SETUP.md`
- **Mobile Setup**: `apps/mobile/REVENUECAT_SETUP.md`
- **RevenueCat Docs**: https://docs.revenuecat.com

## ✨ Features Enabled

With RevenueCat configured, you can now:

- ✅ Process subscription purchases
- ✅ Handle subscription renewals
- ✅ Handle cancellations and expirations
- ✅ Sync subscription status from RevenueCat
- ✅ Support both monthly and annual billing
- ✅ Track subscription history
- ✅ Handle billing issues
- ✅ Support product upgrades/downgrades

## 🐛 Troubleshooting

See `apps/api/REVENUECAT_SETUP.md` for detailed troubleshooting guide.

Common issues:
- Webhook not receiving events → Check URL and webhook secret
- Subscription not updating → Check webhook processing logs
- Plan mapping incorrect → Verify entitlement/product IDs

