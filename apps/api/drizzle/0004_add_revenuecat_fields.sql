-- Migration: Add RevenueCat fields to subscriptions table
-- This migration adds support for RevenueCat subscription tracking

-- Add RevenueCat customer ID (maps to Clerk user ID)
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "revenuecat_customer_id" text;

-- Add RevenueCat subscription/transaction ID
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "revenuecat_subscription_id" text;

