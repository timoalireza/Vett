import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { subscriptions, users } from "../db/schema.js";
import { subscriptionService } from "./subscription-service.js";
import { userService } from "./user-service.js";
import type { SubscriptionPlan, SubscriptionStatus, BillingCycle } from "../types/subscription.js";
import { env } from "../env.js";

/**
 * RevenueCat webhook event types
 */
export interface RevenueCatWebhookEvent {
  event: {
    id: string;
    type: RevenueCatEventType;
    app_user_id: string; // This is the Clerk user ID we set
    app_id: string;
    product_id?: string;
    period_type?: "NORMAL" | "TRIAL" | "INTRO";
    purchased_at_ms?: number;
    expiration_at_ms?: number;
    environment: "SANDBOX" | "PRODUCTION";
    entitlement_ids?: string[];
    presented_offering_id?: string;
    transaction_id?: string;
    original_transaction_id?: string;
    is_family_share?: boolean;
    country_code?: string;
    currency?: string;
    price?: number;
    price_in_purchased_currency?: number;
    subscriber_attributes?: Record<string, unknown>;
  };
}

export type RevenueCatEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "CANCELLATION"
  | "UNCANCELLATION"
  | "NON_RENEWING_PURCHASE"
  | "SUBSCRIPTION_PAUSED"
  | "EXPIRATION"
  | "BILLING_ISSUE"
  | "PRODUCT_CHANGE"
  | "SUBSCRIPTION_EXTENDED"
  | "SUBSCRIPTION_EXTENSION_REVOKED"
  | "TRANSFER";

/**
 * Map RevenueCat entitlement IDs to our subscription plans
 */
const ENTITLEMENT_TO_PLAN: Record<string, SubscriptionPlan> = {
  "pro": "PRO",
  "plus": "PLUS",
  "premium": "PRO", // Alternative name
  "basic": "PLUS" // Alternative name
};

/**
 * Map RevenueCat period type to billing cycle
 */
function mapPeriodTypeToBillingCycle(periodType?: string): BillingCycle {
  if (periodType === "INTRO" || periodType === "TRIAL") {
    return "MONTHLY"; // Default to monthly for trials/intros
  }
  // Check product ID for annual vs monthly
  // This will be handled by checking the product_id in the webhook
  return "MONTHLY";
}

/**
 * Map RevenueCat event type to subscription status
 */
function mapEventTypeToStatus(eventType: RevenueCatEventType): SubscriptionStatus {
  switch (eventType) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
    case "SUBSCRIPTION_EXTENDED":
      return "ACTIVE";
    case "CANCELLATION":
      return "CANCELLED";
    case "EXPIRATION":
      return "CANCELLED";
    case "BILLING_ISSUE":
      return "PAST_DUE";
    case "SUBSCRIPTION_PAUSED":
      return "CANCELLED";
    case "SUBSCRIPTION_EXTENSION_REVOKED":
      return "CANCELLED";
    default:
      return "ACTIVE";
  }
}

/**
 * Extract plan from RevenueCat entitlement or product
 */
function extractPlan(event: RevenueCatWebhookEvent["event"]): SubscriptionPlan {
  // First try to get plan from entitlement IDs
  if (event.entitlement_ids && event.entitlement_ids.length > 0) {
    const entitlementId = event.entitlement_ids[0].toLowerCase();
    if (ENTITLEMENT_TO_PLAN[entitlementId]) {
      return ENTITLEMENT_TO_PLAN[entitlementId];
    }
  }

  // Fallback to product ID
  if (event.product_id) {
    const productId = event.product_id.toLowerCase();
    // Check if product ID contains plan info (e.g., "vett_pro_monthly" -> "PRO")
    if (productId.includes("pro")) {
      return "PRO";
    }
    if (productId.includes("plus")) {
      return "PLUS";
    }
  }

  // Default to FREE if we can't determine
  return "FREE";
}

/**
 * Determine billing cycle from product ID or period type
 */
function extractBillingCycle(event: RevenueCatWebhookEvent["event"]): BillingCycle {
  if (event.product_id) {
    const productId = event.product_id.toLowerCase();
    if (productId.includes("annual") || productId.includes("year")) {
      return "ANNUAL";
    }
  }

  return mapPeriodTypeToBillingCycle(event.period_type);
}

/**
 * Handle RevenueCat webhook event
 */
export async function handleRevenueCatWebhook(event: RevenueCatWebhookEvent): Promise<void> {
  const { event: webhookEvent } = event;
  const clerkUserId = webhookEvent.app_user_id;

  console.log("[RevenueCat] Processing webhook event:", {
    type: webhookEvent.type,
    appUserId: clerkUserId,
    productId: webhookEvent.product_id,
    entitlementIds: webhookEvent.entitlement_ids,
    environment: webhookEvent.environment
  });

  // Get or create user in our database
  const dbUserId = await userService.getOrCreateUser(clerkUserId);

  // Find existing subscription
  const existingSubscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, dbUserId)
  });

  // Extract plan and billing cycle
  const plan = extractPlan(webhookEvent);
  const billingCycle = extractBillingCycle(webhookEvent);
  const status = mapEventTypeToStatus(webhookEvent.type);

  // Calculate period dates
  const now = new Date();
  let periodStart = now;
  let periodEnd = new Date(now);

  if (webhookEvent.purchased_at_ms) {
    periodStart = new Date(webhookEvent.purchased_at_ms);
  }

  if (webhookEvent.expiration_at_ms) {
    periodEnd = new Date(webhookEvent.expiration_at_ms);
  } else {
    // Calculate period end based on billing cycle
    if (billingCycle === "ANNUAL") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
  }

  // Determine if subscription should cancel at period end
  const cancelAtPeriodEnd =
    webhookEvent.type === "CANCELLATION" || webhookEvent.type === "EXPIRATION";

  if (existingSubscription) {
    // Update existing subscription
    await db
      .update(subscriptions)
      .set({
        plan,
        status,
        billingCycle,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd,
        revenueCatCustomerId: clerkUserId,
        revenueCatSubscriptionId: webhookEvent.transaction_id || webhookEvent.original_transaction_id || null,
        updatedAt: now
      })
      .where(eq(subscriptions.userId, dbUserId));

    console.log("[RevenueCat] Updated subscription:", {
      userId: dbUserId,
      plan,
      status,
      billingCycle
    });
  } else {
    // Create new subscription
    await db.insert(subscriptions).values({
      userId: dbUserId,
      plan,
      status,
      billingCycle,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd,
      revenueCatCustomerId: clerkUserId,
      revenueCatSubscriptionId: webhookEvent.transaction_id || webhookEvent.original_transaction_id || null
    });

    console.log("[RevenueCat] Created subscription:", {
      userId: dbUserId,
      plan,
      status,
      billingCycle
    });
  }

  // Reset usage if this is a new purchase or renewal
  if (webhookEvent.type === "INITIAL_PURCHASE" || webhookEvent.type === "RENEWAL") {
    await subscriptionService.getOrCreateUsage(dbUserId, periodStart, periodEnd);
  }
}

/**
 * Verify RevenueCat webhook signature
 */
export function verifyRevenueCatWebhook(
  payload: string,
  signature: string
): boolean {
  if (!env.REVENUECAT_WEBHOOK_SECRET) {
    console.warn("[RevenueCat] Webhook secret not configured, skipping verification");
    return true; // Allow in development
  }

  // RevenueCat uses HMAC SHA256 for webhook verification
  // The signature is sent in the Authorization header as "Bearer <signature>"
  // For now, we'll do basic verification - in production, implement proper HMAC verification
  // See: https://docs.revenuecat.com/docs/webhooks#webhook-signature-verification
  
  // Basic check: ensure signature exists
  if (!signature || signature.trim() === "") {
    return false;
  }

  // TODO: Implement proper HMAC SHA256 verification
  // const crypto = require('crypto');
  // const expectedSignature = crypto
  //   .createHmac('sha256', env.REVENUECAT_WEBHOOK_SECRET)
  //   .update(payload)
  //   .digest('hex');
  // return signature === expectedSignature;

  return true;
}

/**
 * Sync subscription from RevenueCat API
 * This can be called to manually sync a user's subscription status
 */
export async function syncSubscriptionFromRevenueCat(clerkUserId: string): Promise<void> {
  if (!env.REVENUECAT_API_KEY) {
    throw new Error("RevenueCat API key not configured");
  }

  // Call RevenueCat REST API to get customer info
  // See: https://docs.revenuecat.com/reference/get-subscriber
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(clerkUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${env.REVENUECAT_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`RevenueCat API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Process the customer info similar to webhook handling
  // This is a simplified version - you may need to adjust based on RevenueCat API response
  const subscriber = data.subscriber;
  if (!subscriber) {
    console.log("[RevenueCat] No subscriber found for:", clerkUserId);
    return;
  }

  // Get active entitlements
  const activeEntitlements = Object.keys(subscriber.entitlements?.active || {});
  
  if (activeEntitlements.length === 0) {
    // No active subscription - set to FREE
    const dbUserId = await userService.getOrCreateUser(clerkUserId);
    await subscriptionService.updateSubscription(dbUserId, "FREE", "MONTHLY");
    return;
  }

  // Process first active entitlement (assuming one subscription at a time)
  const entitlementId = activeEntitlements[0];
  const entitlement = subscriber.entitlements.active[entitlementId];
  
  // Create a synthetic webhook event to reuse existing logic
  const syntheticEvent: RevenueCatWebhookEvent = {
    event: {
      id: `sync-${Date.now()}`,
      type: "RENEWAL", // Assume renewal for sync
      app_user_id: clerkUserId,
      app_id: data.app_id || "",
      product_id: entitlement.product_identifier,
      period_type: entitlement.period_type,
      purchased_at_ms: entitlement.purchase_date_ms,
      expiration_at_ms: entitlement.expires_date_ms,
      environment: data.environment || "PRODUCTION",
      entitlement_ids: [entitlementId],
      transaction_id: entitlement.original_transaction_id,
      original_transaction_id: entitlement.original_transaction_id
    }
  };

  await handleRevenueCatWebhook(syntheticEvent);
}

