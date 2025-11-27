-- Migration: Add RevenueCat fields to subscriptions table
-- Note: waitlist table already exists, skipping creation

-- Add RevenueCat customer ID (maps to Clerk user ID)
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "revenuecat_customer_id" text;

-- Add RevenueCat subscription/transaction ID  
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "revenuecat_subscription_id" text;