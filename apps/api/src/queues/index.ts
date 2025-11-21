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
    sharedConnection = createRedisClient(env.REDIS_URL, {
      maxRetriesPerRequest: null, // MUST be null - unlimited retries
      enableReadyCheck: false
    });
    
    // CRITICAL: Force verify and set maxRetriesPerRequest
    if ((sharedConnection as any).options?.maxRetriesPerRequest !== null) {
      (sharedConnection as any).options.maxRetriesPerRequest = null;
    }
    
    // Ensure connection options are correct
    (sharedConnection as any).options = {
      ...(sharedConnection as any).options,
      maxRetriesPerRequest: null, // Force null
      enableReadyCheck: false,
      lazyConnect: true
    };
  }
  
  return sharedConnection;
}

/**
 * Connection factory for BullMQ
 * Always returns the shared connection with proper configuration
 */
const connectionFactory: ConnectionOptions = {
  createClient: (type: string) => {
    const conn = getSharedConnection();
    
    // Log connection creation for debugging
    console.log(`[BullMQ] Creating ${type} connection with maxRetriesPerRequest: ${(conn as any).options?.maxRetriesPerRequest}`);
    
    // Ensure maxRetriesPerRequest is null
    if ((conn as any).options?.maxRetriesPerRequest !== null) {
      (conn as any).options.maxRetriesPerRequest = null;
    }
    
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

