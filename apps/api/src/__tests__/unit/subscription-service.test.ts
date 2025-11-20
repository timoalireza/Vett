import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { subscriptionService } from "../../services/subscription-service.js";
import { createTestUser, cleanupTestData, deleteTestUser } from "../helpers/db.js";
import { skipIfNoDb } from "../helpers/skip-if-no-db.js";

describe("SubscriptionService", () => {
  const testExternalId = "test_user_123";

  beforeAll(async () => {
    try {
      await skipIfNoDb();
    } catch (error: any) {
      if (error.message === "SKIP: Database not available") {
        console.warn("⚠️  Skipping database tests - database not available");
        console.warn("   Create test database: createdb vett_test");
        console.warn("   Or set TEST_DATABASE_URL in .env.test");
      }
      throw error;
    }
  });

  beforeEach(async () => {
    try {
      await cleanupTestData();
    } catch (error: any) {
      // If database doesn't exist, skip cleanup
      if (error?.message?.includes("does not exist")) {
        console.warn("⚠️  Test database not found - skipping cleanup");
        return;
      }
      throw error;
    }
  });

  describe("getOrCreateSubscription", () => {
    it("should create a FREE subscription for a new user", async () => {
      const user = await createTestUser(testExternalId);
      
      const subscription = await subscriptionService.getOrCreateSubscription(user.id);
      
      expect(subscription).toBeDefined();
      expect(subscription.plan).toBe("FREE");
      expect(subscription.status).toBe("ACTIVE");
      expect(subscription.billingCycle).toBe("MONTHLY");
    });

    it("should return existing subscription if it exists", async () => {
      const user = await createTestUser(testExternalId);
      
      const subscription1 = await subscriptionService.getOrCreateSubscription(user.id);
      const subscription2 = await subscriptionService.getOrCreateSubscription(user.id);
      
      expect(subscription1.id).toBe(subscription2.id);
    });
  });

  describe("getSubscriptionInfo", () => {
    it("should return subscription info with plan limits", async () => {
      const user = await createTestUser(testExternalId);
      await subscriptionService.getOrCreateSubscription(user.id);
      
      const info = await subscriptionService.getSubscriptionInfo(user.id);
      
      expect(info).toBeDefined();
      expect(info.plan).toBe("FREE");
      expect(info.limits).toBeDefined();
      expect(info.limits.maxAnalysesPerMonth).toBe(10); // FREE tier limit
      expect(info.prices).toBeDefined();
    });
  });

  describe("canPerformAnalysis", () => {
    it("should allow analysis for FREE user under limit", async () => {
      const user = await createTestUser(testExternalId);
      await subscriptionService.getOrCreateSubscription(user.id);
      
      // User hasn't used any analyses yet
      const result = await subscriptionService.canPerformAnalysis(user.id);
      
      expect(result.allowed).toBe(true);
    });

    it("should prevent analysis for FREE user at limit", async () => {
      const user = await createTestUser(testExternalId);
      await subscriptionService.getOrCreateSubscription(user.id);
      
      // Increment usage to the limit (10 for FREE tier)
      for (let i = 0; i < 10; i++) {
        await subscriptionService.incrementUsage(user.id);
      }
      
      const result = await subscriptionService.canPerformAnalysis(user.id);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe("getUsage", () => {
    it("should return zero usage for new user", async () => {
      const user = await createTestUser(testExternalId);
      await subscriptionService.getOrCreateSubscription(user.id);
      
      const usage = await subscriptionService.getUsage(user.id);
      
      expect(usage).toBeDefined();
      expect(usage.analysesCount).toBe(0);
      expect(usage.maxAnalyses).toBe(10); // FREE tier limit
      expect(usage.hasUnlimited).toBe(false);
    });

    it("should track usage correctly", async () => {
      const user = await createTestUser(testExternalId);
      await subscriptionService.getOrCreateSubscription(user.id);
      
      await subscriptionService.incrementUsage(user.id);
      await subscriptionService.incrementUsage(user.id);
      
      const usage = await subscriptionService.getUsage(user.id);
      
      expect(usage).toBeDefined();
      expect(usage.analysesCount).toBe(2);
      expect(usage.maxAnalyses).toBe(10);
      // Remaining = max - count = 10 - 2 = 8
      const remaining = usage.maxAnalyses !== null ? usage.maxAnalyses - usage.analysesCount : null;
      expect(remaining).toBe(8);
    });
  });
});

