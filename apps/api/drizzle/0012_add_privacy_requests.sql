-- Add privacy request tracking (data export + data deletion requests)

-- Enums (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'privacy_request_type') THEN
    CREATE TYPE "public"."privacy_request_type" AS ENUM ('DATA_EXPORT', 'DATA_DELETION');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'privacy_request_status') THEN
    CREATE TYPE "public"."privacy_request_status" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

-- Table (idempotent-ish: only create if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'privacy_requests'
  ) THEN
    CREATE TABLE "public"."privacy_requests" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
      "type" "public"."privacy_request_type" NOT NULL,
      "status" "public"."privacy_request_status" NOT NULL DEFAULT 'PENDING',
      "note" text,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;





