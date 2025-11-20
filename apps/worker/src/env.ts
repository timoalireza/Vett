import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));
const workerEnvPath = resolve(currentDir, "../.env");

config({ path: workerEnvPath });
config();

const envSchema = z.object({
  REDIS_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
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
  UNSPLASH_ACCESS_KEY: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid worker environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid worker environment configuration");
}

export const env = parsed.data;

