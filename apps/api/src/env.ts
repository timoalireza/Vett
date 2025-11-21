import { z } from "zod";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

// Create require function for ESM compatibility
const require = createRequire(import.meta.url);

// Only load dotenv in development (Railway provides env vars in production)
if (process.env.NODE_ENV !== "production") {
  try {
    // Use createRequire to load dotenv (CommonJS module)
    const dotenv = require("dotenv");
    
    // Try multiple possible locations for .env file
    const possiblePaths = [
      // Current working directory (where command is run from)
      resolve(process.cwd(), ".env"),
      // apps/api/.env (relative to cwd)
      resolve(process.cwd(), "apps/api/.env"),
      // Relative to source file location
      resolve(dirname(fileURLToPath(import.meta.url)), "../.env"),
      // Fallback: just try .env in cwd
      ".env"
    ];
    
    // Find the first .env file that exists
    let loaded = false;
    for (const envPath of possiblePaths) {
      if (existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`✅ Loaded .env from: ${envPath}`);
        loaded = true;
        break;
      }
    }
    
    // If no .env found, try default behavior (looks in cwd)
    if (!loaded) {
      dotenv.config();
    }
  } catch (error) {
    // dotenv not available or failed - log but don't fail
    console.warn("⚠️  Could not load .env file:", error);
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().positive().default(4000)),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .default("info"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z
    .string()
    .refine(
      (val) => {
        // Accept redis://, rediss://, or http:// URLs
        try {
          const url = new URL(val);
          return (
            url.protocol === "redis:" ||
            url.protocol === "rediss:" ||
            url.protocol === "http:" ||
            url.protocol === "https:"
          );
        } catch {
          return false;
        }
      },
      { message: "REDIS_URL must be a valid Redis URL (redis://, rediss://, or http://)" }
    ),
  CLERK_SECRET_KEY: z.string().min(1),
  PINECONE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  UPLOADS_DIR: z.string().optional(),
  PUBLIC_UPLOAD_BASE_URL: z.string().url().optional(),
  ALLOWED_ORIGINS: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").map((s) => s.trim()) : undefined)),
  // Database connection pool settings (optional, defaults in client.ts)
  DB_POOL_MAX: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().positive().optional()),
  DB_POOL_MIN: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().nonnegative().optional()),
  // Sentry error tracking (optional, but recommended for production)
  SENTRY_DSN: z
    .string()
    .optional()
    .refine((val) => !val || z.string().url().safeParse(val).success, {
      message: "SENTRY_DSN must be a valid URL if provided"
    }),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().min(0).max(1).optional())
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

