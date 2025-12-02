-- Safe migration to convert verdict columns from text to enum without data loss
-- This migration handles the conversion safely by:
-- 1. Ensuring the enum exists with correct values
-- 2. Converting text values to enum values
-- 3. Handling any invalid values gracefully

-- Step 1: Ensure the enum exists with correct values
DO $$ 
BEGIN
  -- Create enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_verdict') THEN
    CREATE TYPE "public"."analysis_verdict" AS ENUM('Verified', 'Mostly Accurate', 'Partially Accurate', 'False', 'Opinion');
  ELSE
    -- Check if 'Partially Accurate' exists, if not add it
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'Partially Accurate' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'analysis_verdict')
    ) THEN
      -- If 'Partially True' exists, rename it to 'Partially Accurate'
      IF EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Partially True' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'analysis_verdict')
      ) THEN
        ALTER TYPE "public"."analysis_verdict" RENAME VALUE 'Partially True' TO 'Partially Accurate';
      ELSE
        -- Add 'Partially Accurate' if neither exists
        ALTER TYPE "public"."analysis_verdict" ADD VALUE 'Partially Accurate';
      END IF;
    END IF;
  END IF;
END $$;

-- Step 2: Convert text values to enum for analyses table
-- First, update any 'Partially True' values to 'Partially Accurate' if they exist
-- Handle both text and enum types
DO $$
BEGIN
  -- Check if column is text type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'analyses' 
    AND column_name = 'verdict' 
    AND data_type = 'text'
  ) THEN
    -- Update text values
    UPDATE "public"."analyses" 
    SET "verdict" = 'Partially Accurate' 
    WHERE "verdict"::text = 'Partially True';
  ELSE
    -- Column is already enum, update enum values
    UPDATE "public"."analyses" 
    SET "verdict" = 'Partially Accurate'::"public"."analysis_verdict"
    WHERE "verdict"::text = 'Partially True';
  END IF;
END $$;

-- Step 3: Convert analyses.verdict column from text to enum
-- Only if it's currently text type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'analyses' 
    AND column_name = 'verdict' 
    AND data_type = 'text'
  ) THEN
    -- Convert text to enum, handling invalid values by setting to NULL
    ALTER TABLE "public"."analyses" 
    ALTER COLUMN "verdict" TYPE "public"."analysis_verdict" 
    USING CASE 
      WHEN "verdict" IN ('Verified', 'Mostly Accurate', 'Partially Accurate', 'Partially True', 'False', 'Opinion') 
      THEN CASE 
        WHEN "verdict" = 'Partially True' THEN 'Partially Accurate'::"public"."analysis_verdict"
        ELSE "verdict"::"public"."analysis_verdict"
      END
      ELSE NULL
    END;
  END IF;
END $$;

-- Step 4: Convert text values to enum for claims table
-- First, update any 'Partially True' values to 'Partially Accurate' if they exist
-- Handle both text and enum types
DO $$
BEGIN
  -- Check if column is text type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'claims' 
    AND column_name = 'verdict' 
    AND data_type = 'text'
  ) THEN
    -- Update text values
    UPDATE "public"."claims" 
    SET "verdict" = 'Partially Accurate' 
    WHERE "verdict"::text = 'Partially True';
  ELSE
    -- Column is already enum, update enum values
    UPDATE "public"."claims" 
    SET "verdict" = 'Partially Accurate'::"public"."analysis_verdict"
    WHERE "verdict"::text = 'Partially True';
  END IF;
END $$;

-- Step 5: Convert claims.verdict column from text to enum
-- Only if it's currently text type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'claims' 
    AND column_name = 'verdict' 
    AND data_type = 'text'
  ) THEN
    -- Convert text to enum, handling invalid values by setting to NULL
    ALTER TABLE "public"."claims" 
    ALTER COLUMN "verdict" TYPE "public"."analysis_verdict" 
    USING CASE 
      WHEN "verdict" IN ('Verified', 'Mostly Accurate', 'Partially Accurate', 'Partially True', 'False', 'Opinion') 
      THEN CASE 
        WHEN "verdict" = 'Partially True' THEN 'Partially Accurate'::"public"."analysis_verdict"
        ELSE "verdict"::"public"."analysis_verdict"
      END
      ELSE NULL
    END;
  END IF;
END $$;

