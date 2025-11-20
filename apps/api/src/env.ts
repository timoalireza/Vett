import { config } from "dotenv";
import { z } from "zod";

config();

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
  REDIS_URL: z.string().url(),
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

