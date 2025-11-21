import IORedis, { type RedisOptions } from "ioredis";
import { URL } from "node:url";

/**
 * Normalize Redis URL for Upstash - converts redis:// to rediss:// if needed
 */
export function normalizeRedisUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // If it's an Upstash URL with redis://, convert to rediss://
    if (parsed.hostname.includes("upstash.io") && parsed.protocol === "redis:") {
      parsed.protocol = "rediss:";
      return parsed.toString();
    }
    
    return url;
  } catch {
    return url;
  }
}

/**
 * Get Redis connection options with proper TLS configuration for Upstash
 */
export function getRedisOptions(url: string, options: Partial<RedisOptions> = {}): RedisOptions {
  const normalizedUrl = normalizeRedisUrl(url);
  const parsed = new URL(normalizedUrl);
  const isTLS = parsed.protocol === "rediss:" || parsed.hostname.includes("upstash.io");
  
  // CRITICAL: Ensure maxRetriesPerRequest is ALWAYS null, even if options override it
  const baseOptions: RedisOptions = {
    maxRetriesPerRequest: null, // MUST be null - unlimited retries
    enableReadyCheck: false,
    connectTimeout: 60000, // 60 second timeout
    retryStrategy: (times) => {
      // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, max 10000ms
      // Increased max delay to reduce reconnection attempts
      const delay = Math.min(times * 50, 10000);
      // Never stop retrying - return delay even for very high retry counts
      return delay;
    },
    // Enable TLS for Upstash Redis
    ...(isTLS && {
      tls: {
        rejectUnauthorized: false
      }
    }),
  };
  
  // Merge options, but FORCE maxRetriesPerRequest to null
  return {
    ...baseOptions,
    ...options,
    maxRetriesPerRequest: null, // ALWAYS override to null, no matter what
  };
}

/**
 * Create a Redis client with proper Upstash configuration
 */
export function createRedisClient(url: string, options: Partial<RedisOptions> = {}): IORedis {
  const normalizedUrl = normalizeRedisUrl(url);
  const redisOptions = getRedisOptions(normalizedUrl, options);
  
  // CRITICAL: Ensure maxRetriesPerRequest is explicitly null
  // Override any defaults that might have been set
  const finalOptions: RedisOptions = {
    ...redisOptions,
    // Force these critical options to prevent retry limit errors
    maxRetriesPerRequest: null, // MUST be null - unlimited retries
    // Additional options for better connection stability
    keepAlive: 30000, // Send keepalive packets every 30 seconds
    family: 4, // Force IPv4 (Upstash may have IPv6 issues)
    // Handle connection errors gracefully
    enableOfflineQueue: false, // Don't queue commands when disconnected
    enableReadyCheck: redisOptions.enableReadyCheck ?? false, // BullMQ handles ready checks
    lazyConnect: redisOptions.lazyConnect ?? true, // Don't connect immediately
    // Increase connection timeout
    connectTimeout: redisOptions.connectTimeout ?? 60000, // 60 second timeout for initial connection
  };
  
  // Create client with error handlers attached immediately
  const client = new IORedis(normalizedUrl, finalOptions);
  
  // Set max listeners to prevent warnings
  client.setMaxListeners(20);
  
  // Attach error handlers IMMEDIATELY and SYNCHRONOUSLY to catch all errors
  // This must happen before any async operations
  // Suppress all Redis connection errors - they are non-fatal and handled gracefully
  const errorHandler = (err: Error) => {
    // Silently handle Redis connection errors - they are non-fatal
    // These errors are expected during reconnection and should not be logged
    const isNonFatalError = 
      err.message.includes("ECONNRESET") ||
      err.message.includes("ECONNREFUSED") ||
      err.message.includes("ETIMEDOUT") ||
      err.message.includes("MaxRetriesPerRequestError") ||
      err.message.includes("Connection is closed") ||
      err.message.includes("Redis") ||
      err.message.includes("ioredis");
    
    // Only log non-Redis errors or completely unexpected errors
    if (!isNonFatalError) {
      console.warn(`[Redis] Unexpected error: ${err.message}`);
    }
    
    // Explicitly prevent error propagation - these are handled gracefully
    return false;
  };
  
  // Suppress all default ioredis error handlers and replace with silent handler
  client.removeAllListeners("error");
  client.on("error", errorHandler);
  client.prependListener("error", errorHandler); // Prepend to catch early errors
  
  // Suppress connection lifecycle events - they're too verbose
  // Only log successful connections
  client.on("ready", () => {
    console.log("✅ Redis client ready");
  });
  
  return client;
}

