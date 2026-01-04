# Subscription Sync Debugging Guide

## Issue
Subscription type is not updating after purchase, with no errors appearing in the mobile app.

## Root Cause Analysis

The subscription sync flow has multiple steps, and the issue could be at any of these points:

### 1. Mobile App Purchase Flow
✅ **Working**: RevenueCat SDK successfully processes purchases
✅ **Working**: Mobile app receives purchase confirmation
❓ **Unknown**: Whether `syncSubscription` mutation is being called
❓ **Unknown**: Whether the mutation is returning success or error

### 2. Backend API Configuration
❌ **CRITICAL**: `REVENUECAT_API_KEY` environment variable must be set in Railway
- This is a **server-side secret API key** from RevenueCat Dashboard
- Different from mobile SDK keys (`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`)
- Without this, the sync will fail with "RevenueCat sync not configured"

### 3. Product ID Mapping
The backend extracts subscription plan from:
1. **Entitlement IDs** (primary): `plus`, `pro`
2. **Product IDs** (fallback): Must contain `plus` or `pro` in the name

Expected product IDs:
- `com.timoalireza.vett.plus.monthly`
- `com.timoalireza.vett.plus.annual`
- `com.timoalireza.vett.pro.monthly`
- `com.timoalireza.vett.pro.annual`

## Changes Made

### Added Debug Logging

I've added comprehensive logging to track the subscription sync flow:

#### 1. RevenueCat Service (`apps/api/src/services/revenuecat-service.ts`)
- Logs when sync starts
- Logs RevenueCat API response (full JSON)
- Logs active entitlements found
- Logs product ID and entitlement extraction
- Logs plan and billing cycle determination
- Logs database update operations

#### 2. GraphQL Resolver (`apps/api/src/resolvers/index.ts`)
- Logs when `syncSubscription` mutation is called
- Logs sync progress
- Logs final subscription info returned
- Logs detailed error stack traces

## How to Debug

### Step 1: Check Railway Environment Variables

1. Go to Railway dashboard
2. Select your API service
3. Go to **Variables** tab
4. Verify these variables exist:
   - `REVENUECAT_API_KEY` - Secret API key (NOT the mobile SDK key)
   - `REVENUECAT_WEBHOOK_SECRET` (optional but recommended)

**To get the secret API key:**
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Navigate to **Project Settings** → **API Keys**
3. Look for **"Secret API keys"** section (NOT "Public app-specific API keys")
4. Copy the key (should look like `sk_...` or similar)

### Step 2: Check Railway Logs

After making a purchase in the mobile app:

1. Go to Railway dashboard
2. Select your API service
3. Go to **Deployments** → **Logs**
4. Look for these log entries:

```
[GraphQL] syncSubscription called for user: user_xxx
[GraphQL] Calling syncUserSubscriptionFromRevenueCat...
[RevenueCat Sync] Starting sync for user: user_xxx
[RevenueCat Sync] API response: {...}
[RevenueCat Sync] Active entitlements: ["plus"] or ["pro"]
[RevenueCat] Extracting plan from event: {...}
[RevenueCat] Plan from entitlement: PRO (or PLUS)
[RevenueCat] Billing cycle from product ID: ANNUAL (or MONTHLY)
[RevenueCat] ✅ Updated subscription in database: {...}
[GraphQL] Updated subscription info: {...}
```

### Step 3: Check for Errors

Look for these error patterns in logs:

#### Error: "RevenueCat API key not configured"
**Solution**: Add `REVENUECAT_API_KEY` to Railway environment variables

#### Error: "RevenueCat API error: 401"
**Solution**: The API key is invalid or expired. Get a new one from RevenueCat dashboard

#### Error: "RevenueCat API error: 404"
**Solution**: User not found in RevenueCat. This means:
- Purchase might not have completed
- User ID mismatch between mobile app and backend
- RevenueCat hasn't synced the purchase yet (wait a few seconds and retry)

#### Log: "No active entitlements - setting to FREE"
**Solution**: RevenueCat shows no active subscription. This means:
- Purchase was cancelled or refunded
- Entitlements not configured correctly in RevenueCat dashboard
- Wrong environment (sandbox vs production)

#### Log: "Could not determine plan, defaulting to FREE"
**Solution**: Product ID or entitlement ID doesn't match expected format:
- Check RevenueCat dashboard → Products
- Ensure product IDs contain "plus" or "pro"
- Check RevenueCat dashboard → Entitlements
- Ensure entitlement IDs are exactly "plus" or "pro" (lowercase)

### Step 4: Verify RevenueCat Dashboard Configuration

1. **Products** (RevenueCat Dashboard → Products):
   - `com.timoalireza.vett.plus.monthly`
   - `com.timoalireza.vett.plus.annual`
   - `com.timoalireza.vett.pro.monthly`
   - `com.timoalireza.vett.pro.annual`

2. **Entitlements** (RevenueCat Dashboard → Entitlements):
   - `plus` - attached to plus products
   - `pro` - attached to pro products

3. **Offerings** (RevenueCat Dashboard → Offerings):
   - Default offering with monthly and annual packages
   - Packages linked to correct products

### Step 5: Test the Sync Manually

You can test the sync without making a purchase:

1. Make a test purchase in RevenueCat Test Store or Apple Sandbox
2. In your mobile app, navigate to subscription screen
3. Pull down to refresh (if implemented) or restart the app
4. Check Railway logs for sync activity

## Mobile App Debugging

### Check if syncSubscription is being called

Look at the mobile app logs (Expo dev tools or Xcode console):

```
[GraphQL] Request: { hasToken: true, queryName: 'SyncSubscription', ... }
```

### Check the response

The mobile app should receive:
```json
{
  "success": true,
  "subscription": {
    "plan": "PRO",
    "status": "ACTIVE",
    ...
  }
}
```

Or if there's an error:
```json
{
  "success": false,
  "subscription": null,
  "error": "RevenueCat sync not configured"
}
```

## Quick Fix Checklist

- [ ] Add `REVENUECAT_API_KEY` to Railway environment variables
- [ ] Redeploy Railway API service
- [ ] Verify entitlements in RevenueCat dashboard are named `plus` and `pro`
- [ ] Verify product IDs contain `plus` or `pro` in the name
- [ ] Make a test purchase
- [ ] Check Railway logs for sync activity
- [ ] Check mobile app receives updated subscription info

## Next Steps

1. **First**: Add the `REVENUECAT_API_KEY` to Railway (this is likely the main issue)
2. **Then**: Make a test purchase and check the logs
3. **If still not working**: Share the Railway logs and I'll help debug further

## Webhook Setup (Optional but Recommended)

For real-time subscription updates without manual sync:

1. RevenueCat Dashboard → **Project Settings** → **Webhooks**
2. Add webhook URL: `https://api.vett.xyz/webhooks/revenuecat`
3. Enable events: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, etc.
4. Copy the webhook secret
5. Add `REVENUECAT_WEBHOOK_SECRET` to Railway environment variables

With webhooks, subscriptions will update automatically without needing the manual sync mutation.

