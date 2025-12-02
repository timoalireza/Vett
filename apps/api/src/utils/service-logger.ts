/**
 * Logger utility for services that don't have direct access to Fastify's logger
 * Falls back to console if no logger is set
 */

type Logger = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
  debug: (obj: unknown, msg?: string) => void;
};

let loggerInstance: Logger | null = null;

/**
 * Set the logger instance (called during app initialization)
 */
export function setServiceLogger(logger: Logger): void {
  loggerInstance = logger;
}

/**
 * Get the logger instance, falling back to console if not set
 */
function getLogger(): Logger {
  if (loggerInstance) {
    return loggerInstance;
  }

  // Fallback to console with consistent format
  return {
    info: (obj: unknown, msg?: string) => {
      if (msg) {
        console.log(`[Service] ${msg}`, obj);
      } else {
        console.log("[Service]", obj);
      }
    },
    warn: (obj: unknown, msg?: string) => {
      if (msg) {
        console.warn(`[Service] ${msg}`, obj);
      } else {
        console.warn("[Service]", obj);
      }
    },
    error: (obj: unknown, msg?: string) => {
      if (msg) {
        console.error(`[Service] ${msg}`, obj);
      } else {
        console.error("[Service]", obj);
      }
    },
    debug: (obj: unknown, msg?: string) => {
      if (msg) {
        console.debug(`[Service] ${msg}`, obj);
      } else {
        console.debug("[Service]", obj);
      }
    }
  };
}

/**
 * Service logger with consistent interface
 */
export const serviceLogger = {
  info: (obj: unknown, msg?: string) => getLogger().info(obj, msg),
  warn: (obj: unknown, msg?: string) => getLogger().warn(obj, msg),
  error: (obj: unknown, msg?: string) => getLogger().error(obj, msg),
  debug: (obj: unknown, msg?: string) => getLogger().debug(obj, msg)
};

