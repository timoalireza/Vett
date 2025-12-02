-- Convert existing 'Partially True' values to 'Partially Accurate' before enum change
-- Handle both text and enum types safely

-- Step 1: Rename enum value once (if enum type exists and has 'Partially True')
-- This must happen before updating table values since both tables use the same enum type
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_verdict') THEN
    -- Check if 'Partially True' exists in the enum
    IF EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'Partially True' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'analysis_verdict')
    ) THEN
      -- Rename enum value from 'Partially True' to 'Partially Accurate'
      -- This only needs to happen once since both tables use the same enum type
      ALTER TYPE "public"."analysis_verdict" RENAME VALUE 'Partially True' TO 'Partially Accurate';
    END IF;
  END IF;
END $$;

-- Step 2: Update analyses table - handle both text and enum types
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'analyses' 
    AND column_name = 'verdict' 
    AND data_type = 'text'
  ) THEN
    -- Column is text, update text values
    UPDATE "public"."analyses" SET "verdict" = 'Partially Accurate' WHERE "verdict" = 'Partially True';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'analyses' 
    AND column_name = 'verdict' 
    AND udt_name = 'analysis_verdict'
  ) THEN
    -- Column is enum, update enum values (enum value was already renamed above)
    -- This check handles any edge cases where values weren't updated by the rename
    IF EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'Partially Accurate' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'analysis_verdict')
    ) THEN
      -- Update any remaining 'Partially True' values (shouldn't happen after rename, but safe to check)
      UPDATE "public"."analyses" 
      SET "verdict" = 'Partially Accurate'::"public"."analysis_verdict" 
      WHERE "verdict"::text = 'Partially True';
    END IF;
  END IF;
END $$;

-- Step 3: Update claims table - handle both text and enum types
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'claims' 
    AND column_name = 'verdict' 
    AND data_type = 'text'
  ) THEN
    -- Column is text, update text values
    UPDATE "public"."claims" SET "verdict" = 'Partially Accurate' WHERE "verdict" = 'Partially True';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'claims' 
    AND column_name = 'verdict' 
    AND udt_name = 'analysis_verdict'
  ) THEN
    -- Column is enum, update enum values (enum value was already renamed above)
    -- This check handles any edge cases where values weren't updated by the rename
    IF EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'Partially Accurate' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'analysis_verdict')
    ) THEN
      -- Update any remaining 'Partially True' values (shouldn't happen after rename, but safe to check)
      UPDATE "public"."claims" 
      SET "verdict" = 'Partially Accurate'::"public"."analysis_verdict" 
      WHERE "verdict"::text = 'Partially True';
    END IF;
  END IF;
END $$;

-- Only convert to text if currently enum type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'analyses' 
    AND column_name = 'verdict' 
    AND udt_name = 'analysis_verdict'
  ) THEN
    ALTER TABLE "public"."analyses" ALTER COLUMN "verdict" SET DATA TYPE text USING "verdict"::text;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'claims' 
    AND column_name = 'verdict' 
    AND udt_name = 'analysis_verdict'
  ) THEN
    ALTER TABLE "public"."claims" ALTER COLUMN "verdict" SET DATA TYPE text USING "verdict"::text;
  END IF;
END $$;

-- Drop and recreate enum only if it exists and doesn't have 'Partially Accurate'
-- First check if we can drop it (no dependent objects), otherwise rename value
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_verdict') THEN
    -- Check if 'Partially Accurate' already exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'Partially Accurate' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'analysis_verdict')
    ) THEN
      -- Check if enum has dependent objects (columns using it)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE udt_name = 'analysis_verdict'
      ) THEN
        -- No dependent objects, safe to drop and recreate
        DROP TYPE "public"."analysis_verdict";
        CREATE TYPE "public"."analysis_verdict" AS ENUM('Verified', 'Mostly Accurate', 'Partially Accurate', 'False', 'Opinion');
      ELSE
        -- Has dependent objects, try to add 'Partially Accurate' value instead
        -- This will fail if 'Partially True' still exists, but that's handled above
        BEGIN
          ALTER TYPE "public"."analysis_verdict" ADD VALUE 'Partially Accurate';
        EXCEPTION
          WHEN duplicate_object THEN
            -- Value already exists, nothing to do
            NULL;
        END;
      END IF;
    END IF;
  ELSE
    -- Enum doesn't exist, create it
    CREATE TYPE "public"."analysis_verdict" AS ENUM('Verified', 'Mostly Accurate', 'Partially Accurate', 'False', 'Opinion');
  END IF;
END $$;

-- Convert back to enum only if currently text type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'analyses' 
    AND column_name = 'verdict' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE "public"."analyses" ALTER COLUMN "verdict" SET DATA TYPE "public"."analysis_verdict" USING "verdict"::"public"."analysis_verdict";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'claims' 
    AND column_name = 'verdict' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE "public"."claims" ALTER COLUMN "verdict" SET DATA TYPE "public"."analysis_verdict" USING "verdict"::"public"."analysis_verdict";
  END IF;
END $$;