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
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const possiblePaths = [
      // Current working directory (where command is run from)
      resolve(process.cwd(), ".env"),
      // apps/worker/.env (relative to cwd)
      resolve(process.cwd(), "apps/worker/.env"),
      // Relative to source file location
      resolve(currentDir, "../.env"),
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
    
    if (!loaded) {
      // If no .env found, try default behavior (looks in cwd)
      dotenv.config();
      console.warn("⚠️  No .env file found in common paths, trying default dotenv behavior.");
    }
  } catch (error) {
    // dotenv not available or failed - log but don't fail
    console.warn("⚠️  Could not load .env file:", error);
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REDIS_URL: z
    .string()
    .refine(
      (val) => {
        // Accept redis://, rediss://, or http(s):// for Upstash REST API
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
      { message: "REDIS_URL must be a valid Redis URL (redis://, rediss://, or http(s):// for Upstash REST)" }
    ),
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  BRAVE_SEARCH_API_KEY: z.string().optional(),
  SERPER_API_KEY: z.string().optional(),
  GOOGLE_FACT_CHECK_API_KEY: z.string().optional(),
  // Social Media APIs (optional - enhances extraction quality)
  TWITTER_API_KEY: z.string().optional(),
  TWITTER_API_SECRET: z.string().optional(),
  TWITTER_BEARER_TOKEN: z.string().optional(),
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  INSTAGRAM_ACCESS_TOKEN: z.string().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  THREADS_ACCESS_TOKEN: z.string().optional(),
  RAPIDAPI_KEY: z.string().optional(),
  RAPIDAPI_INSTAGRAM_HOST: z.string().optional(),
  RAPIDAPI_TWITTER_HOST: z.string().optional(),
  RAPIDAPI_THREADS_HOST: z.string().optional(),
  // Unsplash API for image search
  UNSPLASH_ACCESS_KEY: z.string().optional(),
  // Apify API Token for social media scraping
  // Note: Also accepts APIFY_API_KEY as an alternative name (checked at runtime)
  APIFY_API_TOKEN: z.string().optional(),
  // SocialKit API for TikTok and YouTube Shorts transcription extraction
  SOCIALKIT_API_KEY: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid worker environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid worker environment configuration");
}

export const env = parsed.data;

