import mercurius from "mercurius";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { env } from "../env.js";
import { schema } from "../graphql/schema.js";
import { resolvers } from "../resolvers/index.js";
import { cacheService } from "../services/cache-service.js";
import { createDataLoaders } from "../loaders/index.js";
import { subscriptionService } from "../services/subscription-service.js";
import { userService } from "../services/user-service.js";
import { trackGraphQLQuery, trackGraphQLMutation, trackGraphQLError } from "./metrics.js";

// Simple in-memory store for mutation rate limiting
// In production, this should use Redis for distributed rate limiting
const mutationRateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Rate limit configuration based on subscription tier
const MUTATION_RATE_LIMITS = {
  FREE: 30, // 30 mutations per window
  PLUS: 100, // 100 mutations per window
  PRO: 500 // 500 mutations per window
};

const MUTATION_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Detect if a GraphQL query is a mutation, handling comments and whitespace correctly.
 * GraphQL supports:
 * - Single-line comments: # comment
 * - Block comments: """block comment""" or '''block comment'''
 * 
 * This function removes comments and checks if the first non-comment token is "mutation".
 */
function isMutation(query: string): boolean {
  if (!query) return false;
  
  let cleaned = query;
  
  // Remove single-line comments (# comment)
  // Matches # followed by any characters except newline/carriage return
  cleaned = cleaned.replace(/#[^\n\r]*/g, '');
  
  // Remove block comments ("""...""" or '''...''')
  // Use non-greedy matching to handle multiple block comments
  // The 's' flag makes . match newlines
  // Note: GraphQL block comments cannot contain the delimiter inside, so this is safe
  cleaned = cleaned.replace(/""".*?"""/gs, ''); // """..."""
  cleaned = cleaned.replace(/'''.*?'''/gs, ''); // '''...'''
  
  // Remove all whitespace (spaces, tabs, newlines, carriage returns)
  cleaned = cleaned.replace(/\s+/g, '');
  
  // Check if it starts with "mutation"
  return cleaned.startsWith('mutation');
}

async function checkMutationRateLimit(request: FastifyRequest): Promise<{ allowed: boolean; retryAfter?: number }> {
  if (!env.RATE_LIMIT_ENABLED) {
    return { allowed: true };
  }

  const userId = (request as any).userId;
  const key = userId ? `mutation:user:${userId}` : `mutation:ip:${request.ip || request.socket.remoteAddress || "unknown"}`;
  
  // Get rate limit for user
  let limit: number;
  if (!userId) {
    limit = Math.floor(env.RATE_LIMIT_MUTATION_MAX / 2); // Half limit for anonymous
  } else {
    try {
      const dbUserId = await userService.getOrCreateUser(userId);
      const subscription = await subscriptionService.getSubscriptionInfo(dbUserId);
      // Fallback to FREE tier if plan is not recognized
      limit = MUTATION_RATE_LIMITS[subscription.plan as keyof typeof MUTATION_RATE_LIMITS] ?? MUTATION_RATE_LIMITS.FREE;
    } catch (error) {
      limit = MUTATION_RATE_LIMITS.FREE;
    }
  }

  const now = Date.now();
  const record = mutationRateLimitStore.get(key);

  // Clean up expired records periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    for (const [k, v] of mutationRateLimitStore.entries()) {
      if (v.resetAt < now) {
        mutationRateLimitStore.delete(k);
      }
    }
  }

  if (!record || record.resetAt < now) {
    // Create new record
    mutationRateLimitStore.set(key, {
      count: 1,
      resetAt: now + MUTATION_RATE_WINDOW
    });
    return { allowed: true };
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  record.count++;
  return { allowed: true };
}

export async function registerGraphql(app: FastifyInstance) {
  // Security validation rules completely disabled - no depth or complexity limits
  // Per user request to remove all query depth limits

  // Add hook to rate limit GraphQL mutations
  // Use preHandler - body is parsed at this stage (after preValidation where body parsing occurs)
  app.addHook("preHandler", async (request: FastifyRequest, reply) => {
    if (request.url === "/graphql" && request.method === "POST") {
      // If body is not parsed, skip mutation-specific rate limiting
      // We can't determine if it's a mutation without parsing the body
      // General rate limiting (from rate-limit plugin) will still apply
      if (!request.body) {
        // Allow request to proceed - Mercurius will handle parsing errors
        // General rate limiting plugin will still enforce limits
        return;
      }

      // Only apply mutation-specific rate limiting when we can confirm it's a mutation
      const body = request.body as { query?: string } | undefined;
      if (body?.query && isMutation(body.query)) {
        const rateLimitCheck = await checkMutationRateLimit(request);
        if (!rateLimitCheck.allowed) {
          return reply.code(429).send({
            error: "Too Many Requests",
            message: `Mutation rate limit exceeded. Please try again in ${rateLimitCheck.retryAfter} seconds.`,
            retryAfter: rateLimitCheck.retryAfter
          });
        }
      }
    }
  });

  await app.register(mercurius, {
    schema,
    resolvers,
    graphiql: env.NODE_ENV !== "production", // Disable GraphiQL in production
    path: "/graphql",
    subscription: true,
    // Pass request context to resolvers
    context: (request) => ({
      userId: request.userId,
      user: request.user,
      // Create DataLoaders per request (they cache within a single request)
      loaders: createDataLoaders()
    }),
    // Explicitly disable all validation rules - no depth/complexity limits
    // Mercurius passes validationRules to GraphQL's validate function
    // Empty array means no custom validation rules are applied
    // GraphQL itself has NO default depth limit - if you see depth errors,
    // they must be coming from a custom validation rule or cached response
    validationRules: [],
    // Custom cache function for GraphQL queries
    cache: cacheService.isEnabled() ? async (request: FastifyRequest, query: string, variables?: Record<string, unknown>) => {
      // Skip caching for mutations
      // Note: Mutation tracking is handled in resolvers to avoid double-counting
      if (isMutation(query)) {
        return null;
      }
      
      // Track queries regardless of caching status
      trackGraphQLQuery();
      
      // Get cached result
      const cached = await cacheService.getCachedGraphQLQuery(
        query,
        variables,
        (request as any).userId
      );
      
      if (cached) {
        return cached;
      }
      
      // Return null to proceed with normal execution
      // The result will be cached in the onResponse hook
      return null;
    } : async (request: FastifyRequest, query: string, variables?: Record<string, unknown>) => {
      // When caching is disabled, still track queries for metrics
      // Skip tracking for mutations (handled in resolvers)
      if (!isMutation(query)) {
        trackGraphQLQuery();
      }
      return null; // Always proceed with normal execution when caching is disabled
    },
    // Custom error formatter for better error messages
    errorFormatter: (execution, _context) => {
      // Track GraphQL errors
      if (execution.errors && execution.errors.length > 0) {
        trackGraphQLError();
      }
      
      const errors = execution.errors.map((error) => {
        // Enhance security-related errors
        if (error.extensions?.code === "QUERY_DEPTH_EXCEEDED") {
          return {
            message: error.message,
            extensions: {
              code: "QUERY_DEPTH_EXCEEDED",
              maxDepth: error.extensions.maxDepth,
              actualDepth: error.extensions.actualDepth
            }
          };
        }
        
        if (error.message.includes("complexity")) {
          return {
            message: error.message,
            extensions: {
              code: "QUERY_COMPLEXITY_EXCEEDED"
            }
          };
        }
        
        // Log the actual error for debugging (even in production)
        console.error("[GraphQL] Error:", {
          message: error.message,
          stack: error.stack,
          path: error.path,
          locations: error.locations
        });
        
        // Don't expose internal errors in production, but provide more helpful messages
        if (env.NODE_ENV === "production") {
          // Check if it's a known error type and provide better message
          const errorMessage = error.message.toLowerCase();
          if (errorMessage.includes("unable to process") || errorMessage.includes("try again")) {
            // User-friendly error - pass it through
            return {
              message: error.message,
              extensions: {
                code: "SERVICE_UNAVAILABLE"
              }
            };
          }
          
          // Log the actual error for debugging (even in production)
          console.error("[GraphQL] Production error details:", {
            message: error.message,
            stack: error.stack,
            path: error.path,
            name: error.name
          });
          
          // For database/auth errors, provide more context
          if (errorMessage.includes("row level security") || errorMessage.includes("rls") || errorMessage.includes("permission denied")) {
            return {
              message: "Database access error. Please contact support.",
              extensions: {
                code: "DATABASE_ERROR"
              }
            };
          }
          
          // Temporarily expose more error details for debugging
          // TODO: Remove detailed error messages after fixing the issue
          const errorDetails = error.message || "Unknown error";
          const errorCode = error.extensions?.code || "INTERNAL_ERROR";
          
          return {
            message: `Error: ${errorDetails}${errorCode !== "INTERNAL_ERROR" ? ` (${errorCode})` : ""}`,
            extensions: {
              code: errorCode,
              // Include original error code if available
              originalCode: error.extensions?.code,
              // Include path for debugging
              path: error.path
            }
          };
        }
        
        return error;
      });

      return {
        statusCode: 200, // GraphQL always returns 200, errors are in response
        response: {
          data: execution.data,
          errors
        }
      };
    }
  });

  // Add hook to cache successful GraphQL query responses
  if (cacheService.isEnabled()) {
    app.addHook("onResponse", async (request, reply) => {
      // Only cache GraphQL POST requests (queries, not mutations)
      if (
        request.url === "/graphql" &&
        request.method === "POST" &&
        request.body &&
        typeof request.body === "object"
      ) {
        const body = request.body as { query?: string; variables?: Record<string, unknown> };
        // Use isMutation() for consistent mutation detection (handles comments correctly)
        if (body.query && !isMutation(body.query)) {
          try {
            // Get the response payload
            const response = reply.getPayload();
            if (response && typeof response === "string") {
              const parsed = JSON.parse(response);
              // Only cache if there are no errors and data exists
              if (parsed && parsed.data && !parsed.errors) {
                // Cache for 5 minutes (300 seconds)
                await cacheService.cacheGraphQLQuery(
                  body.query,
                  body.variables,
                  parsed.data,
                  300,
                  (request as any).userId
                );
              }
            }
          } catch (error) {
            // Ignore cache errors - don't break the request
            app.log.debug({ error }, "Failed to cache GraphQL response");
          }
        }
      }
    });
  }
}

