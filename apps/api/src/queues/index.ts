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
      enableReadyCheck: false
    });
  }
  
  return sharedConnection;
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

export type QueueName = keyof typeof queues;

// Export connection getter for use in other modules
export function getBullMQConnection(): IORedis {
  return getSharedConnection();
}

