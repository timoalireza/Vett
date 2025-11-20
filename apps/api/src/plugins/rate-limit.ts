import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import IORedis from "ioredis";

import { env } from "../env.js";

export default fp(async (fastify: FastifyInstance) => {
  // Create Redis client for distributed rate limiting (in production)
  let redisClient: IORedis | undefined;
  if (env.NODE_ENV === "production") {
    try {
      redisClient = new IORedis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true
      });
      await redisClient.connect();
      fastify.log.info("✅ Redis connected for rate limiting");
    } catch (error) {
      fastify.log.warn({ error }, "⚠️  Redis not available for rate limiting, using in-memory store");
    }
  }

  // Global rate limit for all routes
  await fastify.register(rateLimit, {
    max: 100, // Maximum number of requests
    timeWindow: "15 minutes", // Time window
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
      // If user is authenticated, rate limit per user
      if ((request as any).userId) {
        return `user:${(request as any).userId}`;
      }
      // Otherwise, rate limit per IP
      return request.ip || request.socket.remoteAddress || "unknown";
    },
    // Custom error response
    errorResponseBuilder: (_request, context) => {
      return {
        error: "Too Many Requests",
        message: `Rate limit exceeded. Maximum ${context.max} requests per 15 minutes.`,
        retryAfter: Math.ceil(context.ttl / 1000) // Convert TTL to seconds
      };
    }
  });

  // Note: GraphQL mutations share the global rate limit
  // Future enhancement: Add stricter limits for mutations

  // Stricter rate limit for file uploads
  await fastify.register(rateLimit, {
    max: 5, // Only 5 uploads per minute
    timeWindow: "1 minute",
    route: "/uploads",
    redis: redisClient,
    skipOnError: true,
    keyGenerator: (request) => {
      // Rate limit uploads per user if authenticated
      if ((request as any).userId) {
        return `upload:user:${(request as any).userId}`;
      }
      return `upload:ip:${request.ip || request.socket.remoteAddress || "unknown"}`;
    },
    errorResponseBuilder: (_request, context) => {
      return {
        error: "Too Many Requests",
        message: `Upload rate limit exceeded. Maximum ${context.max} uploads per minute.`,
        retryAfter: Math.ceil(context.ttl / 1000) // Convert TTL to seconds
      };
    }
  });

  // Rate limit for health endpoints (prevent abuse)
  await fastify.register(rateLimit, {
    max: 10,
    timeWindow: "1 minute",
    route: ["/health", "/live", "/ready"],
    redis: redisClient,
    skipOnError: true,
    keyGenerator: (request) => {
      return `health:${request.ip || request.socket.remoteAddress || "unknown"}`;
    }
  });

  // Cleanup on server close
  fastify.addHook("onClose", async () => {
    if (redisClient) {
      await redisClient.quit();
    }
  });
});

