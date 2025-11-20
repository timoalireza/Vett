// Initialize Sentry FIRST (before any other imports that might throw)
import { initSentry } from "./config/sentry.js";
initSentry();

import { randomUUID } from "crypto";
import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import * as Sentry from "@sentry/node";

import { env } from "./env.js";
import { loggerOptions } from "./config/logger.js";
import authPlugin from "./plugins/auth.js";
import rateLimitPlugin from "./plugins/rate-limit.js";
import metricsPlugin from "./plugins/metrics.js";
import { registerGraphql } from "./plugins/graphql.js";
import { registerHealthRoutes } from "./routes/health.js";
import uploadsPlugin from "./plugins/uploads.js";
import { queues } from "./queues/index.js";

async function buildServer() {
  const app = Fastify({
    logger: loggerOptions,
    // Generate request IDs for tracing
    genReqId: () => randomUUID()
  });

  // Add request ID to logs and Sentry
  app.addHook("onRequest", async (request) => {
    // Add request ID to request object for logging
    (request as any).requestId = request.id;
    
    // Set Sentry transaction context (only if Sentry is initialized)
    if (env.SENTRY_DSN) {
      try {
        // Use Sentry v10 API: getCurrentScope() replaces configureScope()
        const scope = Sentry.getCurrentScope();
        scope.setTag("requestId", request.id);
        scope.setContext("request", {
          method: request.method,
          url: request.url,
          headers: {
            "user-agent": request.headers["user-agent"],
            "content-type": request.headers["content-type"]
          }
        });
      } catch (error) {
        // Sentry might not be fully initialized in test environment
        app.log.debug({ error }, "Failed to set Sentry context");
      }
    }
  });

  // Global error handler
  app.setErrorHandler(async (error, request, reply) => {
    // Log error
    request.log.error({ err: error, requestId: request.id }, "Request error");
    
    // Send to Sentry (only in production or if SENTRY_DSN is set)
    if (env.SENTRY_DSN && env.NODE_ENV === "production") {
      Sentry.captureException(error, {
        tags: {
          requestId: request.id,
          method: request.method,
          url: request.url
        },
        extra: {
          userId: (request as any).userId,
          headers: request.headers
        }
      });
    }
    
    // Don't expose internal errors to clients
    const statusCode = error.statusCode || 500;
    const message = statusCode >= 500 && env.NODE_ENV === "production"
      ? "Internal server error"
      : error.message;
    
    return reply.code(statusCode).send({
      error: message,
      requestId: request.id,
      ...(env.NODE_ENV === "development" && { stack: error.stack })
    });
  });

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false
  });
  
  // Configure CORS based on environment
  await app.register(cors, {
    origin: env.NODE_ENV === "production" 
      ? (origin, callback) => {
          // In production, restrict to specific origins
          const allowedOrigins = env.ALLOWED_ORIGINS || [];
          
          // Handle requests without origin (mobile apps, same-origin, etc.)
          if (!origin) {
            // Allow requests without origin header (mobile apps, Postman, etc.)
            // In production, you may want to be more restrictive
            app.log.debug("Request without origin header (likely mobile app or same-origin)");
            callback(null, true);
            return;
          }
          
          if (allowedOrigins.length === 0) {
            // If no ALLOWED_ORIGINS set, log warning but allow (for now)
            app.log.warn("⚠️  ALLOWED_ORIGINS not set in production. Allowing all origins. Set ALLOWED_ORIGINS before launch!");
            callback(null, true);
            return;
          }
          
          // Check if origin is in allowed list
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            app.log.warn({ origin, allowedOrigins }, "CORS: Origin not allowed");
            callback(new Error(`Origin ${origin} is not allowed by CORS policy`), false);
          }
        }
      : true, // Allow all origins in development
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin"
    ],
    exposedHeaders: [
      "x-ratelimit-limit",
      "x-ratelimit-remaining",
      "x-ratelimit-reset",
      "retry-after"
    ],
    maxAge: 86400 // 24 hours
  });

  // Register rate limiting BEFORE other plugins
  await app.register(rateLimitPlugin);

  // Register metrics collection (for monitoring)
  await app.register(metricsPlugin);

  // Register authentication plugin BEFORE GraphQL
  await app.register(authPlugin);

  await app.register(uploadsPlugin);
  await registerGraphql(app);
  await registerHealthRoutes(app);

  app.addHook("onClose", async () => {
    await queues.analysis.close();
  });

  return app;
}

// Export buildServer for testing
export { buildServer };

async function start() {
  try {
    const app = await buildServer();
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`🚀 Vett API ready at http://localhost:${env.PORT}/graphql`);
    // Sentry status is logged in initSentry() function
  } catch (error) {
    console.error("Failed to start server:", error);
    if (env.SENTRY_DSN) {
      Sentry.captureException(error as Error);
      await Sentry.flush(2000); // Wait for Sentry to send
    }
    process.exit(1);
  }
}

start();

export type App = Awaited<ReturnType<typeof buildServer>>;

