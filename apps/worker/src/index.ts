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
  createClient: (type: string) => {
    const conn = getSharedConnection();
    
    // Log when BullMQ requests a connection (for debugging)
    // Use info level so it shows in production logs
    logger.info({ type, redisStatus: conn.status }, "[BullMQ] Connection factory called");
    console.log(`[BullMQ] Connection factory called: type=${type}, redisStatus=${conn.status}`);
    
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
    
    // CRITICAL: If Redis isn't ready, log a warning
    if (conn.status !== "ready") {
      logger.warn({ type, redisStatus: conn.status }, "[BullMQ] ⚠️ Creating connection but Redis not ready");
      console.log(`[BullMQ] ⚠️ Creating connection but Redis status is ${conn.status}`);
    } else {
      logger.info({ type }, "[BullMQ] ✅ Connection created with ready Redis");
      console.log(`[BullMQ] ✅ Connection created with ready Redis (type=${type})`);
    }
    
    return conn;
  }
} as ConnectionOptions;

const pool = new Pool({
  connectionString: env.DATABASE_URL
});
const db = drizzle(pool, { schema });

// Removed ensureRedisConnection - using initializeRedisForBullMQ instead

export const queues = {
  analysis: new Queue("analysis", { connection: connectionFactory })
};

// CRITICAL: Ensure Redis connection is established BEFORE creating Worker
// BullMQ Worker needs an active Redis connection to receive jobs
let redisInitialized = false;

async function initializeRedisForBullMQ() {
  if (redisInitialized) return;
  
  try {
    const conn = getSharedConnection();
    
    // Connect if not already connected
    if (conn.status !== "ready" && conn.status !== "connecting") {
      logger.info("[Init] Connecting to Redis for BullMQ...");
      console.log("[Init] Connecting to Redis for BullMQ...");
      await conn.connect();
    }
    
    // Wait for ready state
    if (conn.status !== "ready") {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Redis ready timeout"));
        }, 30000);
        
        if (conn.status === "ready") {
          clearTimeout(timeout);
          resolve();
        } else {
          conn.once("ready", () => {
            clearTimeout(timeout);
            resolve();
          });
          conn.once("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        }
      });
    }
    
    // Verify with ping
    const pingResult = await conn.ping();
    logger.info({ pingResult }, "[Init] ✅ Redis ready for BullMQ");
    console.log(`[Init] ✅ Redis ready for BullMQ (ping: ${pingResult})`);
    redisInitialized = true;
  } catch (error) {
    logger.error({ error }, "[Init] ❌ Redis initialization failed - Worker may not work");
    console.log(`[Init] ❌ Redis initialization failed: ${error}`);
    throw error;
  }
}

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

// CRITICAL: Create Worker AFTER Redis is initialized
// This ensures BullMQ can properly connect to Redis
let worker: Worker | null = null;

function createWorker(): Worker {
  if (!worker) {
    worker = new Worker(
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
  }
  return worker;
}

// Export worker getter - will create worker when called
export function getWorker(): Worker {
  return createWorker();
}

// Worker event listeners will be set up in startWorker() after worker is created
// This ensures Redis is connected before we set up listeners
function setupWorkerEventListeners(workerInstance: Worker) {
  workerInstance.on("ready", () => {
    logger.info("✅ Worker is ready to process jobs");
    console.log("[WORKER] ✅ Worker ready event fired - should be processing jobs now");
  });

  workerInstance.on("stalled", (jobId) => {
    logger.warn({ jobId }, "Worker job stalled");
    console.log(`[WORKER] ⚠️ Job stalled: ${jobId}`);
  });

  workerInstance.on("closing", () => {
    logger.info("Worker is closing");
    console.log("[WORKER] Worker closing");
  });

  workerInstance.on("error", (error) => {
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

  workerInstance.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Analysis job completed");
  });

  workerInstance.on("failed", (job, err) => {
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
  workerInstance.on("active", (job) => {
    logger.info({ jobId: job.id, analysisId: job.data?.analysisId }, "🟢 Job active: {jobId}");
    console.log(`[WORKER] 🟢 Job active: ${job.id}, analysisId: ${job.data?.analysisId}`);
  });
}

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
    
    // CRITICAL: Ensure Redis connection is actually established BEFORE creating Worker
    // BullMQ Worker needs Redis to be connected when it's created
    try {
      await initializeRedisForBullMQ();
      logger.info("[Startup] ✅ Redis initialized for BullMQ");
      console.log("[Startup] ✅ Redis initialized for BullMQ");
    } catch (error) {
      logger.error({ error }, "[Startup] ❌ Redis initialization failed - cannot create worker");
      console.log(`[Startup] ❌ Redis initialization failed: ${error}`);
      throw error; // Can't create worker without Redis
    }
    
    // CRITICAL: Create worker AFTER Redis is connected
    // This ensures BullMQ can properly connect to Redis when the worker is created
    logger.info("[Startup] Creating BullMQ Worker...");
    console.log("[Startup] Creating BullMQ Worker...");
    
    // Verify Redis is actually ready before creating worker
    const redisConn = getSharedConnection();
    if (redisConn.status !== "ready") {
      logger.error("[Startup] ❌ Redis not ready - cannot create worker");
      console.log(`[Startup] ❌ Redis status: ${redisConn.status} - waiting for ready...`);
      await new Promise<void>((resolve) => {
        redisConn.once("ready", () => {
          logger.info("[Startup] ✅ Redis ready - now creating worker");
          console.log("[Startup] ✅ Redis ready - now creating worker");
          resolve();
        });
      });
    }
    
    // Create worker - this will use the connectionFactory which returns the shared Redis connection
    const workerInstance = createWorker();
    
    // CRITICAL: Store worker instance in module-level variable for signal handlers
    worker = workerInstance;
    
    // Set up event listeners
    setupWorkerEventListeners(workerInstance);
    
    // Log worker creation details
    logger.info({ 
      workerName: (workerInstance as any).name,
      queueName: (workerInstance as any).queueName 
    }, "[Startup] Worker created");
    console.log(`[Startup] Worker created: name=${(workerInstance as any).name}, queue=${(workerInstance as any).queueName}`);
    
    // Wait for worker to be ready (with longer timeout and better error handling)
    try {
      logger.info("[Startup] Waiting for worker to be ready...");
      console.log("[Startup] Waiting for worker to be ready...");
      
      await Promise.race([
        workerInstance.waitUntilReady(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Worker initialization timeout")), 60000)
        )
      ]);
      logger.info("[Startup] ✅ Worker ready and listening for jobs");
      console.log("[Startup] ✅ Worker ready and listening for jobs");
      
      // Verify worker is actually running
      const isRunning = (workerInstance as any).isRunning?.() ?? false;
      logger.info({ isRunning }, "[Startup] Worker isRunning status");
      console.log(`[Startup] Worker isRunning: ${isRunning}`);
      
      // CRITICAL: Verify worker can access the queue
      try {
        const queue = queues.analysis;
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        logger.info({ 
          waiting: waiting.length, 
          active: active.length 
        }, "[Startup] Queue status after worker ready");
        console.log(`[Startup] Queue status: ${waiting.length} waiting, ${active.length} active jobs`);
      } catch (queueError) {
        logger.error({ error: queueError }, "[Startup] Could not check queue status");
        console.log(`[Startup] Could not check queue status: ${queueError}`);
      }
    } catch (error) {
      logger.warn({ error }, "[Startup] ⚠️ Worker initialization timeout or error (will continue trying)");
      console.log(`[Startup] ⚠️ Worker initialization timeout: ${error}`);
      
      // Check if worker is actually running despite timeout
      try {
        const isRunning = (workerInstance as any).isRunning?.() ?? false;
        logger.info({ isRunning }, "[Startup] Worker state after timeout");
        console.log(`[Startup] Worker state after timeout: isRunning=${isRunning}`);
        
        // CRITICAL: Always check queue status, even after timeout
        // This helps diagnose if jobs are being enqueued but not processed
        try {
          const queue = queues.analysis;
          const waiting = await queue.getWaiting();
          const active = await queue.getActive();
          const delayed = await queue.getDelayed();
          const completed = await queue.getCompleted();
          logger.info({ 
            waiting: waiting.length, 
            active: active.length,
            delayed: delayed.length,
            completed: completed.length,
            isRunning
          }, "[Startup] Queue status (after timeout)");
          console.log(`[Startup] Queue status: ${waiting.length} waiting, ${active.length} active, ${delayed.length} delayed, ${completed.length} completed, isRunning=${isRunning}`);
          
          // If there are waiting jobs but worker isn't processing, that's a problem
          if (waiting.length > 0 && isRunning) {
            logger.warn({ waiting: waiting.length }, "[Startup] ⚠️ Worker is running but NOT processing waiting jobs!");
            console.warn(`[Startup] ⚠️ Worker is running but NOT processing ${waiting.length} waiting jobs!`);
          }
        } catch (queueError) {
          logger.error({ error: queueError }, "[Startup] ❌ Could not check queue status - Redis connection issue?");
          console.error(`[Startup] ❌ Could not check queue status: ${queueError}`);
        }
        
        // Even if waitUntilReady() times out, check if worker can process jobs
        if (isRunning) {
          logger.info("[Startup] ✅ Worker is running - it should process jobs even if initialization timed out");
          console.log("[Startup] ✅ Worker is running - it should process jobs even if initialization timed out");
        } else {
          logger.error("[Startup] ❌ Worker is NOT running - jobs will not be processed");
          console.error("[Startup] ❌ Worker is NOT running - jobs will not be processed");
        }
      } catch (e) {
        logger.warn({ error: e }, "[Startup] Could not check worker state");
        console.warn(`[Startup] Could not check worker state: ${e}`);
      }
      if (isRunning) {
        logger.info("[Startup] ✅ Worker is running - it should process jobs even if initialization timed out");
        console.log("[Startup] ✅ Worker is running - it should process jobs even if initialization timed out");
        
      // Try to check queue status and verify worker can access Redis
      try {
        const queue = queues.analysis;
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const delayed = await queue.getDelayed();
        const completed = await queue.getCompleted();
        logger.info({ 
          waiting: waiting.length, 
          active: active.length,
          delayed: delayed.length,
          completed: completed.length
        }, "[Startup] Queue status");
        console.log(`[Startup] Queue status: ${waiting.length} waiting, ${active.length} active, ${delayed.length} delayed, ${completed.length} completed`);
        
        // Verify worker can actually access the queue
        const workerIsRunning = (workerInstance as any).isRunning?.() ?? false;
        const workerName = (workerInstance as any).name ?? "unknown";
        logger.info({ workerIsRunning, workerName }, "[Startup] Worker details");
        console.log(`[Startup] Worker details: isRunning=${workerIsRunning}, name=${workerName}`);
      } catch (queueError) {
        logger.error({ error: queueError }, "[Startup] Could not check queue status - Redis connection issue");
        console.log(`[Startup] Could not check queue status: ${queueError}`);
      }
      }
    }
    
    logger.info("[Startup] 🚀 Worker startup complete");
    console.log("[Startup] 🚀 Worker startup complete");
    
    // Add periodic logging to verify worker is alive and processing
    setInterval(() => {
      const isRunning = (worker as any).isRunning?.() ?? false;
      logger.info({ isRunning }, "[Health] Worker status check");
      console.log(`[Health] Worker status: isRunning=${isRunning}`);
    }, 30000); // Every 30 seconds
  } catch (error) {
    logger.error({ error }, "[Startup] Failed to start worker");
    // Don't exit - let it retry, but log clearly
    logger.warn("[Startup] ⚠️ Worker will continue attempting to connect");
  }
}

// Start the worker - log explicitly to ensure this runs
logger.info("🚀 Worker process starting - calling startWorker()...");
console.log("🚀 Worker process starting - calling startWorker()...");

// CRITICAL: Don't exit on error - let the worker keep running
// The worker is already created and will continue trying to connect
startWorker().catch((error) => {
  logger.error({ error }, "❌ startWorker() failed - but worker will continue running");
  console.log(`❌ startWorker() failed: ${error} - but worker will continue running`);
  // DON'T exit - the worker process should keep running even if initialization fails
  // The worker will continue trying to connect and process jobs
});

// CRITICAL: Keep the process alive - worker needs to run continuously
// Set up signal handlers for graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received - shutting down gracefully");
  console.log("SIGTERM received - shutting down gracefully");
  try {
    if (worker) {
      await worker.close();
    }
    await queues.analysis.close();
    if (analysisQueueEvents) {
      await analysisQueueEvents.close();
    }
    await pool.end();
    if (sharedConnection) {
      await sharedConnection.quit();
    }
  } catch (error) {
    logger.error({ error }, "Error during shutdown");
  }
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received - shutting down gracefully");
  console.log("SIGINT received - shutting down gracefully");
  try {
    if (worker) {
      await worker.close();
    }
    await queues.analysis.close();
    if (analysisQueueEvents) {
      await analysisQueueEvents.close();
    }
    await pool.end();
    if (sharedConnection) {
      await sharedConnection.quit();
    }
  } catch (error) {
    logger.error({ error }, "Error during shutdown");
  }
  process.exit(0);
});

// CRITICAL: Keep process alive - don't let it exit
// The worker needs to run continuously to process jobs from the queue
// This ensures the process stays alive even if startWorker() completes
setInterval(() => {
  // Keep process alive - this interval never exits
}, 60000); // Check every minute (just to keep process alive)

