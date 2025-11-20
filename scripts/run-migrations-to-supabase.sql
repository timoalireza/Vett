-- Run these migrations in Supabase SQL Editor in order
-- Copy and paste each section one at a time, or run all at once

-- ============================================
-- Migration 0000: Initial Schema
-- ============================================
CREATE TYPE "public"."analysis_status" AS ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "public"."analysis_verdict" AS ENUM('Verified', 'Mostly Accurate', 'Partially True', 'False', 'Opinion');
CREATE TYPE "public"."bias_spectrum" AS ENUM('Left', 'Center-left', 'Center', 'Center-right', 'Right');
CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"topic" text NOT NULL,
	"input_type" text NOT NULL,
	"status" "analysis_status" DEFAULT 'QUEUED' NOT NULL,
	"score" integer,
	"verdict" "analysis_verdict",
	"confidence" numeric(4, 2),
	"bias" "bias_spectrum",
	"summary" text,
	"recommendation" text,
	"raw_input" text,
	"result_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "analysis_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"claim_id" uuid,
	"relevance" numeric(4, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"text" text NOT NULL,
	"extraction_confidence" numeric(4, 2),
	"verdict" "analysis_verdict",
	"confidence" numeric(4, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"analysis_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "explanation_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"claim_id" uuid,
	"description" text NOT NULL,
	"supporting_source_ids" text,
	"confidence" numeric(4, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"user_id" uuid,
	"is_agree" boolean NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"reliability" numeric(4, 2),
	"last_retrieved_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"email" text,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_external_id_unique" UNIQUE("external_id")
);
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "analysis_sources" ADD CONSTRAINT "analysis_sources_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "analysis_sources" ADD CONSTRAINT "analysis_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "analysis_sources" ADD CONSTRAINT "analysis_sources_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "claims" ADD CONSTRAINT "claims_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "explanation_steps" ADD CONSTRAINT "explanation_steps_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "explanation_steps" ADD CONSTRAINT "explanation_steps_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

-- ============================================
-- Migration 0001: Analysis Attachments
-- ============================================
CREATE TYPE "public"."analysis_attachment_kind" AS ENUM('link', 'image', 'document');
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
ALTER TABLE "analysis_attachments" ADD CONSTRAINT "analysis_attachments_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;

-- ============================================
-- Migration 0002: Subscriptions & Usage
-- ============================================
CREATE TYPE "public"."billing_cycle" AS ENUM('MONTHLY', 'ANNUAL');
CREATE TYPE "public"."subscription_plan" AS ENUM('FREE', 'PLUS', 'PRO');
CREATE TYPE "public"."subscription_status" AS ENUM('ACTIVE', 'CANCELLED', 'PAST_DUE', 'TRIALING');
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'FREE' NOT NULL,
	"status" "subscription_status" DEFAULT 'ACTIVE' NOT NULL,
	"billing_cycle" "billing_cycle" DEFAULT 'MONTHLY' NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"clerk_subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
CREATE TABLE "user_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"analyses_count" integer DEFAULT 0 NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"last_reset_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_usage_user_id_unique" UNIQUE("user_id")
);
ALTER TABLE "analyses" ADD COLUMN "image_url" text;
ALTER TABLE "analyses" ADD COLUMN "image_attribution" text;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_usage" ADD CONSTRAINT "user_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- ============================================
-- Migration 0003: Performance Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_user_created ON analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_analysis_id ON claims(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sources_analysis_id ON analysis_sources(analysis_id);
CREATE INDEX IF NOT EXISTS idx_explanation_steps_analysis_id ON explanation_steps(analysis_id);
CREATE INDEX IF NOT EXISTS idx_feedback_analysis_id ON feedback(analysis_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);

