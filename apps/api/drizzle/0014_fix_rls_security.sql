-- Fix Row Level Security (RLS) issues identified by Supabase Security Advisor
-- 
-- IMPORTANT NOTES:
-- 1. Your API uses service_role connection which BYPASSES RLS automatically
-- 2. Enabling RLS protects against direct database access (e.g., SQL editor, leaked keys)
-- 3. Your API will continue to work normally because service_role bypasses RLS
-- 4. We're not creating policies because service_role bypasses them anyway

-- Enable RLS on tables that don't have it
ALTER TABLE IF EXISTS public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.instagram_dm_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.instagram_users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on all other core tables (best practice)
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analysis_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.explanation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analysis_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.privacy_requests ENABLE ROW LEVEL SECURITY;

-- Move vector extension from public schema to extensions schema (if it exists)
-- This is a best practice to keep extensions separate from application data
DO $$ 
BEGIN
  -- Create extensions schema if it doesn't exist
  CREATE SCHEMA IF NOT EXISTS extensions;
  
  -- Only attempt to move vector if it exists in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'vector' 
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Move vector extension to extensions schema
    ALTER EXTENSION vector SET SCHEMA extensions;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error (e.g., vector doesn't exist), just continue
    RAISE NOTICE 'Could not move vector extension: %', SQLERRM;
END $$;



