-- Add performance indexes for common queries

-- Index for user lookups by external ID (Clerk ID)
CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id);

-- Index for analyses by user (for user's analysis history)
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);

-- Index for analyses by status (for worker queries)
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);

-- Index for analyses by created_at (for sorting and history queries)
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- Composite index for user's analyses sorted by date
CREATE INDEX IF NOT EXISTS idx_analyses_user_created ON analyses(user_id, created_at DESC);

-- Index for collections by user (for user's collections)
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);

-- Index for claims by analysis (for analysis detail queries)
CREATE INDEX IF NOT EXISTS idx_claims_analysis_id ON claims(analysis_id);

-- Index for analysis sources by analysis (for analysis detail queries)
CREATE INDEX IF NOT EXISTS idx_analysis_sources_analysis_id ON analysis_sources(analysis_id);

-- Index for explanation steps by analysis (for analysis detail queries)
CREATE INDEX IF NOT EXISTS idx_explanation_steps_analysis_id ON explanation_steps(analysis_id);

-- Index for feedback by analysis (for feedback queries)
CREATE INDEX IF NOT EXISTS idx_feedback_analysis_id ON feedback(analysis_id);

-- Index for collection items by collection (for collection detail queries)
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);

-- Index for subscriptions by user (already unique, but useful for lookups)
-- Note: user_id is already unique, but index helps with JOINs
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Index for user usage by user (already unique, but useful for lookups)
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);

