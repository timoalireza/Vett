import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

interface Metrics {
  requests: {
    total: number;
    errors: number;
    byMethod: Record<string, number>;
    byStatus: Record<number, number>;
  };
  responseTime: {
    sum: number;
    count: number;
    min: number;
    max: number;
  };
  graphql: {
    queries: number;
    mutations: number;
    errors: number;
  };
  database: {
    queries: number;
    errors: number;
  };
}

// In-memory metrics store
// In production, consider using Redis or a metrics service
const metrics: Metrics = {
  requests: {
    total: 0,
    errors: 0,
    byMethod: {},
    byStatus: {}
  },
  responseTime: {
    sum: 0,
    count: 0,
    min: Infinity,
    max: 0
  },
  graphql: {
    queries: 0,
    mutations: 0,
    errors: 0
  },
  database: {
    queries: 0,
    errors: 0
  }
};

export default fp(async (fastify: FastifyInstance) => {
  // Track request metrics
  fastify.addHook("onRequest", async (request) => {
    const startTime = Date.now();
    (request as any).startTime = startTime;
    
    metrics.requests.total++;
    const method = request.method;
    metrics.requests.byMethod[method] = (metrics.requests.byMethod[method] || 0) + 1;
  });

  // Track response metrics
  fastify.addHook("onResponse", async (request, reply) => {
    const startTime = (request as any).startTime;
    if (startTime) {
      const duration = Date.now() - startTime;
      
      // Update response time metrics
      metrics.responseTime.sum += duration;
      metrics.responseTime.count++;
      metrics.responseTime.min = Math.min(metrics.responseTime.min, duration);
      metrics.responseTime.max = Math.max(metrics.responseTime.max, duration);
      
      // Track status codes
      const statusCode = reply.statusCode;
      metrics.requests.byStatus[statusCode] = (metrics.requests.byStatus[statusCode] || 0) + 1;
      
      // Track errors (4xx and 5xx)
      if (statusCode >= 400) {
        metrics.requests.errors++;
      }
    }
  });

  // Metrics endpoint
  fastify.get("/metrics", async () => {
    const avgResponseTime = metrics.responseTime.count > 0
      ? metrics.responseTime.sum / metrics.responseTime.count
      : 0;

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      requests: {
        total: metrics.requests.total,
        errors: metrics.requests.errors,
        errorRate: metrics.requests.total > 0
          ? (metrics.requests.errors / metrics.requests.total * 100).toFixed(2) + "%"
          : "0%",
        byMethod: metrics.requests.byMethod,
        byStatus: metrics.requests.byStatus
      },
      responseTime: {
        average: Math.round(avgResponseTime),
        min: metrics.responseTime.min === Infinity ? 0 : metrics.responseTime.min,
        max: metrics.responseTime.max,
        p95: calculatePercentile(95), // Approximate
        p99: calculatePercentile(99) // Approximate
      },
      graphql: metrics.graphql,
      database: metrics.database,
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) // MB
      }
    };
  });

  // Health metrics endpoint (lightweight)
  fastify.get("/metrics/health", async () => {
    const errorRate = metrics.requests.total > 0
      ? metrics.requests.errors / metrics.requests.total
      : 0;
    
    const avgResponseTime = metrics.responseTime.count > 0
      ? metrics.responseTime.sum / metrics.responseTime.count
      : 0;

    return {
      healthy: errorRate < 0.05 && avgResponseTime < 2000, // < 5% errors, < 2s avg
      errorRate: (errorRate * 100).toFixed(2) + "%",
      avgResponseTime: Math.round(avgResponseTime) + "ms",
      requests: metrics.requests.total
    };
  });

  // Reset metrics (useful for testing or periodic resets)
  fastify.post("/metrics/reset", async (request, reply) => {
    // Only allow in development or with authentication
    if (process.env.NODE_ENV === "production" && !(request as any).userId) {
      return reply.code(403).send({ error: "Unauthorized" });
    }

    // Reset all metrics
    metrics.requests.total = 0;
    metrics.requests.errors = 0;
    metrics.requests.byMethod = {};
    metrics.requests.byStatus = {};
    metrics.responseTime.sum = 0;
    metrics.responseTime.count = 0;
    metrics.responseTime.min = Infinity;
    metrics.responseTime.max = 0;
    metrics.graphql.queries = 0;
    metrics.graphql.mutations = 0;
    metrics.graphql.errors = 0;
    metrics.database.queries = 0;
    metrics.database.errors = 0;

    return { message: "Metrics reset" };
  });
});

// Helper to calculate approximate percentiles
// Note: This is a simple approximation. For accurate percentiles, use a proper metrics library
function calculatePercentile(percentile: number): number {
  // Simple approximation based on min/max/average
  const avg = metrics.responseTime.count > 0
    ? metrics.responseTime.sum / metrics.responseTime.count
    : 0;
  
  const range = metrics.responseTime.max - metrics.responseTime.min;
  return Math.round(metrics.responseTime.min + (range * (percentile / 100)));
}

// Export metrics for use in other parts of the app
export function trackGraphQLQuery() {
  metrics.graphql.queries++;
}

export function trackGraphQLMutation() {
  metrics.graphql.mutations++;
}

export function trackGraphQLError() {
  metrics.graphql.errors++;
}

export function trackDatabaseQuery() {
  metrics.database.queries++;
}

export function trackDatabaseError() {
  metrics.database.errors++;
}

