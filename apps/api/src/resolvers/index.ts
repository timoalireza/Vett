import type { IResolvers } from "mercurius";

import { analysisService } from "../services/analysis-service.js";
import { userService } from "../services/user-service.js";
import { subscriptionService } from "../services/subscription-service.js";
import { cacheService } from "../services/cache-service.js";
import { feedbackService } from "../services/feedback-service.js";
import { vettAIService } from "../services/vettai-service.js";
import { socialLinkingService } from "../services/social-linking-service.js";
import type { DataLoaderContext } from "../loaders/index.js";
import type { PaginationArgs } from "../utils/pagination.js";
import { trackGraphQLMutation, trackGraphQLError } from "../plugins/metrics.js";

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
      // Exception: Anonymous analyses (userId === null) can be accessed by anyone
      const isAnonymous = analysis.userId === null;
      
      if (context.userId) {
        // Authenticated user - check ownership first
        const user = await context.loaders.userByExternalId.load(context.userId);
        if (!user) {
          // User not found - log for debugging but be permissive for anonymous analyses only
          console.warn("[GraphQL] User not found for externalId:", context.userId, "analysisId:", args.id);
          // Only allow access to anonymous analyses
          if (!isAnonymous) {
            throw new Error("Unauthorized: You can only access your own analyses");
          }
        } else if (!isAnonymous && analysis.userId !== user.id) {
          // Analysis belongs to a different user - always deny access regardless of status
          console.warn("[GraphQL] Authorization mismatch:", {
            analysisId: args.id,
            analysisUserId: analysis.userId,
            userInternalId: user.id,
            userExternalId: context.userId
          });
          throw new Error("Unauthorized: You can only access your own analyses");
        }
        // Allow access if: analysis is anonymous OR user owns the analysis
      } else {
        // No authenticated user - only allow access to anonymous analyses
        if (!isAnonymous) {
          throw new Error("Unauthorized: Authentication required to access this analysis");
        }
        // Allow access to anonymous analyses only
      }
      
      return analysis;
    },
    analyses: async (_parent, args, context) => {
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }

      try {
        // Ensure user exists in database (create if needed)
        // This must be done before using DataLoader, as DataLoader caches null results
        const dbUserId = await userService.getOrCreateUser(ctx.userId);
        
        // Now use DataLoader for user lookup (will find the user we just created)
        const user = await ctx.loaders.userByExternalId.load(ctx.userId);
        if (!user) {
          console.error("[GraphQL] User not found after creation:", ctx.userId);
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
      } catch (error: any) {
        console.error("[GraphQL] Error fetching analyses:", {
          userId: ctx.userId,
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
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
      
      // Optionally trigger background sync with RevenueCat if API key is configured
      // Note: This is a fire-and-forget background update. The current response reflects
      // the database state. Webhooks keep subscriptions in sync automatically, so this
      // is primarily a fallback for manual syncs or when webhooks haven't fired yet.
      // Future queries will reflect the synced state.
      if (process.env.REVENUECAT_API_KEY) {
        try {
          const { syncUserSubscriptionFromRevenueCat } = await import("../services/revenuecat-sync.js");
          // Sync in background - don't await to avoid blocking the response
          syncUserSubscriptionFromRevenueCat(ctx.userId).catch((error) => {
            console.warn("[GraphQL] RevenueCat sync failed (non-blocking):", error.message);
          });
        } catch (error) {
          // Ignore sync errors - use cached subscription info
          console.debug("[GraphQL] RevenueCat sync not available:", error);
        }
      }
      
      // Return current subscription state from database
      // (Background sync will update database for future queries)
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
    },
    feedback: async (_parent, args, context) => {
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        return null;
      }

      try {
        const user = await ctx.loaders.userByExternalId.load(ctx.userId);
        if (!user) {
          return null;
        }

        const result = await feedbackService.getFeedbackForAnalysis(args.analysisId, user.id);
        if (!result) {
          return null;
        }

        return {
          id: result.id,
          analysisId: result.analysisId,
          userId: result.userId,
          isAgree: result.isAgree,
          comment: result.comment,
          createdAt: result.createdAt.toISOString()
        };
      } catch (error: any) {
        console.error("[GraphQL] Error fetching feedback:", {
          userId: ctx.userId,
          analysisId: args.analysisId,
          error: error.message
        });
        return null;
      }
    },
    instagramAccount: async (_parent, _args, context) => {
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        return null;
      }

      try {
        const dbUserId = await userService.getOrCreateUser(ctx.userId);
        const accounts = await socialLinkingService.getLinkedSocialAccounts(dbUserId);
        const instagramAccount = accounts.find((acc) => acc.platform === "INSTAGRAM");

        if (!instagramAccount) {
          return null;
        }

        return {
          id: instagramAccount.id,
          platform: instagramAccount.platform,
          platformUserId: instagramAccount.platformUserId,
          linkedAt: instagramAccount.linkedAt?.toISOString() || null,
          createdAt: instagramAccount.createdAt.toISOString()
        };
      } catch (error: any) {
        console.error("[GraphQL] Error fetching Instagram account:", error);
        return null;
      }
    },
    linkedSocialAccounts: async (_parent, _args, context) => {
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        return [];
      }

      try {
        const dbUserId = await userService.getOrCreateUser(ctx.userId);
        const accounts = await socialLinkingService.getLinkedSocialAccounts(dbUserId);

        return accounts.map((acc) => ({
          id: acc.id,
          platform: acc.platform,
          platformUserId: acc.platformUserId,
          linkedAt: acc.linkedAt?.toISOString() || null,
          createdAt: acc.createdAt.toISOString()
        }));
      } catch (error: any) {
        console.error("[GraphQL] Error fetching linked social accounts:", error);
        return [];
      }
    }
  },
  Mutation: {
      submitAnalysis: async (_parent, args, context) => {
        trackGraphQLMutation("submitAnalysis");
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
          // Instagram user ID is undefined for app-submitted analyses (only set for DM-submitted)
          const analysisId = await analysisService.enqueueAnalysis(args.input, userId, undefined);
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
        trackGraphQLError();
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
    },
    submitFeedback: async (_parent, args, context) => {
      trackGraphQLMutation("submitFeedback");
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }

      try {
        // Get or create user in database
        const dbUserId = await userService.getOrCreateUser(ctx.userId);

        const result = await feedbackService.submitFeedback({
          analysisId: args.input.analysisId,
          userId: dbUserId,
          isAgree: args.input.isAgree,
          comment: args.input.comment ?? null
        });

        return {
          feedback: {
            id: result.id,
            analysisId: result.analysisId,
            userId: result.userId,
            isAgree: result.isAgree,
            comment: result.comment,
            createdAt: result.createdAt.toISOString()
          }
        };
      } catch (error: any) {
        console.error("[GraphQL] Error submitting feedback:", {
          userId: ctx.userId,
          analysisId: args.input.analysisId,
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    },
    chatWithVettAI: async (_parent, args, context) => {
      trackGraphQLMutation("chatWithVettAI");
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }

      try {
        // Check if user has Pro subscription
        const user = await ctx.loaders.userByExternalId.load(ctx.userId);
        if (!user) {
          throw new Error("User not found");
        }

        const subscription = await subscriptionService.getSubscriptionInfo(user.id);
        if (subscription.plan !== "PRO") {
          throw new Error("VettAI is only available for Pro members. Please upgrade to access this feature.");
        }

        // Fetch analysis if analysisId is provided
        let analysis = null;
        if (args.input.analysisId) {
          analysis = await context.loaders.analysisById.load({
            id: args.input.analysisId,
            userId: ctx.userId
          });
        }

        const response = await vettAIService.chat(args.input, analysis);

        return {
          response
        };
      } catch (error: any) {
        console.error("[GraphQL] Error in VettAI chat:", {
          userId: ctx.userId,
          analysisId: args.input.analysisId,
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    },
    deleteAnalysis: async (_parent, args, context) => {
      trackGraphQLMutation("deleteAnalysis");
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }

      try {
        // Get or create user in database
        const dbUserId = await userService.getOrCreateUser(ctx.userId);

        // deleteAnalysis throws on error, returns true on success
        await analysisService.deleteAnalysis(args.id, dbUserId);

        // Invalidate cache after deletion
        await cacheService.invalidateUserCache(dbUserId);

        return {
          success: true
        };
      } catch (error: any) {
        console.error("[GraphQL] Error deleting analysis:", {
          userId: ctx.userId,
          analysisId: args.id,
          error: error.message
        });
        throw error;
      }
    },
    generateInstagramVerificationCode: async (_parent, _args, context) => {
      trackGraphQLMutation("generateInstagramVerificationCode");
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }

      try {
        const dbUserId = await userService.getOrCreateUser(ctx.userId);
        
        // Check if user has PRO plan
        const subscription = await subscriptionService.getSubscriptionInfo(dbUserId);
        if (subscription.plan !== "PRO") {
          return {
            success: false,
            verificationCode: "",
            error: "Pro plan required to link Instagram account"
          };
        }

        // Generate verification code (without Instagram user ID - will be set when user sends code to bot)
        const code = await socialLinkingService.generateVerificationCode(dbUserId);

        return {
          success: true,
          verificationCode: code,
          error: null
        };
      } catch (error: any) {
        trackGraphQLError();
        console.error("[GraphQL] Error generating Instagram verification code:", error);
        return {
          success: false,
          verificationCode: "",
          error: error.message || "Failed to generate verification code"
        };
      }
    },
    linkInstagramAccount: async (_parent, args, context) => {
      trackGraphQLMutation("linkInstagramAccount");
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }

      try {
        const dbUserId = await userService.getOrCreateUser(ctx.userId);

        // Find social account with matching verification code for this user
        // Use findAccountByVerificationCode to find accounts regardless of linkedAt status
        const accountWithCode = await socialLinkingService.findAccountByVerificationCode(
          dbUserId,
          args.verificationCode,
          "INSTAGRAM"
        );

        if (!accountWithCode) {
          return {
            success: false,
            verificationCode: "",
            error: "Invalid verification code. Make sure you've sent this code to @vettapp on Instagram first."
          };
        }

        // Verify code hasn't expired
        if (
          accountWithCode.verificationCodeExpiresAt &&
          accountWithCode.verificationCodeExpiresAt < new Date()
        ) {
          return {
            success: false,
            verificationCode: "",
            error: "Verification code expired. Please generate a new code."
          };
        }

        // Check if already linked
        if (accountWithCode.linkedAt) {
          return {
            success: true,
            verificationCode: args.verificationCode,
            error: null
          };
        }

        // Account linking is handled by the Instagram bot when user sends the code
        // The code is valid, but linking hasn't completed yet
        // Return pending status so user knows to wait for the bot to process
        return {
          success: false,
          verificationCode: args.verificationCode,
          error: "Verification code accepted, but account linking is pending. Please wait a moment and try again, or make sure you've sent the code to @vettapp on Instagram."
        };
      } catch (error: any) {
        trackGraphQLError();
        console.error("[GraphQL] Error linking Instagram account:", error);
        return {
          success: false,
          verificationCode: "",
          error: error.message || "Failed to link account"
        };
      }
    },
    unlinkInstagramAccount: async (_parent, _args, context) => {
      trackGraphQLMutation("unlinkInstagramAccount");
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }

      try {
        const dbUserId = await userService.getOrCreateUser(ctx.userId);
        const accounts = await socialLinkingService.getLinkedSocialAccounts(dbUserId);
        const instagramAccount = accounts.find((acc) => acc.platform === "INSTAGRAM");

        if (!instagramAccount) {
          return {
            success: false,
            error: "Instagram account not linked"
          };
        }

        const result = await socialLinkingService.unlinkInstagramAccount(
          instagramAccount.platformUserId,
          dbUserId
        );

        if (!result.success) {
          return {
            success: false,
            error: result.error || "Failed to unlink account"
          };
        }

        return {
          success: true,
          error: null
        };
      } catch (error: any) {
        trackGraphQLError();
        console.error("[GraphQL] Error unlinking Instagram account:", error);
        return {
          success: false,
          error: error.message || "Failed to unlink account"
        };
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

