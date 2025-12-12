-- Add 'Unverified' verdict to analysis_verdict enum

-- Step 1: Add 'Unverified' value to the enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'Unverified' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'analysis_verdict')
  ) THEN
    ALTER TYPE "public"."analysis_verdict" ADD VALUE 'Unverified';
  END IF;
END $$;

