import { GraphQLError } from "graphql";
import depthLimit from "graphql-depth-limit";
import { createComplexityRule, simpleEstimator } from "graphql-query-complexity";

/**
 * GraphQL Security Validation Rules
 * 
 * These rules protect against:
 * - Deeply nested queries (DoS)
 * - Complex queries (resource exhaustion)
 * - Circular queries
 */

// Maximum query depth (prevents deeply nested queries)
export const MAX_QUERY_DEPTH = 10;

// Maximum query complexity score
export const MAX_QUERY_COMPLEXITY = 1000;

/**
 * Create depth limit validation rule
 */
export function createDepthLimitRule() {
  return depthLimit(MAX_QUERY_DEPTH, { ignore: [] }, (depths: any) => {
    throw new GraphQLError(
      `Query depth of ${depths[depths.length - 1]} exceeds maximum depth of ${MAX_QUERY_DEPTH}`,
      {
        extensions: {
          code: "QUERY_DEPTH_EXCEEDED",
          maxDepth: MAX_QUERY_DEPTH,
          actualDepth: depths[depths.length - 1]
        }
      }
    );
  });
}

/**
 * Create complexity limit validation rule
 * 
 * Complexity scoring:
 * - Scalar fields: 1 point
 * - Object fields: 1 point
 * - List fields: multiplier based on list size (default: 10)
 * - Nested queries: multiplier increases with depth
 */
export function createComplexityValidationRule() {
  return createComplexityRule({
    maximumComplexity: MAX_QUERY_COMPLEXITY,
    // Use simple estimator (scalar = 1, object = 1, list = 10)
    estimators: [
      simpleEstimator({
        defaultComplexity: 1
      })
    ],
    
    // Callback when complexity is calculated
    onComplete: (complexity: number) => {
      // Log expensive queries for monitoring
      if (complexity > MAX_QUERY_COMPLEXITY * 0.8) {
        console.warn(`Expensive query detected: ${complexity} complexity`);
      }
      
      if (complexity > MAX_QUERY_COMPLEXITY) {
        throw new GraphQLError(
          `Query complexity of ${complexity} exceeds maximum complexity of ${MAX_QUERY_COMPLEXITY}`,
          {
            extensions: {
              code: "QUERY_COMPLEXITY_EXCEEDED",
              maxComplexity: MAX_QUERY_COMPLEXITY,
              actualComplexity: complexity
            }
          }
        );
      }
    }
  });
}

/**
 * Get all security validation rules
 */
export function getSecurityValidationRules() {
  return [
    createDepthLimitRule(),
    createComplexityValidationRule()
  ];
}

