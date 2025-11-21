import type { FastifyInstance } from "fastify";
import { createClerkClient } from "@clerk/backend";
import { createRedisClient } from "../utils/redis-config.js";
import { db } from "../db/client.js";
import { env } from "../env.js";

// Create Redis client for health checks with unlimited retries
// Errors are handled silently by createRedisClient
const redisHealthCheck = createRedisClient(env.REDIS_URL, {
  maxRetriesPerRequest: null // Unlimited retries to prevent errors
});

export async function registerHealthRoutes(app: FastifyInstance) {
  // Basic health check
  app.get("/health", async () => {
    const checks: Record<string, boolean | string> = {};
    
    // Check Clerk configuration
    try {
      const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
      await clerk.users.getUserList({ limit: 1 });
      checks.clerk = true;
    } catch (error) {
      checks.clerk = false;
      app.log.warn({ error }, "Clerk health check failed");
    }

    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks
    };
  });

  // Readiness probe (checks dependencies)
  app.get("/ready", async (request, reply) => {
    const checks: Record<string, boolean> = {};
    let allHealthy = true;

    // Check database
    try {
      await db.execute("SELECT 1");
      checks.database = true;
    } catch (error) {
      checks.database = false;
      allHealthy = false;
      request.log.error({ error }, "Database health check failed");
    }

    // Check Redis
    try {
      if (!redisHealthCheck.status || redisHealthCheck.status !== "ready") {
        await redisHealthCheck.connect();
      }
      await redisHealthCheck.ping();
      checks.redis = true;
    } catch (error) {
      checks.redis = false;
      allHealthy = false;
      request.log.error({ error }, "Redis health check failed");
    }

    if (!allHealthy) {
      return reply.code(503).send({
        status: "unhealthy",
        checks,
        timestamp: new Date().toISOString()
      });
    }

    return {
      status: "ready",
      checks,
      timestamp: new Date().toISOString()
    };
  });

  // Liveness probe (checks if app is running)
  app.get("/live", async () => ({
    status: "alive",
    timestamp: new Date().toISOString()
  }));

  // CORS test endpoint
  app.get("/cors-test", async (request) => {
    const origin = request.headers.origin || "none";
    const allowedOrigins = env.ALLOWED_ORIGINS || [];
    
    return {
      status: "ok",
      origin,
      allowedOrigins,
      environment: env.NODE_ENV,
      corsConfigured: env.NODE_ENV === "production" ? allowedOrigins.length > 0 : true,
      timestamp: new Date().toISOString()
    };
  });
}
