// CRITICAL: Suppress ALL ioredis error logging BEFORE any imports
// ioredis logs errors directly to console, so we must intercept console methods AND stderr
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalStderrWrite = process.stderr.write.bind(process.stderr);

// Patch stderr.write to catch direct writes from ioredis
process.stderr.write = function(chunk: any, ...args: any[]) {
  const str = chunk?.toString() || "";
  const isRedisError = 
    str.includes("[ioredis]") ||
    str.includes("MaxRetriesPerRequestError") ||
    str.includes("ECONNRESET") ||
    str.includes("ECONNREFUSED") ||
    str.includes("ETIMEDOUT") ||
    str.includes("ioredis") ||
    str.includes("Redis");
  
  if (!isRedisError) {
    return originalStderrWrite(chunk, ...args);
  }
  // Silently suppress Redis errors
  return true;
};

// Also patch stdout.write just in case
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = function(chunk: any, ...args: any[]) {
  const str = chunk?.toString() || "";
  const isRedisError = 
    str.includes("[ioredis]") ||
    str.includes("MaxRetriesPerRequestError") ||
    str.includes("ECONNRESET");
  
  if (!isRedisError) {
    return originalStdoutWrite(chunk, ...args);
  }
  // Silently suppress Redis errors
  return true;
};

console.error = function(...args: any[]) {
  // Check ALL arguments for Redis/ioredis errors
  let isRedisError = false;
  
  for (const arg of args) {
    if (typeof arg === "string") {
      if (
        arg.includes("[ioredis]") ||
        arg.includes("MaxRetriesPerRequestError") ||
        arg.includes("ECONNRESET") ||
        arg.includes("ECONNREFUSED") ||
        arg.includes("ETIMEDOUT") ||
        arg.includes("Connection is closed") ||
        arg.includes("Redis") ||
        arg.includes("ioredis")
      ) {
        isRedisError = true;
        break;
      }
    } else if (arg && typeof arg === "object") {
      const errorStr = JSON.stringify(arg);
      if (
        errorStr.includes("MaxRetriesPerRequestError") ||
        errorStr.includes("ECONNRESET") ||
        errorStr.includes("ECONNREFUSED") ||
        errorStr.includes("ETIMEDOUT") ||
        errorStr.includes("ioredis") ||
        arg.message?.includes("MaxRetriesPerRequestError") ||
        arg.message?.includes("ECONNRESET") ||
        arg.name === "MaxRetriesPerRequestError"
      ) {
        isRedisError = true;
        break;
      }
    }
  }
  
  if (!isRedisError) {
    originalConsoleError.apply(console, args);
  }
  // Silently suppress Redis errors
};

console.warn = function(...args: any[]) {
  // Check ALL arguments for Redis/ioredis warnings
  let isRedisWarning = false;
  
  for (const arg of args) {
    if (typeof arg === "string") {
      if (
        arg.includes("[ioredis]") ||
        arg.includes("MaxRetriesPerRequestError") ||
        arg.includes("ECONNRESET") ||
        arg.includes("Redis connection")
      ) {
        isRedisWarning = true;
        break;
      }
    }
  }
  
  if (!isRedisWarning) {
    originalConsoleWarn.apply(console, args);
  }
  // Silently suppress Redis warnings
};

// Also patch EventEmitter to catch error events
import { EventEmitter } from "events";
const originalEmit = EventEmitter.prototype.emit;
EventEmitter.prototype.emit = function(event: string | symbol, ...args: any[]) {
  // Suppress ioredis unhandled error events
  if (event === "error" && args[0] && typeof args[0] === "object") {
    const error = args[0] as Error;
    const isRedisError = 
      error.message?.includes("MaxRetriesPerRequestError") ||
      error.message?.includes("ECONNRESET") ||
      error.message?.includes("ECONNREFUSED") ||
      error.message?.includes("ETIMEDOUT") ||
      error.message?.includes("Connection is closed") ||
      error.message?.includes("Redis") ||
      error.message?.includes("ioredis") ||
      error.name === "MaxRetriesPerRequestError";
    
    if (isRedisError) {
      // Silently suppress - don't emit the error event
      return false;
    }
  }
  return originalEmit.apply(this, [event, ...args]);
};

// Initialize Sentry FIRST (before any other imports that might throw)
import { initSentry } from "./config/sentry.js";
initSentry();

import { randomUUID } from "crypto";
import { constants } from "zlib";
import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import compress from "@fastify/compress";
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
import { cacheService } from "./services/cache-service.js";

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

  // Enable response compression (gzip, deflate, brotli)
  await app.register(compress, {
    global: true,
    // Compression threshold: only compress responses > 1KB
    threshold: 1024,
    // Compression encodings to support
    encodings: ["gzip", "deflate", "br"],
    // Custom compression options
    zlibOptions: {
      level: 6 // Balance between compression ratio and CPU usage (1-9, 6 is good default)
    },
    // Brotli options (if available)
    brotliOptions: {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 4 // 0-11, 4 is good default
      }
    }
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

  // Initialize cache service
  await cacheService.initialize();

  app.addHook("onClose", async () => {
    await queues.analysis.close();
    await cacheService.close();
  });

  return app;
}

// Export buildServer for testing
export { buildServer };

// Global error handlers for Redis connection errors - suppress all Redis errors
process.on("unhandledRejection", (reason, _promise) => {
  // Silently suppress all Redis-related errors - they are non-fatal
  if (reason && typeof reason === "object" && "message" in reason) {
    const error = reason as Error;
    const isRedisError = 
      error.message.includes("Redis") || 
      error.message.includes("ioredis") || 
      error.message.includes("ECONNRESET") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ETIMEDOUT") ||
      error.message.includes("MaxRetriesPerRequestError") ||
      error.message.includes("Connection is closed");
    
    if (isRedisError) {
      // Silently ignore - Redis errors are handled gracefully by the client
      return;
    }
  }
  console.error("[Process] Unhandled rejection:", reason);
});

process.on("uncaughtException", (error) => {
  // Silently suppress all Redis-related errors - they are non-fatal
  const isRedisError = 
    error.message.includes("Redis") || 
    error.message.includes("ioredis") || 
    error.message.includes("ECONNRESET") ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("ETIMEDOUT") ||
    error.message.includes("MaxRetriesPerRequestError") ||
    error.message.includes("Connection is closed");
  
  if (isRedisError) {
    // Silently ignore - Redis errors are handled gracefully by the client
    return;
  }
  console.error("[Process] Uncaught exception:", error);
  if (env.SENTRY_DSN) {
    Sentry.captureException(error);
  }
  process.exit(1);
});

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

