import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { createClerkClient, verifyToken } from "@clerk/backend";
import * as Sentry from "@sentry/node";

import { env } from "../env.js";

export interface AuthenticatedRequest extends FastifyRequest {
  userId?: string;
  user?: {
    id: string;
    email?: string;
    externalId: string;
  };
}

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    user?: {
      id: string;
      email?: string;
      externalId: string;
    };
  }
}

export default fp(async (fastify: FastifyInstance) => {
  // Validate Clerk secret key format
  if (!env.CLERK_SECRET_KEY || (!env.CLERK_SECRET_KEY.startsWith("sk_test_") && !env.CLERK_SECRET_KEY.startsWith("sk_live_"))) {
    fastify.log.warn("⚠️  CLERK_SECRET_KEY appears to be invalid. Expected format: sk_test_... or sk_live_...");
  }

  // Initialize Clerk client
  let clerk;
  try {
    clerk = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY
    });
    fastify.log.info("✅ Clerk client initialized successfully");
  } catch (error) {
    fastify.log.error({ error }, "❌ Failed to initialize Clerk client");
    throw error;
  }

  // Test Clerk connection on startup
  try {
    // Try to verify the secret key by making a simple API call
    // This will fail fast if the key is invalid
    await clerk.users.getUserList({ limit: 1 });
    fastify.log.info("✅ Clerk connection verified");
  } catch (error: any) {
    // If it's an auth error, the key is invalid
    if (error?.status === 401 || error?.message?.includes("Unauthorized")) {
      fastify.log.error("❌ Clerk secret key is invalid or unauthorized. Please check your CLERK_SECRET_KEY.");
    } else {
      // Other errors (like network) are okay for startup, but log them
      fastify.log.warn({ error: error?.message }, "⚠️  Could not verify Clerk connection on startup (this may be normal)");
    }
  }

  // Add authentication hook
  fastify.addHook("onRequest", async (request: AuthenticatedRequest) => {
    // Skip auth for health checks, webhooks, and public endpoints
    if (
      request.url.startsWith("/health") ||
      request.url.startsWith("/live") ||
      request.url.startsWith("/ready") ||
      request.url.startsWith("/auth/test") ||
      request.url.startsWith("/webhooks/") || // RevenueCat and other webhooks
      (request.url.startsWith("/graphql") && request.method === "GET") // GraphiQL in dev
    ) {
      return;
    }

    // Extract Authorization header
    const authHeader = request.headers.authorization;
    
    // If no auth header, allow request to continue (for development)
    // In production, you may want to require auth for mutations
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return;
    }

    try {
      // Extract token from Authorization header
      const token = authHeader.substring(7); // Remove "Bearer " prefix
      
      // Verify the token with Clerk
      const session = await verifyToken(token, {
        secretKey: env.CLERK_SECRET_KEY
      });
      
      if (session && session.sub) {
        // Set user context
        request.userId = session.sub;
        
        // Optionally fetch full user details from Clerk
        try {
          const user = await clerk.users.getUser(session.sub);
          const email = user.emailAddresses[0]?.emailAddress;
          const phoneNumber = user.phoneNumbers[0]?.phoneNumber;
          
          request.user = {
            id: session.sub,
            email,
            externalId: session.sub
          };
          
          // Set Sentry user context for error tracking
          // Use email if available, otherwise use phone number, otherwise use username
          Sentry.setUser({
            id: session.sub,
            email,
            username: user.username || email || phoneNumber
          });
        } catch (error) {
          // If user fetch fails, still set basic context
          fastify.log.warn({ error, userId: session.sub }, "Failed to fetch user details from Clerk");
          request.user = {
            id: session.sub,
            email: undefined,
            externalId: session.sub
          };
          
          // Set basic Sentry user context
          Sentry.setUser({
            id: session.sub
          });
        }
      }
    } catch (error: any) {
      // Auth verification failed
      // Log error details for debugging
      if (error?.status === 401 || error?.message?.includes("Unauthorized")) {
        fastify.log.debug({ url: request.url }, "Invalid or expired token");
      } else {
        fastify.log.debug({ error: error?.message, url: request.url }, "Auth check failed");
      }
      // Allow request to continue without auth (for development)
      // In production, you may want to require auth for mutations:
      // return reply.code(401).send({ error: "Unauthorized" });
    }
  });

  // Helper to require authentication
  fastify.decorate("requireAuth", async (request: AuthenticatedRequest, reply: any) => {
    if (!request.userId) {
      return reply.code(401).send({ error: "Authentication required" });
    }
  });

  // Add test endpoint to verify Clerk connection
  fastify.get("/auth/test", async (_request, reply) => {
    try {
      // Test Clerk connection
      await clerk.users.getUserList({ limit: 1 });
      return {
        status: "connected",
        clerkConfigured: true,
        secretKeyFormat: env.CLERK_SECRET_KEY.startsWith("sk_test_") ? "test" : env.CLERK_SECRET_KEY.startsWith("sk_live_") ? "live" : "unknown",
        canListUsers: true,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      fastify.log.error({ error }, "Clerk connection test failed");
      return reply.code(500).send({
        status: "error",
        clerkConfigured: true,
        secretKeyFormat: env.CLERK_SECRET_KEY.startsWith("sk_test_") ? "test" : env.CLERK_SECRET_KEY.startsWith("sk_live_") ? "live" : "unknown",
        canListUsers: false,
        error: error?.message || "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });
});

