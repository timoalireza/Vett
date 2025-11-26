import { eq, and } from "drizzle-orm";

import { db } from "../db/index.js";
import { feedback, analyses } from "../db/schema.js";

export interface SubmitFeedbackInput {
  analysisId: string;
  userId?: string;
  isAgree: boolean;
  comment?: string | null;
}

export interface FeedbackSummary {
  id: string;
  analysisId: string;
  userId: string | null;
  isAgree: boolean;
  comment: string | null;
  createdAt: Date;
}

export const feedbackService = {
  async submitFeedback(input: SubmitFeedbackInput): Promise<FeedbackSummary> {
    // Verify analysis exists
    const analysis = await db.query.analyses.findFirst({
      where: eq(analyses.id, input.analysisId)
    });

    if (!analysis) {
      throw new Error("Analysis not found");
    }

    // Check if user already submitted feedback for this analysis
    if (input.userId) {
      const existingFeedback = await db.query.feedback.findFirst({
        where: and(
          eq(feedback.analysisId, input.analysisId),
          eq(feedback.userId, input.userId)
        )
      });

      if (existingFeedback) {
        // Update existing feedback
        const [updated] = await db
          .update(feedback)
          .set({
            isAgree: input.isAgree,
            comment: input.comment ?? null
          })
          .where(eq(feedback.id, existingFeedback.id))
          .returning();

        if (!updated) {
          throw new Error("Failed to update feedback");
        }

        return {
          id: updated.id,
          analysisId: updated.analysisId,
          userId: updated.userId ?? null,
          isAgree: updated.isAgree,
          comment: updated.comment ?? null,
          createdAt: updated.createdAt
        };
      }
    }

    // Create new feedback
    const [newFeedback] = await db
      .insert(feedback)
      .values({
        analysisId: input.analysisId,
        userId: input.userId ?? null,
        isAgree: input.isAgree,
        comment: input.comment ?? null
      })
      .returning();

    if (!newFeedback) {
      throw new Error("Failed to create feedback");
    }

    return {
      id: newFeedback.id,
      analysisId: newFeedback.analysisId,
      userId: newFeedback.userId ?? null,
      isAgree: newFeedback.isAgree,
      comment: newFeedback.comment ?? null,
      createdAt: newFeedback.createdAt
    };
  },

  async getFeedbackForAnalysis(analysisId: string, userId?: string): Promise<FeedbackSummary | null> {
    if (!userId) {
      return null;
    }

    const result = await db.query.feedback.findFirst({
      where: and(
        eq(feedback.analysisId, analysisId),
        eq(feedback.userId, userId)
      )
    });

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      analysisId: result.analysisId,
      userId: result.userId ?? null,
      isAgree: result.isAgree,
      comment: result.comment ?? null,
      createdAt: result.createdAt
    };
  }
};

