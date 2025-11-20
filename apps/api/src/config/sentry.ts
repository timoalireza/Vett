import * as Sentry from "@sentry/node";
import { env } from "../env.js";

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Only initializes if SENTRY_DSN is provided
 */
export function initSentry() {
  if (!env.SENTRY_DSN) {
    // Sentry is optional - don't fail if not configured
    console.log("ℹ️  Sentry: Not configured (optional - add SENTRY_DSN to enable error tracking)");
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    
    // Performance monitoring sample rate (0.0 to 1.0)
    // 1.0 = 100% of transactions, 0.1 = 10% of transactions
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE ?? (env.NODE_ENV === "production" ? 0.1 : 1.0),
    
    // Profiling sample rate (0.0 to 1.0)
    // Only profile a percentage of transactions to reduce overhead
    // Note: Profiling requires @sentry/profiling-node package
    profilesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
    
    // Set release version (useful for tracking which version has issues)
    release: process.env.npm_package_version || undefined,
    
    // Filter out health check endpoints from tracking
    ignoreErrors: [
      // Health checks
      /^GET \/health/,
      /^GET \/ready/,
      /^GET \/live/,
      // Rate limit errors (expected behavior)
      "Too Many Requests",
      // Client errors (4xx) - don't track as errors
      /^4\d{2}$/
    ],
    
    // Don't send errors in development
    enabled: env.NODE_ENV === "production" || !!env.SENTRY_DSN,
    
    // Configure what data to send
    beforeSend(event, hint) {
      // Don't send events without DSN
      if (!env.SENTRY_DSN) {
        return null;
      }
      
      // In development, log to console instead
      if (env.NODE_ENV === "development") {
        console.error("Sentry Event:", event);
        console.error("Sentry Hint:", hint);
        return null; // Don't send in development
      }
      
      return event;
    }
  });
  
  console.log(`✅ Sentry initialized (environment: ${env.SENTRY_ENVIRONMENT || env.NODE_ENV})`);
}

/**
 * Set user context for Sentry (call after authentication)
 */
export function setSentryUser(userId: string, email?: string, username?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username
  });
}

/**
 * Clear user context (call on logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

