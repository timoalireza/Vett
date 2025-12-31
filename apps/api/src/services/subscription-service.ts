import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { subscriptions, userUsage } from "../db/schema.js";
import type { SubscriptionPlan, BillingCycle } from "../types/subscription.js";

export interface PlanLimits {
  // NOTE: `maxAnalysesPerMonth` is the name exposed via GraphQL (`PlanLimits.maxAnalysesPerMonth`).
  // null = unlimited (in-app analyses)
  maxAnalysesPerMonth: number | null;
  // null = unlimited (Instagram DM analyses)
  maxDmAnalysesPerMonth: number | null;
  hasWatermark: boolean;
  historyRetentionDays: number | null; // null = unlimited
  hasPriorityProcessing: boolean;
  // Feature flags (non-nullable in GraphQL schema)
  hasAdvancedBiasAnalysis: boolean;
  hasExtendedSummaries: boolean;
  hasCrossPlatformSync: boolean;
  hasCustomAlerts: boolean;
  maxSources: number;
  hasVettChat: boolean; // Full Vett Chat access (PRO only)
  hasLimitedVettChat: boolean; // Limited Vett Chat access (PLUS only, specifics TBD)
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    maxAnalysesPerMonth: 10, // 10 analyses per month via app
    maxDmAnalysesPerMonth: 3, // 3 analyses per month via DM
    hasWatermark: true,
    historyRetentionDays: 30, // 30 days history retention
    hasPriorityProcessing: false,
    hasAdvancedBiasAnalysis: false,
    hasExtendedSummaries: false,
    hasCrossPlatformSync: false,
    hasCustomAlerts: false,
    maxSources: 10,
    hasVettChat: false,
    hasLimitedVettChat: false
  },
  PLUS: {
    maxAnalysesPerMonth: null, // unlimited app analyses
    maxDmAnalysesPerMonth: 10, // 10 DM analyses per month
    hasWatermark: false,
    historyRetentionDays: null, // unlimited history
    hasPriorityProcessing: false, // standard processing
    hasAdvancedBiasAnalysis: false,
    hasExtendedSummaries: false,
    hasCrossPlatformSync: false,
    hasCustomAlerts: false,
    maxSources: 10,
    hasVettChat: false,
    hasLimitedVettChat: true // Limited Vett Chat (specifics TBD)
  },
  PRO: {
    maxAnalysesPerMonth: null, // unlimited app analyses
    maxDmAnalysesPerMonth: null, // unlimited DM analyses
    hasWatermark: false,
    historyRetentionDays: null, // unlimited history
    hasPriorityProcessing: true, // priority processing
    hasAdvancedBiasAnalysis: true,
    hasExtendedSummaries: true,
    hasCrossPlatformSync: true,
    hasCustomAlerts: true,
    maxSources: 20,
    hasVettChat: true, // Full Vett Chat access
    hasLimitedVettChat: false
  }
};

export const PLAN_PRICES: Record<
  SubscriptionPlan,
  { monthly: number; annual: number }
> = {
  FREE: { monthly: 0, annual: 0 },
  PLUS: { monthly: 2.99, annual: 19.99 },
  PRO: { monthly: 6.99, annual: 49.99 }
};

class SubscriptionService {
  /**
   * Get or create subscription for user (defaults to FREE)
   */
  async getOrCreateSubscription(userId: string) {
    let subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId)
    });

    if (!subscription) {
      // Create FREE subscription by default
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const [newSubscription] = await db
        .insert(subscriptions)
        .values({
          userId,
          plan: "FREE",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd
        })
        .returning();

      subscription = newSubscription;
    }

    return subscription;
  }

  /**
   * Get user's current plan limits
   */
  async getPlanLimits(userId: string): Promise<PlanLimits> {
    const subscription = await this.getOrCreateSubscription(userId);
    return PLAN_LIMITS[subscription.plan];
  }

  /**
   * Check if user can perform analysis (app-based)
   */
  async canPerformAnalysis(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number; limit?: number }> {
    const subscription = await this.getOrCreateSubscription(userId);
    const limits = PLAN_LIMITS[subscription.plan];

    // Unlimited for PLUS and PRO
    if (limits.maxAnalysesPerMonth === null) {
      return { allowed: true };
    }

    // Check usage for FREE tier
    const usage = await this.getOrCreateUsage(
      userId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd
    );

    const remaining = Math.max(0, limits.maxAnalysesPerMonth - usage.analysesCount);
    
    if (usage.analysesCount >= limits.maxAnalysesPerMonth) {
      return {
        allowed: false,
        reason: `You've reached your monthly limit of ${limits.maxAnalysesPerMonth} analyses. Upgrade to Plus or Pro for unlimited analyses!`,
        remaining: 0,
        limit: limits.maxAnalysesPerMonth
      };
    }

    return { allowed: true, remaining, limit: limits.maxAnalysesPerMonth };
  }

  /**
   * Increment usage count for user
   */
  async incrementUsage(userId: string): Promise<void> {
    const subscription = await this.getOrCreateSubscription(userId);
    const usage = await this.getOrCreateUsage(
      userId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd
    );

    await db
      .update(userUsage)
      .set({
        analysesCount: usage.analysesCount + 1,
        updatedAt: new Date()
      })
      .where(eq(userUsage.userId, userId));
  }

  /**
   * Get or create usage record for user
   */
  async getOrCreateUsage(userId: string, periodStart: Date, periodEnd: Date) {
    let usage = await db.query.userUsage.findFirst({
      where: eq(userUsage.userId, userId)
    });

    const now = new Date();

    if (!usage) {
      // Create new usage record
      const [newUsage] = await db
        .insert(userUsage)
        .values({
          userId,
          analysesCount: 0,
          periodStart,
          periodEnd,
          lastResetAt: now
        })
        .returning();

      return newUsage;
    }

    // Check if we need to reset usage (new billing period)
    if (now >= usage.periodEnd) {
      // Reset usage for new period
      await db
        .update(userUsage)
        .set({
          analysesCount: 0,
          periodStart,
          periodEnd,
          lastResetAt: now,
          updatedAt: now
        })
        .where(eq(userUsage.userId, userId));

      return {
        ...usage,
        analysesCount: 0,
        periodStart,
        periodEnd,
        lastResetAt: now
      };
    }

    return usage;
  }

  /**
   * Get current usage for user
   */
  async getUsage(userId: string) {
    const subscription = await this.getOrCreateSubscription(userId);
    const usage = await this.getOrCreateUsage(
      userId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd
    );
    const limits = PLAN_LIMITS[subscription.plan];

    return {
      analysesCount: usage.analysesCount,
      maxAnalyses: limits.maxAnalysesPerMonth,
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
      hasUnlimited: limits.maxAnalysesPerMonth === null
    };
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(
    userId: string,
    plan: SubscriptionPlan,
    billingCycle: BillingCycle,
    clerkSubscriptionId?: string,
    revenueCatCustomerId?: string,
    revenueCatSubscriptionId?: string
  ) {
    const now = new Date();
    const periodEnd = new Date(now);
    
    if (billingCycle === "ANNUAL") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const existing = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId)
    });

    if (existing) {
      const [updated] = await db
        .update(subscriptions)
        .set({
          plan,
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          clerkSubscriptionId: clerkSubscriptionId ?? null,
          revenueCatCustomerId: revenueCatCustomerId ?? null,
          revenueCatSubscriptionId: revenueCatSubscriptionId ?? null,
          updatedAt: now
        })
        .where(eq(subscriptions.userId, userId))
        .returning();

      // Reset usage when upgrading
      await db
        .update(userUsage)
        .set({
          analysesCount: 0,
          periodStart: now,
          periodEnd,
          lastResetAt: now,
          updatedAt: now
        })
        .where(eq(userUsage.userId, userId));

      return updated;
    } else {
      const [created] = await db
        .insert(subscriptions)
        .values({
          userId,
          plan,
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          clerkSubscriptionId: clerkSubscriptionId ?? null,
          revenueCatCustomerId: revenueCatCustomerId ?? null,
          revenueCatSubscriptionId: revenueCatSubscriptionId ?? null
        })
        .returning();

      return created;
    }
  }

  /**
   * Get subscription info for user
   */
  async getSubscriptionInfo(userId: string) {
    const subscription = await this.getOrCreateSubscription(userId);
    const limits = PLAN_LIMITS[subscription.plan];
    const prices = PLAN_PRICES[subscription.plan];
    const usage = await this.getUsage(userId);

    return {
      plan: subscription.plan,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      limits,
      prices,
      usage
    };
  }

  /**
   * Check if analysis should have watermark
   */
  async shouldApplyWatermark(userId: string | null): Promise<boolean> {
    if (!userId) return true; // Unauthenticated users get watermark
    
    const subscription = await this.getOrCreateSubscription(userId);
    return PLAN_LIMITS[subscription.plan].hasWatermark;
  }

  /**
   * Get DM analysis limit for a subscription plan
   * Used by instagram-service to enforce per-tier DM limits
   */
  getDmLimitForPlan(plan: SubscriptionPlan): number | null {
    return PLAN_LIMITS[plan].maxDmAnalysesPerMonth;
  }

  /**
   * Get user's subscription plan
   */
  async getUserPlan(userId: string): Promise<SubscriptionPlan> {
    const subscription = await this.getOrCreateSubscription(userId);
    return subscription.plan;
  }

  /**
   * Get history retention cutoff date
   */
  async getHistoryCutoffDate(userId: string | null): Promise<Date | null> {
    if (!userId) {
      // Unauthenticated: 30 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      return cutoff;
    }

    const subscription = await this.getOrCreateSubscription(userId);
    const limits = PLAN_LIMITS[subscription.plan];

    if (limits.historyRetentionDays === null) {
      return null; // Unlimited history
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - limits.historyRetentionDays);
    return cutoff;
  }
}

export const subscriptionService = new SubscriptionService();

