import mercurius from "mercurius";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { env } from "../env.js";
import { schema } from "../graphql/schema.js";
import { resolvers } from "../resolvers/index.js";
import { cacheService } from "../services/cache-service.js";
import { createDataLoaders } from "../loaders/index.js";

export async function registerGraphql(app: FastifyInstance) {
  // Security validation rules completely disabled - no depth or complexity limits
  // Per user request to remove all query depth limits

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
      if (query.trim().startsWith("mutation")) {
        return null;
      }
      
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
    } : false,
    // Custom error formatter for better error messages
    errorFormatter: (execution, _context) => {
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
          
          return {
            message: "An error occurred while processing your request",
            extensions: {
              code: "INTERNAL_ERROR"
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
        if (body.query && !body.query.trim().startsWith("mutation")) {
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

