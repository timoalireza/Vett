-- Add phone number support for phone-only authentication
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number" text;





