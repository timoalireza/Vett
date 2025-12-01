import { relations } from "drizzle-orm";
import { pgTable, pgEnum, uuid, text, timestamp, integer, numeric, boolean, uniqueIndex, sql } from "drizzle-orm/pg-core";

export const analysisStatusEnum = pgEnum("analysis_status", [
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED"
]);

export const analysisVerdictEnum = pgEnum("analysis_verdict", [
  "Verified",
  "Mostly Accurate",
  "Partially Accurate",
  "False",
  "Opinion"
]);

export const analysisAttachmentKindEnum = pgEnum("analysis_attachment_kind", ["link", "image", "document"]);

export const biasSpectrumEnum = pgEnum("bias_spectrum", [
  "Left",
  "Center-left",
  "Center",
  "Center-right",
  "Right"
]);

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "FREE",
  "PLUS",
  "PRO"
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ACTIVE",
  "CANCELLED",
  "PAST_DUE",
  "TRIALING"
]);

export const billingCycleEnum = pgEnum("billing_cycle", [
  "MONTHLY",
  "ANNUAL"
]);

export const socialPlatformEnum = pgEnum("social_platform", [
  "INSTAGRAM"
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: text("external_id").notNull().unique(), // Clerk/Firebase ID
  email: text("email"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

// Legacy/Landing page table - preserving to prevent data loss
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  instagramUserId: text("instagram_user_id"), // Instagram user ID for analyses created via DM
  topic: text("topic").notNull(),
  inputType: text("input_type").notNull(), // e.g., text, image, video
  status: analysisStatusEnum("status").default("QUEUED").notNull(),
  score: integer("score"),
  verdict: analysisVerdictEnum("verdict"),
  confidence: numeric("confidence", { precision: 4, scale: 2 }),
  bias: biasSpectrumEnum("bias"),
  summary: text("summary"),
  recommendation: text("recommendation"),
  rawInput: text("raw_input"),
  resultJson: text("result_json"), // stored JSON string
  imageUrl: text("image_url"), // Featured image URL for card display
  imageAttribution: text("image_attribution"), // JSON string with photographer info and links
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const analysisAttachments = pgTable("analysis_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  kind: analysisAttachmentKindEnum("kind").notNull(),
  url: text("url").notNull(),
  mediaType: text("media_type"),
  title: text("title"),
  summary: text("summary"),
  altText: text("alt_text"),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const analysisAttachmentRelations = relations(analysisAttachments, ({ one }) => ({
  analysis: one(analyses, {
    fields: [analysisAttachments.analysisId],
    references: [analyses.id]
  })
}));

export const analysisRelations = relations(analyses, ({ many, one }) => ({
  user: one(users, {
    fields: [analyses.userId],
    references: [users.id]
  }),
  claims: many(claims),
  sources: many(analysisSources),
  feedback: many(feedback),
  explanationSteps: many(explanationSteps),
  attachments: many(analysisAttachments),
  collectionItems: many(collectionItems)
}));

export const claims = pgTable("claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  extractionConfidence: numeric("extraction_confidence", { precision: 4, scale: 2 }),
  verdict: analysisVerdictEnum("verdict"),
  confidence: numeric("confidence", { precision: 4, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const claimRelations = relations(claims, ({ one, many }) => ({
  analysis: one(analyses, {
    fields: [claims.analysisId],
    references: [analyses.id]
  }),
  sources: many(analysisSources),
  explanationSteps: many(explanationSteps)
}));

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  reliability: numeric("reliability", { precision: 4, scale: 2 }),
  lastRetrievedAt: timestamp("last_retrieved_at", { withTimezone: true }).defaultNow().notNull()
});

export const sourceRelations = relations(sources, ({ many }) => ({
  analyses: many(analysisSources)
}));

export const analysisSources = pgTable("analysis_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => sources.id, { onDelete: "cascade" }),
  claimId: uuid("claim_id").references(() => claims.id, { onDelete: "set null" }),
  relevance: numeric("relevance", { precision: 4, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const analysisSourceRelations = relations(analysisSources, ({ one }) => ({
  analysis: one(analyses, {
    fields: [analysisSources.analysisId],
    references: [analyses.id]
  }),
  source: one(sources, {
    fields: [analysisSources.sourceId],
    references: [sources.id]
  }),
  claim: one(claims, {
    fields: [analysisSources.claimId],
    references: [claims.id]
  })
}));

export const explanationSteps = pgTable("explanation_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  claimId: uuid("claim_id").references(() => claims.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  supportingSourceIds: text("supporting_source_ids"),
  confidence: numeric("confidence", { precision: 4, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  isAgree: boolean("is_agree").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const feedbackRelations = relations(feedback, ({ one }) => ({
  analysis: one(analyses, {
    fields: [feedback.analysisId],
    references: [analyses.id]
  }),
  user: one(users, {
    fields: [feedback.userId],
    references: [users.id]
  })
}));

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const collectionRelations = relations(collections, ({ one, many }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.id]
  }),
  items: many(collectionItems)
}));

export const collectionItems = pgTable("collection_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id")
    .notNull()
    .references(() => collections.id, { onDelete: "cascade" }),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull()
});

export const collectionItemRelations = relations(collectionItems, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionItems.collectionId],
    references: [collections.id]
  }),
  analysis: one(analyses, {
    fields: [collectionItems.analysisId],
    references: [analyses.id]
  })
}));

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  plan: subscriptionPlanEnum("plan").default("FREE").notNull(),
  status: subscriptionStatusEnum("status").default("ACTIVE").notNull(),
  billingCycle: billingCycleEnum("billing_cycle").default("MONTHLY").notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  clerkSubscriptionId: text("clerk_subscription_id"), // Legacy: External subscription ID from payment provider
  revenueCatCustomerId: text("revenuecat_customer_id"), // RevenueCat customer ID (app user ID)
  revenueCatSubscriptionId: text("revenuecat_subscription_id"), // RevenueCat subscription/transaction ID
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const subscriptionRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id]
  })
}));

export const userUsage = pgTable("user_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  analysesCount: integer("analyses_count").default(0).notNull(), // Count for current period
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(), // Start of current billing period
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(), // End of current billing period
  lastResetAt: timestamp("last_reset_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

// Instagram users table - stores Instagram user IDs and metadata
export const instagramUsers = pgTable("instagram_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  instagramUserId: text("instagram_user_id").notNull().unique(), // Instagram user ID from Meta API
  username: text("username"), // Instagram username (optional, may not always be available)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

// Social accounts table - links Instagram accounts to app users
export const socialAccounts = pgTable("social_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  platform: socialPlatformEnum("platform").notNull(), // Currently only INSTAGRAM
  platformUserId: text("platform_user_id").notNull(), // Instagram user ID
  verificationCode: text("verification_code"), // Temporary code for linking
  verificationCodeExpiresAt: timestamp("verification_code_expires_at", { withTimezone: true }), // Expiration for verification code
  linkedAt: timestamp("linked_at", { withTimezone: true }), // When account was linked
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  // Unique constraint: one social account per user per platform
  // Prevents duplicate linked accounts for the same platform
  userIdPlatformUnique: uniqueIndex("social_accounts_user_id_platform_unique").on(table.userId, table.platform)
}));

// Instagram DM usage table - tracks analysis usage per Instagram user
export const instagramDmUsage = pgTable("instagram_dm_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  instagramUserId: text("instagram_user_id").notNull(), // Instagram user ID (not FK to allow orphaned records)
  analysesCount: integer("analyses_count").default(0).notNull(), // Count for current period
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(), // Start of current period
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(), // End of current period
  lastResetAt: timestamp("last_reset_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

// Relations
// Note: instagramUsers and socialAccounts are not directly related via FK
// They share the same Instagram user ID value (platformUserId) but use it for different purposes
// Query socialAccounts by platformUserId directly when needed

export const socialAccountRelations = relations(socialAccounts, ({ one }) => ({
  user: one(users, {
    fields: [socialAccounts.userId],
    references: [users.id]
  })
}));
