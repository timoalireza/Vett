-- Enable Row Level Security (RLS) on all tables
-- 
-- IMPORTANT: Since you're using Clerk auth via a backend API (not Supabase Auth),
-- your API connects using the service_role which bypasses RLS by default.
-- 
-- Enabling RLS here protects against:
-- 1. Direct database access (e.g., via Supabase Dashboard SQL editor)
-- 2. Accidental exposure if API keys are leaked
-- 3. Future direct client access if you add Supabase client features
--
-- The service_role connection used by your API will bypass RLS automatically,
-- so your API will continue to work normally.

-- Enable Row Level Security (RLS) on all tables
-- 
-- IMPORTANT NOTES:
-- 1. Your API uses service_role connection which BYPASSES RLS automatically
-- 2. Enabling RLS protects against direct database access (e.g., SQL editor, leaked keys)
-- 3. Your API will continue to work normally because service_role bypasses RLS
-- 4. If Supabase Security Advisor requires policies, you can add them via Supabase Dashboard

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- Note: We're not creating policies here because:
-- 1. Service_role bypasses RLS automatically (your API uses this)
-- 2. Creating permissive policies (USING true) would allow ALL access, defeating RLS purpose
-- 3. If you need policies for direct client access, create them via Supabase Dashboard
--    where you can properly configure them for your auth setup
--
-- To add policies later (if needed for direct client access):
-- Go to Supabase Dashboard > Authentication > Policies
-- Or use SQL Editor with proper auth context

