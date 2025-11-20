import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";

import { env } from "../env.js";
import { schema } from "../graphql/schema.js";
import { resolvers } from "../resolvers/index.js";
import { getSecurityValidationRules } from "./graphql-security.js";
import { cacheService } from "../services/cache-service.js";

export async function registerGraphql(app: FastifyInstance) {
  // Get security validation rules (always enabled, but stricter in production)
  const securityRules = getSecurityValidationRules();

  await app.register(mercurius, {
    schema,
    resolvers,
    graphiql: env.NODE_ENV !== "production", // Disable GraphiQL in production
    path: "/graphql",
    subscription: true,
    // Pass request context to resolvers
    context: (request) => ({
      userId: request.userId,
      user: request.user
    }),
    // Add query depth/complexity limits for security
    validationRules: securityRules,
    // Cache configuration
    cache: cacheService.isEnabled(),
    // Custom cache function for GraphQL queries
    cacheControl: true,
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
        
        // Don't expose internal errors in production
        if (env.NODE_ENV === "production") {
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
}

