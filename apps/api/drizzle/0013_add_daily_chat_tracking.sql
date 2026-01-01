-- Add daily chat tracking columns to user_usage table
ALTER TABLE "user_usage" ADD COLUMN IF NOT EXISTS "daily_chat_count" integer DEFAULT 0 NOT NULL;
-- Set last_chat_reset_at to midnight of current day so reset logic works correctly from day 1
ALTER TABLE "user_usage" ADD COLUMN IF NOT EXISTS "last_chat_reset_at" timestamp with time zone DEFAULT date_trunc('day', now()) NOT NULL;


