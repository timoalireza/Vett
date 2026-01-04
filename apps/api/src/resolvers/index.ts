import type { IResolvers } from "mercurius";
import { createClerkClient } from "@clerk/backend";

import { analysisService } from "../services/analysis-service.js";
import { userService } from "../services/user-service.js";
import { subscriptionService } from "../services/subscription-service.js";
import { cacheService } from "../services/cache-service.js";
import { feedbackService } from "../services/feedback-service.js";
import { vettAIService } from "../services/vettai-service.js";
import { socialLinkingService } from "../services/social-linking-service.js";
import { privacyRequestService } from "../services/privacy-request-service.js";
import { accountService } from "../services/account-service.js";
import { verifyClaimRealtime } from "../services/realtime-verification-service.js";
import type { DataLoaderContext } from "../loaders/index.js";
import type { PaginationArgs } from "../utils/pagination.js";
import { trackGraphQLMutation, trackGraphQLError } from "../plugins/metrics.js";
import { env } from "../env.js";

const clerk = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY
});

interface GraphQLContext {
  userId?: string;
  user?: {
    id: string;
    email?: string;
    externalId: string;
  };
  loaders: DataLoaderContext;
}

// Extend Mercurius context to include our custom properties
declare module "mercurius" {
  interface MercuriusContext extends GraphQLContext {}
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
        await userService.getOrCreateUser(ctx.userId);
        
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
      if (env.REVENUECAT_API_KEY) {
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
    },
    chatUsage: async (_parent, _args, context) => {
      const ctx = context as GraphQLContext;
      
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }
      
      const user = await ctx.loaders.userByExternalId.load(ctx.userId);
      if (!user) {
        throw new Error("User not found");
      }

      const chatUsage = await subscriptionService.getChatUsage(user.id);
      return {
        dailyCount: chatUsage.dailyCount,
        maxDaily: chatUsage.maxDaily,
        remaining: chatUsage.remaining
      };
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
          // IMPORTANT: GraphQL cache is keyed by Clerk/external user id (request.userId),
          // not the internal DB UUID. Invalidate using ctx.userId so usage/history refresh immediately.
          if (ctx.userId) {
            await cacheService.invalidateUserCache(ctx.userId);
          }
        }
        
        return {
          analysisId,
          status: "QUEUED"
        };
      } catch (error) {
        trackGraphQLError();
        // Log the actual error for debugging
        console.error("[submitAnalysis] Error:", error);
        
        // Check if it's a database connection error (but NOT a schema mismatch error)
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          // Don't catch schema mismatch errors - let them propagate with their helpful messages
          const isSchemaMismatch = 
            errorMessage.includes("schema mismatch") ||
            errorMessage.includes("column") && errorMessage.includes("missing") ||
            errorMessage.includes("migrations");
          
          if (!isSchemaMismatch && (
            errorMessage.includes("connection") ||
            errorMessage.includes("database") ||
            errorMessage.includes("postgres") ||
            errorMessage.includes("timeout") ||
            errorMessage.includes("econnrefused")
          )) {
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
    verifyClaimRealtime: async (_parent, args, context) => {
      trackGraphQLMutation("verifyClaimRealtime");
      const ctx = context as GraphQLContext;
      
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }

      try {
        const result = await verifyClaimRealtime({
          claim: args.input.claim,
          context: args.input.context
        });

        return result;
      } catch (error: any) {
        console.error("[GraphQL] Error in realtime verification:", {
          userId: ctx.userId,
          claim: args.input.claim.substring(0, 50),
          error: error.message
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
        const user = await ctx.loaders.userByExternalId.load(ctx.userId);
        if (!user) {
          throw new Error("User not found");
        }

        // Atomically check limit and increment count to prevent race conditions
        // This must happen BEFORE calling the AI service to ensure accurate limit enforcement
        const usageCheck = await subscriptionService.checkAndIncrementChatUsage(user.id);
        if (!usageCheck.allowed) {
          throw new Error(usageCheck.reason || "Chat limit reached");
        }

        // Fetch analysis if analysisId is provided
        let analysis = null;
        if (args.input.analysisId) {
          analysis = await context.loaders.analysisById.load({
            id: args.input.analysisId,
            userId: ctx.userId
          });
        }

        // Process the chat message with AI
        let chatResponse: { message: string; citations?: string[] };
        try {
          chatResponse = await vettAIService.chat(args.input, analysis);
        } catch (aiError: any) {
          // Rollback the chat usage increment if AI service fails
          // This ensures users don't lose quota when errors occur
          await subscriptionService.rollbackChatUsage(user.id);
          throw aiError;
        }

        // Get updated chat usage info (already incremented above)
        const chatUsage = await subscriptionService.getChatUsage(user.id);

        return {
          response: chatResponse.message,
          citations: chatResponse.citations || [],
          chatUsage: {
            dailyCount: chatUsage.dailyCount,
            maxDaily: chatUsage.maxDaily,
            remaining: chatUsage.remaining
          }
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
        // IMPORTANT: GraphQL cache is keyed by Clerk/external user id (request.userId),
        // not the internal DB UUID.
        await cacheService.invalidateUserCache(ctx.userId);

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
    requestDataExport: async (_parent, args, context) => {
      trackGraphQLMutation("requestDataExport");
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }

      try {
        const dbUserId = await userService.getOrCreateUser(ctx.userId);
        const request = await privacyRequestService.createOrReusePendingRequest(
          dbUserId,
          "DATA_EXPORT",
          args?.note ?? null
        );

        return {
          success: true,
          request: {
            id: request.id,
            type: request.type,
            status: request.status,
            note: request.note,
            createdAt: request.createdAt.toISOString(),
            updatedAt: request.updatedAt.toISOString()
          },
          error: null
        };
      } catch (error: any) {
        trackGraphQLError();
        console.error("[GraphQL] Error requesting data export:", {
          userId: ctx.userId,
          error: error.message
        });
        return {
          success: false,
          request: null,
          error: error.message || "Failed to submit data export request"
        };
      }
    },
    requestDataDeletion: async (_parent, args, context) => {
      trackGraphQLMutation("requestDataDeletion");
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }

      try {
        const dbUserId = await userService.getOrCreateUser(ctx.userId);
        const request = await privacyRequestService.createOrReusePendingRequest(
          dbUserId,
          "DATA_DELETION",
          args?.note ?? null
        );

        return {
          success: true,
          request: {
            id: request.id,
            type: request.type,
            status: request.status,
            note: request.note,
            createdAt: request.createdAt.toISOString(),
            updatedAt: request.updatedAt.toISOString()
          },
          error: null
        };
      } catch (error: any) {
        trackGraphQLError();
        console.error("[GraphQL] Error requesting data deletion:", {
          userId: ctx.userId,
          error: error.message
        });
        return {
          success: false,
          request: null,
          error: error.message || "Failed to submit data deletion request"
        };
      }
    },
    deleteAccount: async (_parent, _args, context) => {
      trackGraphQLMutation("deleteAccount");
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }

      try {
        const dbUserId = await userService.getOrCreateUser(ctx.userId);

        // Delete application data first, then delete the Clerk user.
        await accountService.deleteUserData(dbUserId);

        try {
          await clerk.users.deleteUser(ctx.userId);
        } catch (clerkError: any) {
          // Non-fatal: app data is already deleted. Log and proceed.
          console.warn("[GraphQL] Clerk user deletion failed (non-fatal):", {
            userId: ctx.userId,
            error: clerkError?.message
          });
        }

        return { success: true, error: null };
      } catch (error: any) {
        trackGraphQLError();
        console.error("[GraphQL] Error deleting account:", {
          userId: ctx.userId,
          error: error.message
        });
        return { success: false, error: error.message || "Failed to delete account" };
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
    },
    syncSubscription: async (_parent, _args, context) => {
      trackGraphQLMutation("syncSubscription");
      const ctx = context as GraphQLContext;
      if (!ctx.userId) {
        throw new Error("Authentication required");
      }

      try {
        console.log("[GraphQL] syncSubscription called for user:", ctx.userId);
        const dbUserId = await userService.getOrCreateUser(ctx.userId);

        // Sync subscription from RevenueCat (this waits for completion)
        if (!env.REVENUECAT_API_KEY) {
          console.warn("[GraphQL] REVENUECAT_API_KEY not configured");
          return {
            success: false,
            subscription: null,
            error: "RevenueCat sync not configured"
          };
        }

        const { syncUserSubscriptionFromRevenueCat } = await import("../services/revenuecat-sync.js");
        console.log("[GraphQL] Calling syncUserSubscriptionFromRevenueCat...");
        await syncUserSubscriptionFromRevenueCat(ctx.userId);
        console.log("[GraphQL] Sync completed, fetching updated subscription info...");

        // Get updated subscription info
        const info = await subscriptionService.getSubscriptionInfo(dbUserId);
        console.log("[GraphQL] Updated subscription info:", {
          plan: info.plan,
          status: info.status,
          billingCycle: info.billingCycle
        });

        return {
          success: true,
          subscription: {
            plan: info.plan,
            status: info.status,
            billingCycle: info.billingCycle,
            currentPeriodStart: info.currentPeriodStart.toISOString(),
            currentPeriodEnd: info.currentPeriodEnd.toISOString(),
            cancelAtPeriodEnd: info.cancelAtPeriodEnd,
            limits: info.limits,
            prices: info.prices,
            usage: info.usage
          },
          error: null
        };
      } catch (error: any) {
        trackGraphQLError();
        console.error("[GraphQL] Error syncing subscription:", {
          userId: ctx.userId,
          error: error.message,
          stack: error.stack
        });
        return {
          success: false,
          subscription: null,
          error: error.message || "Failed to sync subscription"
        };
      }
    }
  },
  IngestionQuality: {
    level: (parent: { level: string }): string => {
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
    recommendation: (parent: { recommendation?: string }): string | null => {
      if (!parent.recommendation) return null;
      const recMap: Record<string, string> = {
        screenshot: "SCREENSHOT",
        api_key: "API_KEY",
        none: "NONE"
      };
      return recMap[parent.recommendation.toLowerCase()] || null;
    }
  } as IResolvers<GraphQLContext>["IngestionQuality"]
};

