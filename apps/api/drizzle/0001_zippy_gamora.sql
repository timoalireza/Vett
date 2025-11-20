CREATE TYPE "public"."analysis_attachment_kind" AS ENUM('link', 'image', 'document');--> statement-breakpoint
CREATE TABLE "analysis_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"kind" "analysis_attachment_kind" NOT NULL,
	"url" text NOT NULL,
	"media_type" text,
	"title" text,
	"summary" text,
	"alt_text" text,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_attachments" ADD CONSTRAINT "analysis_attachments_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;