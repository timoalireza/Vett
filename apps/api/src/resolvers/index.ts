import type { IResolvers } from "mercurius";

import { analysisService } from "../services/analysis-service.js";
import { userService } from "../services/user-service.js";
import { subscriptionService } from "../services/subscription-service.js";
import { cacheService } from "../services/cache-service.js";
import type { DataLoaderContext } from "../loaders/index.js";
import type { PaginationArgs } from "../utils/pagination.js";

interface GraphQLContext {
  userId?: string;
  user?: {
    id: string;
    email?: string;
    externalId: string;
  };
  loaders: DataLoaderContext;
}

export const resolvers: IResolvers<GraphQLContext> = {
  Query: {
    health: () => ({
      status: "Vett API online",
      timestamp: new Date().toISOString()
    }),
    analysis: async (_parent, args, context) => {
      // Use DataLoader for batching (though single query here, it helps with consistency)
      const analysis = await context.loaders.analysisById.load({
        id: args.id,
        userId: context.userId
      });
      
      if (!analysis) {
        return null;
      }
      
      // Authorization check: users can only access their own analyses
      if (context.userId) {
        // Use DataLoader for user lookup (batches multiple user lookups)
        const user = await context.loaders.userByExternalId.load(context.userId);
        if (user && analysis.userId !== user.id) {
          // Check if analysis is public (for future public collections feature)
          // For now, only allow access to own analyses
          throw new Error("Unauthorized: You can only access your own analyses");
        }
      }
      
      return analysis;
    },
    analyses: async (_parent, args, context) => {
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }

      // Use DataLoader for user lookup
      const user = await ctx.loaders.userByExternalId.load(ctx.userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Get paginated analyses
      const paginationArgs: PaginationArgs = {
        first: args.first ?? null,
        after: args.after ?? null,
        last: args.last ?? null,
        before: args.before ?? null
      };

      const result = await analysisService.getAnalyses(
        user.id,
        paginationArgs,
        ctx.userId
      );

      return {
        edges: result.edges,
        pageInfo: result.pageInfo,
        totalCount: result.totalCount ?? null
      };
    },
    subscription: async (_parent, _args, context) => {
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }
      // Use DataLoader for user lookup (batches multiple user lookups in same request)
      const user = await ctx.loaders.userByExternalId.load(ctx.userId);
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
      // Use DataLoader for user lookup (batches multiple user lookups in same request)
      const user = await ctx.loaders.userByExternalId.load(ctx.userId);
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
        try {
          console.log("[GraphQL] submitAnalysis called", { 
            hasInput: !!args.input,
            inputType: args.input?.mediaType,
            hasUserId: !!(context as GraphQLContext).userId
          });
          
          const ctx = context as GraphQLContext;
          // Get or create user in database
          let userId: string | undefined;
          if (ctx.userId) {
            console.log("[GraphQL] Getting/creating user:", ctx.userId);
            userId = await userService.getOrCreateUser(ctx.userId);
            console.log("[GraphQL] User ID:", userId);
            
            // Check subscription limits
            const canPerform = await subscriptionService.canPerformAnalysis(userId);
            if (!canPerform.allowed) {
              console.log("[GraphQL] Subscription limit reached:", canPerform.reason);
              throw new Error(canPerform.reason || "Analysis limit reached");
            }
          }

          console.log("[GraphQL] Enqueueing analysis...");
          const analysisId = await analysisService.enqueueAnalysis(args.input, userId);
          console.log("[GraphQL] ✅ Analysis enqueued:", analysisId);
        
        // Increment usage if user is authenticated
        if (userId) {
          await subscriptionService.incrementUsage(userId);
          // Invalidate user's cache since usage changed
          await cacheService.invalidateUserCache(userId);
        }
        
        return {
          analysisId,
          status: "QUEUED"
        };
      } catch (error) {
        // Log the actual error for debugging
        console.error("[submitAnalysis] Error:", error);
        
        // Check if it's a database connection error
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          if (
            errorMessage.includes("connection") ||
            errorMessage.includes("database") ||
            errorMessage.includes("postgres") ||
            errorMessage.includes("timeout") ||
            errorMessage.includes("econnrefused")
          ) {
            throw new Error("Database connection error. Please try again in a moment.");
          }
        }
        
        // Re-throw the original error with better context
        throw error;
      }
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

