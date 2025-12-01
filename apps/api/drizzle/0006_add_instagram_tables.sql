-- Create social_platform enum for social account platforms
-- Use DO block to handle case where enum already exists
DO $$ BEGIN
 CREATE TYPE "social_platform" AS ENUM('INSTAGRAM');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create instagram_users table - stores Instagram user IDs and metadata
CREATE TABLE IF NOT EXISTS "instagram_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instagram_user_id" text NOT NULL,
	"username" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instagram_users_instagram_user_id_unique" UNIQUE("instagram_user_id")
);

-- Create social_accounts table - links Instagram accounts to app users
CREATE TABLE IF NOT EXISTS "social_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"platform_user_id" text NOT NULL,
	"verification_code" text,
	"verification_code_expires_at" timestamp with time zone,
	"linked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create instagram_dm_usage table - tracks analysis usage per Instagram user
CREATE TABLE IF NOT EXISTS "instagram_dm_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instagram_user_id" text NOT NULL,
	"analyses_count" integer DEFAULT 0 NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"last_reset_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instagram_dm_usage_instagram_user_id_unique" UNIQUE("instagram_user_id")
);

-- Add foreign key constraint for social_accounts.user_id -> users.id
DO $$ BEGIN
 ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_social_accounts_user_id" ON "social_accounts" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_social_accounts_platform_user_id" ON "social_accounts" ("platform", "platform_user_id");
CREATE INDEX IF NOT EXISTS "idx_social_accounts_verification_code" ON "social_accounts" ("verification_code") WHERE "verification_code" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_instagram_dm_usage_instagram_user_id" ON "instagram_dm_usage" ("instagram_user_id");

