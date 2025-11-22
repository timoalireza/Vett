import { Queue, type ConnectionOptions } from "bullmq";
import { createRedisClient } from "../utils/redis-config.js";
import { env } from "../env.js";
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
      enableReadyCheck: true, // Changed to true - we want to know when Redis is ready
      lazyConnect: false // Changed to false - connect immediately
    });
    
    // CRITICAL: Ensure connection is established immediately
    // BullMQ Queue.add() will hang if Redis isn't connected
    if (sharedConnection.status === "wait" || sharedConnection.status === "end") {
      console.log(`[BullMQ-API] Redis status is ${sharedConnection.status}, connecting...`);
      sharedConnection.connect().catch((err) => {
        console.error(`[BullMQ-API] Failed to connect Redis: ${err.message}`);
      });
    }
  }
  
  return sharedConnection;
}

// CRITICAL: Ensure Redis connection is ready before creating Queue
// BullMQ Queue.add() will hang if Redis isn't connected when add() is called
const sharedConn = getSharedConnection();

// Wait for Redis to be ready before creating Queue
async function waitForRedisReady(): Promise<void> {
  if (sharedConn.status === "ready") {
    console.log(`[BullMQ-API] ✅ Redis already ready`);
    return;
  }
  
  console.log(`[BullMQ-API] Redis not ready (status: ${sharedConn.status}), waiting for connection...`);
  
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      console.warn(`[BullMQ-API] ⚠️ Redis ready timeout after 10s, proceeding anyway`);
      resolve();
    }, 10000);
    
    sharedConn.once("ready", () => {
      clearTimeout(timeout);
      console.log(`[BullMQ-API] ✅ Redis ready, creating Queue`);
      resolve();
    });
    
    // If already connecting, wait for it
    if (sharedConn.status === "connecting") {
      console.log(`[BullMQ-API] Redis is connecting, waiting...`);
    } else if (sharedConn.status === "wait" || sharedConn.status === "end") {
      // Try to connect if not already connecting
      sharedConn.connect().catch((err) => {
        console.error(`[BullMQ-API] Failed to connect Redis: ${err.message}`);
        clearTimeout(timeout);
        resolve(); // Continue anyway
      });
    }
  });
}

// Wait for Redis to be ready (synchronously block module loading)
// This ensures Queue is created with a ready Redis connection
let redisReadyPromise: Promise<void> | null = null;
if (sharedConn.status !== "ready") {
  redisReadyPromise = waitForRedisReady();
}

/**
 * Connection factory for BullMQ
 * Always returns the shared connection with proper configuration
 * The shared connection is created with maxRetriesPerRequest: null via createRedisClient
 */
const connectionFactory: ConnectionOptions = {
  createClient: (type: string) => {
    const conn = getSharedConnection();
    
    // Log when BullMQ requests a connection (for debugging)
    console.log(`[BullMQ-API] Connection factory called: type=${type}, redisStatus=${conn.status}`);
    
    // CRITICAL: If Redis isn't ready, log a warning
    if (conn.status !== "ready") {
      console.warn(`[BullMQ-API] ⚠️ Creating connection but Redis status is ${conn.status}`);
    } else {
      console.log(`[BullMQ-API] ✅ Connection created with ready Redis (type=${type})`);
    }
    
    // Return the shared connection - BullMQ will reuse it
    return conn;
  }
};

// Create Queue with connection factory
// Note: We can't await redisReadyPromise here because this is top-level module code
// But the connection should be ready by the time Queue.add() is called
export const queues = {
  analysis: new Queue("analysis", {
    connection: connectionFactory,
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000
      }
    }
  })
};

// Export a function to ensure Redis is ready before using Queue
export async function ensureRedisReady(): Promise<void> {
  if (redisReadyPromise) {
    await redisReadyPromise;
  }
  if (sharedConn.status !== "ready") {
    await waitForRedisReady();
  }
}

export type QueueName = keyof typeof queues;

// Export connection getter for use in other modules
export function getBullMQConnection(): IORedis {
  return getSharedConnection();
}

