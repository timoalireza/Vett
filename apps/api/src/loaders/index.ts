import DataLoader from "dataloader";
import { inArray } from "drizzle-orm";

import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { analysisService } from "../services/analysis-service.js";

/**
 * DataLoader for users by external ID (Clerk ID)
 * Batches multiple getUserByExternalId calls into a single query
 */
export function createUserByExternalIdLoader() {
  return new DataLoader<string, typeof users.$inferSelect | null>(
    async (externalIds: readonly string[]) => {
      const results = await db.query.users.findMany({
        where: inArray(users.externalId, [...externalIds])
      });

      // Create a map for O(1) lookup
      const userMap = new Map<string, typeof users.$inferSelect>();
      results.forEach((user) => {
        if (user.externalId) {
          userMap.set(user.externalId, user);
        }
      });

      // Return results in the same order as requested keys
      return externalIds.map((id) => userMap.get(id) || null);
    },
    {
      // Cache results for the duration of the request
      cache: true,
      // Batch even if only one key is requested (helps with consistency)
      batchScheduleFn: (callback) => setTimeout(callback, 0)
    }
  );
}

/**
 * DataLoader for users by internal ID
 * Batches multiple getUserById calls into a single query
 */
export function createUserByIdLoader() {
  return new DataLoader<string, typeof users.$inferSelect | null>(
    async (userIds: readonly string[]) => {
      const results = await db.query.users.findMany({
        where: inArray(users.id, [...userIds])
      });

      // Create a map for O(1) lookup
      const userMap = new Map<string, typeof users.$inferSelect>();
      results.forEach((user) => {
        userMap.set(user.id, user);
      });

      // Return results in the same order as requested keys
      return userIds.map((id) => userMap.get(id) || null);
    },
    {
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 0)
    }
  );
}

/**
 * DataLoader for analyses by ID
 * Batches database queries but delegates to analysisService for business logic
 * This ensures watermark calculation and other logic is consistent
 */
export function createAnalysisByIdLoader() {
  return new DataLoader<
    { id: string; userId?: string },
    Awaited<ReturnType<typeof analysisService.getAnalysisSummary>> | null,
    string
  >(
    async (keys: readonly { id: string; userId?: string }[]) => {
      // Use the existing service method which handles all business logic
      // DataLoader will batch these calls, but we still get the benefit of
      // request-level caching (same analysis requested multiple times in one query)
      return Promise.all(
        keys.map((key) => analysisService.getAnalysisSummary(key.id, key.userId))
      );
    },
    {
      // Custom cache key function to include userId in cache key
      cacheKeyFn: (key) => `${key.id}:${key.userId || "anonymous"}`,
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 0)
    }
  );
}

/**
 * DataLoader context interface
 */
export interface DataLoaderContext {
  userByExternalId: ReturnType<typeof createUserByExternalIdLoader>;
  userById: ReturnType<typeof createUserByIdLoader>;
  analysisById: ReturnType<typeof createAnalysisByIdLoader>;
}

/**
 * Create all DataLoaders for a request
 * Should be called once per GraphQL request
 */
export function createDataLoaders(): DataLoaderContext {
  return {
    userByExternalId: createUserByExternalIdLoader(),
    userById: createUserByIdLoader(),
    analysisById: createAnalysisByIdLoader()
  };
}

