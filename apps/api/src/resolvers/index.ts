import type { IResolvers } from "mercurius";

import { analysisService } from "../services/analysis-service.js";
import { userService } from "../services/user-service.js";
import { subscriptionService } from "../services/subscription-service.js";

interface GraphQLContext {
  userId?: string;
  user?: {
    id: string;
    email?: string;
    externalId: string;
  };
}

export const resolvers: IResolvers<GraphQLContext> = {
  Query: {
    health: () => ({
      status: "Vett API online",
      timestamp: new Date().toISOString()
    }),
    analysis: async (_parent, args, context) => {
      const analysis = await analysisService.getAnalysisSummary(args.id, context.userId);
      
      // Authorization check: users can only access their own analyses
      if (analysis && context.userId) {
        const user = await userService.getUserByExternalId(context.userId);
        if (user && analysis.userId !== user.id) {
          // Check if analysis is public (for future public collections feature)
          // For now, only allow access to own analyses
          throw new Error("Unauthorized: You can only access your own analyses");
        }
      }
      
      return analysis;
    },
    subscription: async (_parent, _args, context) => {
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }
      const user = await userService.getUserByExternalId(ctx.userId);
      if (!user) {
        throw new Error("User not found");
      }
      const info = await subscriptionService.getSubscriptionInfo(user.id);
      return {
        plan: info.plan,
        status: info.status,
        billingCycle: info.billingCycle,
        currentPeriodStart: info.currentPeriodStart.toISOString(),
        currentPeriodEnd: info.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: info.cancelAtPeriodEnd,
        limits: info.limits,
        prices: info.prices,
        usage: info.usage
      };
    },
    usage: async (_parent, _args, context) => {
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }
      const user = await userService.getUserByExternalId(ctx.userId);
      if (!user) {
        throw new Error("User not found");
      }
      const usage = await subscriptionService.getUsage(user.id);
      return {
        analysesCount: usage.analysesCount,
        maxAnalyses: usage.maxAnalyses,
        periodStart: usage.periodStart.toISOString(),
        periodEnd: usage.periodEnd.toISOString(),
        hasUnlimited: usage.hasUnlimited
      };
    }
  },
  Mutation: {
    submitAnalysis: async (_parent, args, context) => {
      const ctx = context as GraphQLContext;
      // Get or create user in database
      let userId: string | undefined;
      if (ctx.userId) {
        userId = await userService.getOrCreateUser(ctx.userId);
        
        // Check subscription limits
        const canPerform = await subscriptionService.canPerformAnalysis(userId);
        if (!canPerform.allowed) {
          throw new Error(canPerform.reason || "Analysis limit reached");
        }
      }

      const analysisId = await analysisService.enqueueAnalysis(args.input, userId);
      
      // Increment usage if user is authenticated
      if (userId) {
        await subscriptionService.incrementUsage(userId);
      }
      
      return {
        analysisId,
        status: "QUEUED"
      };
    }
  },
  IngestionQuality: {
    level: (parent: { level: string }) => {
      // Map lowercase enum to uppercase GraphQL enum
      const levelMap: Record<string, string> = {
        excellent: "EXCELLENT",
        good: "GOOD",
        fair: "FAIR",
        poor: "POOR",
        insufficient: "INSUFFICIENT"
      };
      return levelMap[parent.level.toLowerCase()] || "FAIR";
    },
    recommendation: (parent: { recommendation?: string }) => {
      if (!parent.recommendation) return null;
      const recMap: Record<string, string> = {
        screenshot: "SCREENSHOT",
        api_key: "API_KEY",
        none: "NONE"
      };
      return recMap[parent.recommendation.toLowerCase()] || null;
    }
  }
};

