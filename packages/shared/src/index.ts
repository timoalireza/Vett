import { z } from "zod";

export const name = "vett-shared";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ReasoningStep {
  id: string;
  claimId: string;
  description: string;
  supportingSourceIds: string[];
  confidence: number;
}

export interface VettScore {
  score: number;
  verdict: "Verified" | "Mostly Accurate" | "Partially True" | "False" | "Opinion";
  confidence: number;
  bias?: "Left" | "Center-left" | "Center" | "Center-right" | "Right" | null;
}

export const analysisAttachmentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("link"),
    url: z.string().url(),
    mediaType: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    summary: z.string().nullable().optional()
  }),
  z.object({
    kind: z.literal("image"),
    url: z.string().url(),
    mediaType: z.string().nullable().optional(),
    altText: z.string().nullable().optional(),
    caption: z.string().nullable().optional()
  }),
  z.object({
    kind: z.literal("document"),
    url: z.string().url(),
    mediaType: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    summary: z.string().nullable().optional()
  })
]);

export const analysisJobInputSchema = z
  .object({
    contentUri: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    mediaType: z.string(),
    topicHint: z.string().nullable().optional(),
    attachments: z.array(analysisAttachmentSchema).optional()
  })
  .transform((value) => ({
    ...value,
    attachments: value.attachments ?? []
  }));

export const analysisJobPayloadSchema = z.object({
  analysisId: z.string().uuid(),
  input: analysisJobInputSchema
});

export type AnalysisJobInput = z.infer<typeof analysisJobInputSchema>;
export type AnalysisJobPayload = z.infer<typeof analysisJobPayloadSchema>;
export type AnalysisAttachmentInput = z.infer<typeof analysisAttachmentSchema>;

// ============================================================================
// Epistemic Pipeline Schema (Graded Evaluator)
// ============================================================================

/**
 * Score bands - MANDATORY, DO NOT ALTER
 * These define the epistemic evaluation scale
 */
export const EPISTEMIC_SCORE_BANDS = {
  STRONGLY_SUPPORTED: { min: 90, max: 100, label: "Strongly Supported", description: "High consensus, stable evidence" },
  SUPPORTED: { min: 75, max: 89, label: "Supported", description: "Supported with minor caveats" },
  PLAUSIBLE: { min: 60, max: 74, label: "Plausible", description: "Plausible but conditional" },
  MIXED: { min: 45, max: 59, label: "Mixed", description: "Mixed or contested" },
  WEAKLY_SUPPORTED: { min: 30, max: 44, label: "Weakly Supported", description: "Weakly supported or misleading" },
  MOSTLY_FALSE: { min: 15, max: 29, label: "Mostly False", description: "Mostly false" },
  FALSE: { min: 0, max: 14, label: "False", description: "False or deceptive" }
} as const;

export const epistemicPenaltySeveritySchema = z.enum(["low", "medium", "high"]);

export const epistemicPenaltySchema = z.object({
  name: z.string(),
  weight: z.number().int().min(0).max(30),
  rationale: z.string(),
  severity: epistemicPenaltySeveritySchema
});

export const epistemicConfidenceIntervalSchema = z.object({
  low: z.number().min(0).max(100),
  high: z.number().min(0).max(100)
});

export const epistemicResultSchema = z.object({
  version: z.string(),
  finalScore: z.number().int().min(0).max(100),
  scoreBand: z.string(),
  scoreBandDescription: z.string(),
  penaltiesApplied: z.array(epistemicPenaltySchema),
  evidenceSummary: z.string(),
  confidenceInterval: epistemicConfidenceIntervalSchema.optional(),
  explanationText: z.string(),
  pipelineVersion: z.string(),
  processedAt: z.string(),
  totalProcessingTimeMs: z.number(),
  // Artifacts are optional in the shared schema (full artifacts stored in resultJson)
  artifacts: z.record(z.unknown()).optional()
});

export type EpistemicPenaltySeverity = z.infer<typeof epistemicPenaltySeveritySchema>;
export type EpistemicPenalty = z.infer<typeof epistemicPenaltySchema>;
export type EpistemicConfidenceInterval = z.infer<typeof epistemicConfidenceIntervalSchema>;
export type EpistemicResult = z.infer<typeof epistemicResultSchema>;

/**
 * Get the score band for a given score
 */
export function getEpistemicScoreBand(score: number): {
  key: keyof typeof EPISTEMIC_SCORE_BANDS;
  label: string;
  description: string;
} {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  
  if (clampedScore >= 90) return { key: "STRONGLY_SUPPORTED", ...EPISTEMIC_SCORE_BANDS.STRONGLY_SUPPORTED };
  if (clampedScore >= 75) return { key: "SUPPORTED", ...EPISTEMIC_SCORE_BANDS.SUPPORTED };
  if (clampedScore >= 60) return { key: "PLAUSIBLE", ...EPISTEMIC_SCORE_BANDS.PLAUSIBLE };
  if (clampedScore >= 45) return { key: "MIXED", ...EPISTEMIC_SCORE_BANDS.MIXED };
  if (clampedScore >= 30) return { key: "WEAKLY_SUPPORTED", ...EPISTEMIC_SCORE_BANDS.WEAKLY_SUPPORTED };
  if (clampedScore >= 15) return { key: "MOSTLY_FALSE", ...EPISTEMIC_SCORE_BANDS.MOSTLY_FALSE };
  return { key: "FALSE", ...EPISTEMIC_SCORE_BANDS.FALSE };
}

