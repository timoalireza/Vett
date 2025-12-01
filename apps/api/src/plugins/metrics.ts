import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { queues } from "../queues/index.js";

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
    samples: number[]; // Store samples for accurate percentile calculation
  };
  graphql: {
    queries: number;
    mutations: number;
    errors: number;
    byOperation: Record<string, number>;
  };
  database: {
    queries: number;
    errors: number;
  };
  analysis: {
    submitted: number;
    completed: number;
    failed: number;
    inProgress: number;
    averageTime: number;
    totalTime: number;
    timeCount: number;
    byStatus: Record<string, number>;
    byTopic: Record<string, number>;
  };
  rateLimits: {
    hits: number;
    byTier: Record<string, number>;
  };
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  costs: {
    openaiTokens: number;
    openaiRequests: number;
    estimatedCost: number; // Estimated cost in USD
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
    max: 0,
    samples: [] // Keep last 1000 samples for percentile calculation
  },
  graphql: {
    queries: 0,
    mutations: 0,
    errors: 0,
    byOperation: {}
  },
  database: {
    queries: 0,
    errors: 0
  },
  analysis: {
    submitted: 0,
    completed: 0,
    failed: 0,
    inProgress: 0,
    averageTime: 0,
    totalTime: 0,
    timeCount: 0,
    byStatus: {},
    byTopic: {}
  },
  rateLimits: {
    hits: 0,
    byTier: {}
  },
  queue: {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0
  },
  costs: {
    openaiTokens: 0,
    openaiRequests: 0,
    estimatedCost: 0
  }
};

// Keep only last 1000 samples for memory efficiency
const MAX_SAMPLES = 1000;

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
      
      // Store sample for percentile calculation
      metrics.responseTime.samples.push(duration);
      if (metrics.responseTime.samples.length > MAX_SAMPLES) {
        metrics.responseTime.samples.shift(); // Remove oldest sample
      }
      
      // Track status codes
      const statusCode = reply.statusCode;
      metrics.requests.byStatus[statusCode] = (metrics.requests.byStatus[statusCode] || 0) + 1;
      
      // Track errors (4xx and 5xx)
      if (statusCode >= 400) {
        metrics.requests.errors++;
      }
      
      // Track rate limit hits
      if (statusCode === 429) {
        metrics.rateLimits.hits++;
        const userId = (request as any).userId;
        const tier = userId ? "authenticated" : "anonymous";
        metrics.rateLimits.byTier[tier] = (metrics.rateLimits.byTier[tier] || 0) + 1;
      }
    }
  });

  // Update queue metrics periodically
  async function updateQueueMetrics() {
    try {
      const analysisQueue = queues.analysis;
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        analysisQueue.getWaitingCount(),
        analysisQueue.getActiveCount(),
        analysisQueue.getCompletedCount(),
        analysisQueue.getFailedCount(),
        analysisQueue.getDelayedCount()
      ]);

      metrics.queue.waiting = waiting;
      metrics.queue.active = active;
      metrics.queue.completed = completed;
      metrics.queue.failed = failed;
      metrics.queue.delayed = delayed;
    } catch (error) {
      // Silently fail - queue metrics are optional
      fastify.log.debug({ error }, "Failed to update queue metrics");
    }
  }

  // Update queue metrics every 30 seconds
  const queueMetricsInterval = setInterval(updateQueueMetrics, 30000);
  updateQueueMetrics(); // Initial update

  // Cleanup interval on server close
  fastify.addHook("onClose", async () => {
    clearInterval(queueMetricsInterval);
  });

  // Metrics endpoint
  fastify.get("/metrics", async () => {
    const avgResponseTime = metrics.responseTime.count > 0
      ? metrics.responseTime.sum / metrics.responseTime.count
      : 0;

    const analysisSuccessRate = metrics.analysis.submitted > 0
      ? ((metrics.analysis.completed / metrics.analysis.submitted) * 100).toFixed(2) + "%"
      : "0%";

    const avgAnalysisTime = metrics.analysis.timeCount > 0
      ? metrics.analysis.totalTime / metrics.analysis.timeCount
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
        p50: calculatePercentile(50),
        p95: calculatePercentile(95),
        p99: calculatePercentile(99)
      },
      graphql: {
        ...metrics.graphql,
        errorRate: metrics.graphql.queries + metrics.graphql.mutations > 0
          ? ((metrics.graphql.errors / (metrics.graphql.queries + metrics.graphql.mutations)) * 100).toFixed(2) + "%"
          : "0%"
      },
      database: {
        ...metrics.database,
        errorRate: metrics.database.queries > 0
          ? ((metrics.database.errors / metrics.database.queries) * 100).toFixed(2) + "%"
          : "0%"
      },
      analysis: {
        ...metrics.analysis,
        successRate: analysisSuccessRate,
        averageTimeMs: Math.round(avgAnalysisTime),
        averageTimeSec: (avgAnalysisTime / 1000).toFixed(2)
      },
      rateLimits: metrics.rateLimits,
      queue: metrics.queue,
      costs: {
        ...metrics.costs,
        estimatedCostUSD: metrics.costs.estimatedCost.toFixed(4),
        averageCostPerAnalysis: metrics.analysis.completed > 0
          ? (metrics.costs.estimatedCost / metrics.analysis.completed).toFixed(4)
          : "0"
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024), // MB
        external: Math.round(process.memoryUsage().external / 1024 / 1024) // MB
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
    metrics.responseTime.samples = [];
    metrics.graphql.queries = 0;
    metrics.graphql.mutations = 0;
    metrics.graphql.errors = 0;
    metrics.graphql.byOperation = {};
    metrics.database.queries = 0;
    metrics.database.errors = 0;
    metrics.analysis.submitted = 0;
    metrics.analysis.completed = 0;
    metrics.analysis.failed = 0;
    metrics.analysis.inProgress = 0;
    metrics.analysis.averageTime = 0;
    metrics.analysis.totalTime = 0;
    metrics.analysis.timeCount = 0;
    metrics.analysis.byStatus = {};
    metrics.analysis.byTopic = {};
    metrics.rateLimits.hits = 0;
    metrics.rateLimits.byTier = {};
    metrics.costs.openaiTokens = 0;
    metrics.costs.openaiRequests = 0;
    metrics.costs.estimatedCost = 0;

    return { message: "Metrics reset" };
  });
});

// Helper to calculate accurate percentiles from samples
function calculatePercentile(percentile: number): number {
  if (metrics.responseTime.samples.length === 0) {
    return 0;
  }

  const sorted = [...metrics.responseTime.samples].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] || 0;
}

// Export metrics for use in other parts of the app
export function trackGraphQLQuery(operationName?: string) {
  metrics.graphql.queries++;
  if (operationName) {
    metrics.graphql.byOperation[operationName] = (metrics.graphql.byOperation[operationName] || 0) + 1;
  }
}

export function trackGraphQLMutation(operationName?: string) {
  metrics.graphql.mutations++;
  if (operationName) {
    metrics.graphql.byOperation[operationName] = (metrics.graphql.byOperation[operationName] || 0) + 1;
  }
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

export function trackAnalysisSubmitted() {
  metrics.analysis.submitted++;
  metrics.analysis.inProgress++;
  metrics.analysis.byStatus["QUEUED"] = (metrics.analysis.byStatus["QUEUED"] || 0) + 1;
}

export function trackAnalysisCompleted(durationMs: number, topic?: string) {
  metrics.analysis.completed++;
  metrics.analysis.inProgress = Math.max(0, metrics.analysis.inProgress - 1);
  metrics.analysis.byStatus["COMPLETED"] = (metrics.analysis.byStatus["COMPLETED"] || 0) + 1;
  
  if (durationMs > 0) {
    metrics.analysis.totalTime += durationMs;
    metrics.analysis.timeCount++;
    metrics.analysis.averageTime = metrics.analysis.totalTime / metrics.analysis.timeCount;
  }
  
  if (topic) {
    metrics.analysis.byTopic[topic] = (metrics.analysis.byTopic[topic] || 0) + 1;
  }
}

export function trackAnalysisFailed(topic?: string) {
  metrics.analysis.failed++;
  metrics.analysis.inProgress = Math.max(0, metrics.analysis.inProgress - 1);
  metrics.analysis.byStatus["FAILED"] = (metrics.analysis.byStatus["FAILED"] || 0) + 1;
  
  if (topic) {
    metrics.analysis.byTopic[topic] = (metrics.analysis.byTopic[topic] || 0) + 1;
  }
}

export function trackOpenAIUsage(tokens: number, estimatedCost: number) {
  metrics.costs.openaiTokens += tokens;
  metrics.costs.openaiRequests++;
  metrics.costs.estimatedCost += estimatedCost;
}

// Get current metrics (for programmatic access)
export function getMetrics(): Metrics {
  return JSON.parse(JSON.stringify(metrics)); // Deep clone
}

