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

// Helper to normalize environment variables (handle empty strings from Railway)
function getEnv(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim() !== "" ? value : undefined;
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
  DATABASE_URL: z.string().url().refine((val) => val && val.trim() !== "", {
    message: "DATABASE_URL cannot be empty"
  }),
  REDIS_URL: z
    .string()
    .refine((val) => val && val.trim() !== "", {
      message: "REDIS_URL cannot be empty"
    })
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
  CLERK_SECRET_KEY: z.string().min(1).refine((val) => val && val.trim() !== "", {
    message: "CLERK_SECRET_KEY cannot be empty"
  }),
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

// Debug: Log available environment variables (without sensitive values)
if (process.env.NODE_ENV === "production") {
  const envKeys = Object.keys(process.env).filter(key => 
    key.includes("DATABASE") || 
    key.includes("REDIS") || 
    key.includes("CLERK") ||
    key === "NODE_ENV" ||
    key === "PORT"
  );
  console.log("🔍 Environment check (production):");
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  PORT: ${process.env.PORT}`);
  
  // Check if variables exist and are not empty
  const dbUrl = getEnv("DATABASE_URL");
  const redisUrl = getEnv("REDIS_URL");
  const clerkKey = getEnv("CLERK_SECRET_KEY");
  
  console.log(`  DATABASE_URL: ${dbUrl ? "✅ Set" : process.env.DATABASE_URL ? "⚠️ Empty string" : "❌ Missing"}`);
  console.log(`  REDIS_URL: ${redisUrl ? "✅ Set" : process.env.REDIS_URL ? "⚠️ Empty string" : "❌ Missing"}`);
  console.log(`  CLERK_SECRET_KEY: ${clerkKey ? "✅ Set" : process.env.CLERK_SECRET_KEY ? "⚠️ Empty string" : "❌ Missing"}`);
  console.log(`  All env keys containing DATABASE/REDIS/CLERK: ${envKeys.join(", ")}`);
  
  // Show actual values (truncated for security)
  if (process.env.DATABASE_URL) {
    const dbPreview = process.env.DATABASE_URL.substring(0, 50) + "...";
    console.log(`  DATABASE_URL value preview: ${dbPreview}`);
  }
  if (process.env.REDIS_URL) {
    const redisPreview = process.env.REDIS_URL.substring(0, 50) + "...";
    console.log(`  REDIS_URL value preview: ${redisPreview}`);
  }
  if (process.env.CLERK_SECRET_KEY) {
    const clerkPreview = process.env.CLERK_SECRET_KEY.substring(0, 20) + "...";
    console.log(`  CLERK_SECRET_KEY value preview: ${clerkPreview}`);
  }
}

// Create a normalized env object (handle empty strings)
const normalizedEnv = {
  ...process.env,
  DATABASE_URL: getEnv("DATABASE_URL"),
  REDIS_URL: getEnv("REDIS_URL"),
  CLERK_SECRET_KEY: getEnv("CLERK_SECRET_KEY")
};

const parsed = envSchema.safeParse(normalizedEnv);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  
  // Additional debugging: show what we actually got
  if (process.env.NODE_ENV === "production") {
    console.error("🔍 Debug info:");
    const dbUrl = getEnv("DATABASE_URL");
    const redisUrl = getEnv("REDIS_URL");
    const clerkKey = getEnv("CLERK_SECRET_KEY");
    
    console.error(`  process.env.DATABASE_URL: ${process.env.DATABASE_URL ? (dbUrl ? "exists (valid)" : "exists but empty") : "undefined"}`);
    console.error(`  process.env.REDIS_URL: ${process.env.REDIS_URL ? (redisUrl ? "exists (valid)" : "exists but empty") : "undefined"}`);
    console.error(`  process.env.CLERK_SECRET_KEY: ${process.env.CLERK_SECRET_KEY ? (clerkKey ? "exists (valid)" : "exists but empty") : "undefined"}`);
    console.error(`  All process.env keys (first 30): ${Object.keys(process.env).slice(0, 30).join(", ")}...`);
    console.error(`  Total env keys: ${Object.keys(process.env).length}`);
  }
  
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

