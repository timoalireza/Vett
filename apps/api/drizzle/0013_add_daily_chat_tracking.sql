-- Add daily chat tracking columns to user_usage table
ALTER TABLE "user_usage" ADD COLUMN IF NOT EXISTS "daily_chat_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "user_usage" ADD COLUMN IF NOT EXISTS "last_chat_reset_at" timestamp with time zone DEFAULT now() NOT NULL;

