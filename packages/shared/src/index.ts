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

