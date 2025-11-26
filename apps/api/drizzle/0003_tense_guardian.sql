-- Convert existing 'Partially True' values to 'Partially Accurate' before enum change
UPDATE "public"."analyses" SET "verdict" = 'Partially Accurate' WHERE "verdict" = 'Partially True';--> statement-breakpoint
UPDATE "public"."claims" SET "verdict" = 'Partially Accurate' WHERE "verdict" = 'Partially True';--> statement-breakpoint
ALTER TABLE "public"."analyses" ALTER COLUMN "verdict" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "public"."claims" ALTER COLUMN "verdict" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."analysis_verdict";--> statement-breakpoint
CREATE TYPE "public"."analysis_verdict" AS ENUM('Verified', 'Mostly Accurate', 'Partially Accurate', 'False', 'Opinion');--> statement-breakpoint
ALTER TABLE "public"."analyses" ALTER COLUMN "verdict" SET DATA TYPE "public"."analysis_verdict" USING "verdict"::"public"."analysis_verdict";--> statement-breakpoint
ALTER TABLE "public"."claims" ALTER COLUMN "verdict" SET DATA TYPE "public"."analysis_verdict" USING "verdict"::"public"."analysis_verdict";