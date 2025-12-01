-- Add unique constraint on (user_id, platform) to prevent duplicate social accounts
-- This ensures each user can only have one linked account per platform
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "social_accounts_user_id_platform_unique" 
    ON "social_accounts" ("user_id", "platform");
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- Add partial unique constraint on platform_user_id to prevent multiple app users from linking the same Instagram account
-- Only applies when platform_user_id is not empty and account is linked (linked_at is not null)
-- This prevents data integrity issues where analyses from one Instagram user could be attributed to the wrong app user
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "social_accounts_platform_user_id_unique" 
    ON "social_accounts" ("platform_user_id") 
    WHERE "platform_user_id" != '' AND "linked_at" IS NOT NULL;
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

