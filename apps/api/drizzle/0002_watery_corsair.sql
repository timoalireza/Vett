CREATE TYPE "public"."billing_cycle" AS ENUM('MONTHLY', 'ANNUAL');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('FREE', 'PLUS', 'PRO');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('ACTIVE', 'CANCELLED', 'PAST_DUE', 'TRIALING');--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "image_attribution" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_usage" ADD CONSTRAINT "user_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;