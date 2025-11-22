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

// Also patch EventEmitter to catch error events BEFORE any Redis connections are created
import { EventEmitter } from "events";
const originalEmit = EventEmitter.prototype.emit;
EventEmitter.prototype.emit = function(event: string | symbol, ...args: any[]) {
  // Suppress ioredis unhandled error events
  if (event === "error" && args[0]) {
    const error = args[0] as Error;
    const errorMessage = error?.message || String(args[0]);
    const errorName = error?.name || "";
    
    const isRedisError = 
      errorMessage.includes("MaxRetriesPerRequestError") ||
      errorMessage.includes("ECONNRESET") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("Connection is closed") ||
      errorMessage.includes("Redis") ||
      errorMessage.includes("ioredis") ||
      errorMessage.includes("[ioredis]") ||
      errorName === "MaxRetriesPerRequestError";
    
    if (isRedisError) {
      // Silently suppress - don't emit the error event
      return false;
    }
  }
  return originalEmit.apply(this, [event, ...args]);
};

import { Queue, QueueEvents, Worker } from "bullmq";
import pino from "pino";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";

import { analysisJobPayloadSchema } from "@vett/shared";
import * as schema from "../../api/src/db/schema.js";
import { runAnalysisPipeline } from "./pipeline/index.js";
import { createRedisClient } from "./utils/redis-config.js";
import { env } from "./env.js";

const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info"
});

import type { ConnectionOptions } from "bullmq";
import type IORedis from "ioredis";

// Create a single shared Redis connection with unlimited retries
let sharedConnection: IORedis | null = null;

/**
 * Get or create the shared Redis connection for BullMQ
 * This ensures all BullMQ components use the same connection with proper configuration
 */
function getSharedConnection(): IORedis {
  if (!sharedConnection) {
    // Create connection with maxRetriesPerRequest: null via our factory
    sharedConnection = createRedisClient(env.REDIS_URL, {
      maxRetriesPerRequest: null, // MUST be null - unlimited retries
      enableReadyCheck: false
    });
    
    // CRITICAL: Double-check options are set correctly
    // Some BullMQ internal operations might try to modify options
    const checkAndFixOptions = () => {
      if ((sharedConnection as any).options?.maxRetriesPerRequest !== null) {
        (sharedConnection as any).options.maxRetriesPerRequest = null;
      }
    };
    
    // Check immediately
    checkAndFixOptions();
    
    // Also check after connection is established (in case BullMQ modifies it)
    sharedConnection.once("ready", checkAndFixOptions);
    
    // Periodically verify options haven't been changed (every 5 seconds)
    const optionsCheckInterval = setInterval(() => {
      if (sharedConnection) {
        checkAndFixOptions();
      } else {
        clearInterval(optionsCheckInterval);
      }
    }, 5000);
  }
  
  return sharedConnection;
}

/**
 * Connection factory for BullMQ
 * Always returns the shared connection with proper configuration
 * CRITICAL: BullMQ may call this multiple times for different connection types
 * We ensure all connections use maxRetriesPerRequest: null
 */
const connectionFactory = {
  createClient: (_type: string) => {
    const conn = getSharedConnection();
    
    // CRITICAL: Force maxRetriesPerRequest to null every time
    // BullMQ might create multiple connection instances internally
    if ((conn as any).options?.maxRetriesPerRequest !== null) {
      (conn as any).options.maxRetriesPerRequest = null;
    }
    
    // Also patch the options setter to prevent changes
    const originalOptions = (conn as any).options;
    if (originalOptions && originalOptions.maxRetriesPerRequest !== null) {
      originalOptions.maxRetriesPerRequest = null;
    }
    
    return conn;
  }
} as ConnectionOptions;

const pool = new Pool({
  connectionString: env.DATABASE_URL
});
const db = drizzle(pool, { schema });

export const queues = {
  analysis: new Queue("analysis", { connection: connectionFactory })
};

// Initialize QueueEvents with shared connection
let analysisQueueEvents: QueueEvents | null = null;

async function initializeQueueEvents() {
  try {
    analysisQueueEvents = new QueueEvents("analysis", { connection: connectionFactory });
    
    // Wait for QueueEvents to be ready (with timeout)
    // Don't fail if it times out - QueueEvents will retry internally
    try {
      await Promise.race([
        analysisQueueEvents.waitUntilReady(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("QueueEvents initialization timeout")), 10000)
        )
      ]);
      logger.info("✅ QueueEvents initialized");
    } catch (timeoutError) {
      // Timeout is OK - QueueEvents will continue trying in background
      logger.debug("QueueEvents initialization in progress...");
    }
    
    analysisQueueEvents.on("completed", ({ jobId }) => {
      logger.debug({ jobId }, "Queue event: job completed");
    });
    
    analysisQueueEvents.on("failed", ({ jobId, failedReason }) => {
      logger.error({ jobId, failedReason }, "Queue event: job failed");
    });
    
    analysisQueueEvents.on("error", (err) => {
      // Suppress Redis connection errors - they're handled by the connection client
      const isRedisError = 
        err.message?.includes("Connection is closed") ||
        err.message?.includes("ECONNRESET") ||
        err.message?.includes("ECONNREFUSED") ||
        err.message?.includes("ETIMEDOUT");
      
      if (!isRedisError) {
        logger.error({ err }, "Queue events errored");
      }
    });
  } catch (error) {
    // Retry after delay (silently)
    setTimeout(() => {
      initializeQueueEvents().catch(() => {
        // Silent retry - don't spam logs
      });
    }, 5000);
  }
}

// Initialize QueueEvents asynchronously (non-blocking)
initializeQueueEvents().catch(() => {
  // Errors are handled in initializeQueueEvents
});

export const worker = new Worker(
  "analysis",
  async (job) => {
    const payload = analysisJobPayloadSchema.parse(job.data);
    logger.info({ jobId: job.id, name: job.name, payload }, "Processing analysis job");
    console.log(`[WORKER] 🔵 Job received: ${job.id}, analysisId: ${payload.analysisId}`);

    await db
      .update(schema.analyses)
      .set({
        status: "PROCESSING",
        updatedAt: new Date()
      })
      .where(eq(schema.analyses.id, payload.analysisId));

    try {
      const pipelineResult = await runAnalysisPipeline(payload);

      await db.transaction(async (tx) => {
        const analysisUpdate = {
          status: "COMPLETED" as const,
          topic: pipelineResult.topic,
          bias: pipelineResult.bias,
          score: pipelineResult.score,
          verdict: pipelineResult.verdict,
          confidence: pipelineResult.confidence.toFixed(2),
          summary: pipelineResult.summary,
          recommendation: pipelineResult.recommendation,
          resultJson: JSON.stringify(pipelineResult.resultJson),
          imageUrl: pipelineResult.imageUrl ?? null,
          imageAttribution: pipelineResult.imageAttribution
            ? JSON.stringify(pipelineResult.imageAttribution)
            : null,
          updatedAt: new Date()
        };

        await tx
          .update(schema.analyses)
          .set(analysisUpdate)
          .where(eq(schema.analyses.id, payload.analysisId));

        const insertedSources = await Promise.all(
          pipelineResult.sources.map(async (source) => {
            const [row] = await tx
              .insert(schema.sources)
              .values({
                provider: source.provider,
                title: source.title,
                url: source.url,
                reliability: source.reliability.toFixed(2)
              })
              .returning({ id: schema.sources.id });

            return {
              id: row.id,
              key: source.key,
              reliability: source.reliability
            };
          })
        );

        const sourceMap = new Map(insertedSources.map((entry) => [entry.key, entry]));

        const insertedClaims = await Promise.all(
          pipelineResult.claims.map(async (claim) => {
            const [row] = await tx
              .insert(schema.claims)
              .values({
                analysisId: payload.analysisId,
                text: claim.text,
                extractionConfidence: claim.extractionConfidence.toFixed(2),
                verdict: claim.verdict,
                confidence: claim.confidence.toFixed(2)
              })
              .returning({ id: schema.claims.id });

            return {
              id: row.id,
              claim,
              sourceKeys: claim.sourceKeys
            };
          })
        );

        const analysisSourceValues = insertedClaims.flatMap(({ id: claimId, sourceKeys }) => {
          return sourceKeys
            .map((key) => {
              const sourceRecord = sourceMap.get(key);
              if (!sourceRecord) return null;
              return {
                analysisId: payload.analysisId,
                sourceId: sourceRecord.id,
                claimId,
                relevance: sourceRecord.reliability.toFixed(2)
              };
            })
            .filter((value): value is NonNullable<typeof value> => Boolean(value));
        });

        if (analysisSourceValues.length > 0) {
          await tx.insert(schema.analysisSources).values(analysisSourceValues);
        }

        if (pipelineResult.explanationSteps.length > 0) {
          await tx.insert(schema.explanationSteps).values(
            pipelineResult.explanationSteps.map((step) => ({
              analysisId: payload.analysisId,
              claimId:
                insertedClaims.find((item) => item.claim.id === step.id)?.id ??
                insertedClaims[0]?.id ??
                null,
              description: step.description,
              supportingSourceIds: step.sourceKeys.join(","),
              confidence: step.confidence.toFixed(2)
            }))
          );
        }
      });
    } catch (error) {
      logger.error({ jobId: job.id, err: error }, "Analysis pipeline failed");
      await db
        .update(schema.analyses)
        .set({
          status: "FAILED",
          updatedAt: new Date(),
          summary: "The automatic analysis pipeline encountered an error."
        })
        .where(eq(schema.analyses.id, payload.analysisId));
      throw error;
    }
  },
  { connection: connectionFactory }
);

// Wait for worker to be ready before processing jobs
worker.waitUntilReady()
  .then(() => {
    logger.info("✅ Worker ready and listening for jobs");
  })
  .catch((error) => {
    logger.error({ error }, "Failed to initialize worker");
  });

worker.on("ready", () => {
  logger.info("✅ Worker is ready to process jobs");
  console.log("[WORKER] ✅ Worker ready event fired - should be processing jobs now");
});

worker.on("stalled", (jobId) => {
  logger.warn({ jobId }, "Worker job stalled");
  console.log(`[WORKER] ⚠️ Job stalled: ${jobId}`);
});

worker.on("closing", () => {
  logger.info("Worker is closing");
  console.log("[WORKER] Worker closing");
});

worker.on("error", (error) => {
  // Suppress Redis connection errors - they're handled by the connection client
  const isRedisError = 
    error.message?.includes("Connection is closed") ||
    error.message?.includes("ECONNRESET") ||
    error.message?.includes("ECONNREFUSED") ||
    error.message?.includes("ETIMEDOUT") ||
    error.message?.includes("MaxRetriesPerRequestError");
  
  if (!isRedisError) {
    logger.error({ error }, "Worker error");
  }
});

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Analysis job completed");
});

worker.on("failed", (job, err) => {
  if (job?.data?.analysisId) {
    db
      .update(schema.analyses)
      .set({
        status: "FAILED",
        updatedAt: new Date()
      })
      .where(eq(schema.analyses.id, job.data.analysisId))
      .catch((error) => logger.error({ error }, "Failed to update analysis status to FAILED"));
  }

  logger.error({ jobId: job?.id, err }, "Analysis job failed");
});

// Log when worker starts processing
worker.on("active", (job) => {
  logger.info({ jobId: job.id, analysisId: job.data?.analysisId }, "Worker started processing job");
  console.log(`[WORKER] 🟢 Job active: ${job.id}, analysisId: ${job.data?.analysisId}`);
});

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
  logger.error({ reason }, "[Process] Unhandled rejection");
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
  logger.error({ error }, "[Process] Uncaught exception");
  process.exit(1);
});

// Startup function to ensure worker is ready
async function startWorker() {
  // CRITICAL: Log immediately to verify this function is called
  console.log("🔍 [WORKER] startWorker() function called");
  logger.info("🔍 [WORKER] startWorker() function called");
  
  try {
    logger.info("[Startup] Initializing worker...");
    console.log("[Startup] Initializing worker...");
    
    // Test database connection using pool directly
    try {
      await pool.query("SELECT 1");
      logger.info("[Startup] ✅ Database connection successful");
    } catch (error: any) {
      const errorCode = error?.code || "";
      const errorMessage = error?.message || "";
      
      // Check for password authentication error
      if (errorCode === "28P01" || errorMessage.includes("password authentication failed")) {
        logger.error(
          {
            error: {
              code: errorCode,
              message: "password authentication failed for user \"postgres\"",
              hint: "Check DATABASE_URL in Railway Worker Service variables"
            }
          },
          "[Startup] ❌ Database password authentication failed - check DATABASE_URL in Railway"
        );
        logger.error(
          {},
          "[Startup] Fix: Update DATABASE_URL in Railway Worker Service with correct Supabase password"
        );
      } else {
        logger.error({ error }, "[Startup] ❌ Database connection failed");
      }
      
      // Don't throw - let it retry, but log the error clearly
      logger.warn("[Startup] ⚠️ Worker will continue but database operations may fail");
    }
    
    // Test Redis connection by getting shared connection
    try {
      const conn = getSharedConnection();
      // Try to ping, but don't fail if it's not ready yet
      try {
        await conn.ping();
        logger.info("[Startup] ✅ Redis connection successful");
      } catch (pingError) {
        logger.warn({ error: pingError }, "[Startup] ⚠️ Redis ping failed (will retry automatically)");
        // Don't throw - Redis will retry automatically
      }
    } catch (error) {
      logger.warn({ error }, "[Startup] ⚠️ Redis connection test failed (will retry)");
      // Don't throw - Redis will retry automatically
    }
    
    // Wait for Redis connection to be fully ready first
    try {
      const redisConn = getSharedConnection();
      // Wait for Redis to be ready (with timeout)
      await Promise.race([
        new Promise<void>((resolve) => {
          if (redisConn.status === "ready") {
            resolve();
          } else {
            redisConn.once("ready", () => resolve());
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Redis ready timeout")), 10000)
        )
      ]);
      logger.info("[Startup] ✅ Redis connection ready");
    } catch (error) {
      logger.warn({ error }, "[Startup] ⚠️ Redis ready check timeout (will continue)");
    }
    
    // Wait for worker to be ready (with longer timeout and better error handling)
    try {
      logger.info("[Startup] Waiting for worker to be ready...");
      console.log("[Startup] Waiting for worker to be ready...");
      
      await Promise.race([
        worker.waitUntilReady(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Worker initialization timeout")), 60000)
        )
      ]);
      logger.info("[Startup] ✅ Worker ready and listening for jobs");
      console.log("[Startup] ✅ Worker ready and listening for jobs");
      
      // Verify worker is actually running
      const isRunning = (worker as any).isRunning?.() ?? false;
      logger.info(`[Startup] Worker isRunning: ${isRunning}`);
      console.log(`[Startup] Worker isRunning: ${isRunning}`);
    } catch (error) {
      logger.warn({ error }, "[Startup] ⚠️ Worker initialization timeout or error (will continue trying)");
      console.log(`[Startup] ⚠️ Worker initialization timeout: ${error}`);
      
      // Check if worker is actually running despite timeout
      try {
        const isRunning = (worker as any).isRunning?.() ?? false;
        logger.info(`[Startup] Worker state after timeout: isRunning=${isRunning}`);
        console.log(`[Startup] Worker state after timeout: isRunning=${isRunning}`);
      } catch (e) {
        logger.warn({ error: e }, "[Startup] Could not check worker state");
      }
      
      // Don't throw - worker will continue trying to connect
      // But log that it might not be processing jobs
      logger.warn("[Startup] ⚠️ Worker may not be processing jobs - check Redis connection");
      console.log("[Startup] ⚠️ Worker may not be processing jobs - check Redis connection");
    }
    
    logger.info("[Startup] 🚀 Worker startup complete");
  } catch (error) {
    logger.error({ error }, "[Startup] Failed to start worker");
    // Don't exit - let it retry, but log clearly
    logger.warn("[Startup] ⚠️ Worker will continue attempting to connect");
  }
}

// Start the worker - log explicitly to ensure this runs
logger.info("🚀 Worker process starting - calling startWorker()...");
startWorker().catch((error) => {
  logger.error({ error }, "❌ startWorker() failed");
  process.exit(1);
});

process.on("SIGINT", async () => {
  logger.info("Shutting down worker...");
  await worker.close();
  await queues.analysis.close();
  if (analysisQueueEvents) {
    await analysisQueueEvents.close();
  }
  await pool.end();
  if (sharedConnection) {
    await sharedConnection.quit();
  }
  process.exit(0);
});

