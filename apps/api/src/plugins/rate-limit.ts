import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import rateLimit from "@fastify/rate-limit";
import type IORedis from "ioredis";
import { createRedisClient } from "../utils/redis-config.js";
import { env } from "../env.js";
import { subscriptionService } from "../services/subscription-service.js";
import { userService } from "../services/user-service.js";

// Rate limit configuration based on subscription tier
const RATE_LIMITS_BY_TIER = {
  FREE: {
    global: 200, // 200 requests per window
    mutation: 30, // 30 mutations per window
    upload: 10 // 10 uploads per window
  },
  PLUS: {
    global: 1000, // 1000 requests per window
    mutation: 100, // 100 mutations per window
    upload: 50 // 50 uploads per window
  },
  PRO: {
    global: 5000, // 5000 requests per window
    mutation: 500, // 500 mutations per window
    upload: 200 // 200 uploads per window
  }
};

// Helper to get rate limit based on user subscription
async function getRateLimitForUser(userId: string | undefined, logger?: any): Promise<number> {
  if (!userId) {
    return env.RATE_LIMIT_ANONYMOUS_MAX;
  }

  try {
    const dbUserId = await userService.getOrCreateUser(userId);
    const subscription = await subscriptionService.getSubscriptionInfo(dbUserId);
    // Fallback to FREE tier if plan is not recognized
    const planLimits = RATE_LIMITS_BY_TIER[subscription.plan as keyof typeof RATE_LIMITS_BY_TIER];
    if (!planLimits) {
      if (logger) {
        logger.warn({ plan: subscription.plan, userId }, "Unknown subscription plan, using FREE tier limits");
      }
      return RATE_LIMITS_BY_TIER.FREE.global;
    }
    return planLimits.global;
  } catch (error) {
    // If subscription lookup fails, use FREE tier limits
    if (logger) {
      logger.warn({ error, userId }, "Failed to get subscription for rate limiting, using FREE tier");
    }
    return RATE_LIMITS_BY_TIER.FREE.global;
  }
}

async function getMutationLimitForUser(userId: string | undefined): Promise<number> {
  if (!userId) {
    return Math.floor(env.RATE_LIMIT_MUTATION_MAX / 2); // Half limit for anonymous
  }

  try {
    const dbUserId = await userService.getOrCreateUser(userId);
    const subscription = await subscriptionService.getSubscriptionInfo(dbUserId);
    // Fallback to FREE tier if plan is not recognized
    const planLimits = RATE_LIMITS_BY_TIER[subscription.plan as keyof typeof RATE_LIMITS_BY_TIER];
    if (!planLimits) {
      return RATE_LIMITS_BY_TIER.FREE.mutation;
    }
    return planLimits.mutation;
  } catch (error) {
    return RATE_LIMITS_BY_TIER.FREE.mutation;
  }
}

async function getUploadLimitForUser(userId: string | undefined): Promise<number> {
  if (!userId) {
    return Math.floor(env.RATE_LIMIT_UPLOAD_MAX / 2); // Half limit for anonymous
  }

  try {
    const dbUserId = await userService.getOrCreateUser(userId);
    const subscription = await subscriptionService.getSubscriptionInfo(dbUserId);
    // Fallback to FREE tier if plan is not recognized
    const planLimits = RATE_LIMITS_BY_TIER[subscription.plan as keyof typeof RATE_LIMITS_BY_TIER];
    if (!planLimits) {
      return RATE_LIMITS_BY_TIER.FREE.upload;
    }
    return planLimits.upload;
  } catch (error) {
    return RATE_LIMITS_BY_TIER.FREE.upload;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  // Skip rate limiting if disabled
  if (!env.RATE_LIMIT_ENABLED) {
    fastify.log.info("⚠️  Rate limiting is disabled (RATE_LIMIT_ENABLED=false)");
    return;
  }

  // Create Redis client for distributed rate limiting (in production)
  let redisClient: IORedis | undefined;
  if (env.NODE_ENV === "production") {
    try {
      redisClient = createRedisClient(env.REDIS_URL, {
        maxRetriesPerRequest: null // Unlimited retries to prevent errors
      });
      await redisClient.connect();
      fastify.log.info("✅ Redis connected for rate limiting");
    } catch (error) {
      fastify.log.warn({ error }, "⚠️  Redis not available for rate limiting, using in-memory store");
    }
  }

  // Global rate limit for all routes
  await fastify.register(rateLimit, {
    max: async (request: FastifyRequest) => {
      const userId = (request as any).userId;
      return getRateLimitForUser(userId, fastify.log);
    },
    timeWindow: env.RATE_LIMIT_GLOBAL_WINDOW,
    redis: redisClient,
    skipOnError: true, // Continue if Redis fails
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true
    },
    // Key generator: use IP address or user ID if authenticated
    keyGenerator: (request) => {
      const userId = (request as any).userId;
      if (userId) {
        return `rate:user:${userId}`;
      }
      return `rate:ip:${request.ip || request.socket.remoteAddress || "unknown"}`;
    },
    // Custom error response
    errorResponseBuilder: (_request, context) => {
      return {
        error: "Too Many Requests",
        message: `Rate limit exceeded. Maximum ${context.max} requests per ${env.RATE_LIMIT_GLOBAL_WINDOW}.`,
        retryAfter: Math.ceil(context.ttl / 1000) // Convert TTL to seconds
      };
    }
  });

  // Note: GraphQL mutations have separate rate limiting implemented in the GraphQL plugin
  // This allows for stricter limits on mutations (submitAnalysis, deleteAnalysis, etc.)

  // Rate limit for file uploads
  await fastify.register(rateLimit, {
    max: async (request: FastifyRequest) => {
      const userId = (request as any).userId;
      return getUploadLimitForUser(userId);
    },
    timeWindow: env.RATE_LIMIT_GLOBAL_WINDOW,
    route: "/uploads",
    redis: redisClient,
    skipOnError: true,
    keyGenerator: (request) => {
      const userId = (request as any).userId;
      if (userId) {
        return `upload:user:${userId}`;
      }
      return `upload:ip:${request.ip || request.socket.remoteAddress || "unknown"}`;
    },
    errorResponseBuilder: (_request, context) => {
      return {
        error: "Too Many Requests",
        message: `Upload rate limit exceeded. Maximum ${context.max} uploads per ${env.RATE_LIMIT_GLOBAL_WINDOW}.`,
        retryAfter: Math.ceil(context.ttl / 1000)
      };
    }
  });

  // More lenient rate limit for health endpoints
  await fastify.register(rateLimit, {
    max: 60, // 60 requests per minute for health checks
    timeWindow: "1 minute",
    route: ["/health", "/live", "/ready"],
    redis: redisClient,
    skipOnError: true,
    keyGenerator: (request) => {
      return `health:${request.ip || request.socket.remoteAddress || "unknown"}`;
    }
  });

  fastify.log.info(`✅ Rate limiting enabled (global: ${env.RATE_LIMIT_GLOBAL_MAX}/${env.RATE_LIMIT_GLOBAL_WINDOW}, anonymous: ${env.RATE_LIMIT_ANONYMOUS_MAX}/${env.RATE_LIMIT_GLOBAL_WINDOW})`);

  // Cleanup on server close
  fastify.addHook("onClose", async () => {
    if (redisClient) {
      await redisClient.quit();
    }
  });
});

