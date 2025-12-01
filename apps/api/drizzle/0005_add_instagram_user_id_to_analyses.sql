-- Add instagram_user_id column to analyses table for tracking Instagram DM analyses
ALTER TABLE "analyses" ADD COLUMN "instagram_user_id" text;

-- Add index for Instagram user ID lookups (for retroactive linking)
CREATE INDEX IF NOT EXISTS idx_analyses_instagram_user_id ON analyses(instagram_user_id) WHERE instagram_user_id IS NOT NULL;

