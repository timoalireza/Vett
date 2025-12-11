-- Add title column to analyses table

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'analyses'
    AND column_name = 'title'
  ) THEN
    ALTER TABLE "public"."analyses"
    ADD COLUMN "title" text;
  END IF;
END $$;
