-- Add complexity enum and column to analyses table

-- Step 1: Create the complexity enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_complexity') THEN
    CREATE TYPE "public"."analysis_complexity" AS ENUM('simple', 'medium', 'complex');
  END IF;
END $$;

-- Step 2: Add complexity column to analyses table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'analyses' 
    AND column_name = 'complexity'
  ) THEN
    ALTER TABLE "public"."analyses" 
    ADD COLUMN "complexity" "public"."analysis_complexity";
  END IF;
END $$;
