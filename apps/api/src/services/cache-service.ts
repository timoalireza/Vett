import IORedis from "ioredis";
import { createHash } from "crypto";
import { createRedisClient } from "../utils/redis-config.js";
import { env } from "../env.js";

/**
 * Cache service for GraphQL queries and other data
 */
class CacheService {
  private client: IORedis | null = null;
  private enabled: boolean = false;

  /**
   * Initialize Redis connection for caching
   */
  async initialize(): Promise<void> {
    if (env.NODE_ENV === "test") {
      // Disable caching in tests
      return;
    }

    try {
      this.client = createRedisClient(env.REDIS_URL, {
        // Use a different database index for cache (default is 0, use 1)
        db: 1,
        maxRetriesPerRequest: null // Unlimited retries to prevent errors
      });
      
      // Suppress all Redis errors - they are handled by createRedisClient
      // Caching will automatically fail gracefully if Redis is unavailable
      
      await this.client.connect();
      this.enabled = true;
      console.log("✅ Redis cache initialized");
    } catch (error) {
      console.warn("⚠️  Redis cache not available, caching disabled", error);
      this.enabled = false;
      this.client = null;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.enabled = false;
    }
  }

  /**
   * Generate cache key from query and variables
   */
  private generateKey(prefix: string, query: string, variables?: Record<string, unknown>, userId?: string): string {
    const keyParts = [prefix, query];
    
    if (variables && Object.keys(variables).length > 0) {
      // Sort variables for consistent keys
      const sortedVars = JSON.stringify(variables, Object.keys(variables).sort());
      keyParts.push(sortedVars);
    }
    
    if (userId) {
      keyParts.push(`user:${userId}`);
    }
    
    const keyString = keyParts.join(":");
    // Hash long keys to avoid Redis key length limits
    if (keyString.length > 250) {
      const hash = createHash("sha256").update(keyString).digest("hex");
      return `${prefix}:hash:${hash}`;
    }
    
    return keyString;
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  /**
   * Delete multiple cached values by pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error("Cache deletePattern error:", error);
    }
  }

  /**
   * Cache GraphQL query result
   */
  async cacheGraphQLQuery(
    query: string,
    variables: Record<string, unknown> | undefined,
    result: unknown,
    ttlSeconds: number = 300, // Default 5 minutes
    userId?: string
  ): Promise<void> {
    const key = this.generateKey("graphql:query", query, variables, userId);
    await this.set(key, result, ttlSeconds);
  }

  /**
   * Get cached GraphQL query result
   */
  async getCachedGraphQLQuery<T>(
    query: string,
    variables: Record<string, unknown> | undefined,
    userId?: string
  ): Promise<T | null> {
    const key = this.generateKey("graphql:query", query, variables, userId);
    return this.get<T>(key);
  }

  /**
   * Invalidate cache for a specific analysis
   */
  async invalidateAnalysis(analysisId: string, userId?: string): Promise<void> {
    // Invalidate all queries that might include this analysis
    const patterns = [
      `graphql:query:*analysis*${analysisId}*`,
      `graphql:query:*analysisId*${analysisId}*`
    ];
    
    if (userId) {
      patterns.push(`graphql:query:*user:${userId}*analysis*${analysisId}*`);
    }
    
    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }
  }

  /**
   * Invalidate all cache for a user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.deletePattern(`graphql:query:*user:${userId}*`);
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const cacheService = new CacheService();

