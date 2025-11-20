import { desc, eq } from "drizzle-orm";

import { AnalysisAttachmentInput, AnalysisJobInput, analysisJobInputSchema } from "@vett/shared";

import { db } from "../db/index.js";
import {
  analyses,
  claims,
  analysisSources,
  explanationSteps,
  sources,
  analysisAttachments
} from "../db/schema.js";
import { queues } from "../queues/index.js";
import { subscriptionService } from "./subscription-service.js";
import { userService } from "./user-service.js";

type SubmitAnalysisInput = AnalysisJobInput;

export interface AnalysisSummary {
  id: string;
  userId: string | null;
  score: number | null;
  verdict: string | null;
  confidence: number | null;
  bias?: string | null;
  createdAt: string;
  status: string;
  summary?: string | null;
  recommendation?: string | null;
  imageUrl?: string | null;
  imageAttribution?: {
    photographer?: string;
    photographerProfileUrl?: string;
    unsplashPhotoUrl?: string;
    isGenerated?: boolean;
  } | null;
  hasWatermark: boolean;
  claims: ClaimSummary[];
  sources: AnalysisSourceSummary[];
  explanationSteps: ExplanationStepSummary[];
  attachments: AnalysisAttachmentSummary[];
  ingestionMeta?: IngestionMetaSummary | null;
  ingestionRecords: IngestionRecordSummary[];
  classificationMeta?: ClassificationMeta | null;
  claimExtractionMeta?: ClaimExtractionMeta | null;
  reasonerMeta?: ReasonerMeta | null;
}

export interface ClaimSummary {
  id: string;
  text: string;
  extractionConfidence: number | null;
  verdict: string | null;
  confidence: number | null;
  createdAt: string;
}

export interface AnalysisSourceSummary {
  id: string;
  provider: string;
  title: string;
  url: string;
  reliability: number | null;
  summary?: string | null;
  evaluation?: SourceEvaluationSummary | null;
  createdAt: string;
}

export interface ExplanationStepSummary {
  id: string;
  claimId: string | null;
  description: string;
  supportingSourceIds: string[];
  confidence: number | null;
  createdAt: string;
}

export interface SourceEvaluationSummary {
  reliability: number | null;
  relevance: number | null;
  assessment?: string | null;
}

export interface IngestionMetaSummary {
  totalAttachments: number;
  processedLinks: number;
  processedImages: number;
  processedDocuments: number;
  successful: number;
  failed: number;
  totalCharacters: number;
  warnings?: string[];
}

export interface IngestionRecordSummary {
  attachment?: AnalysisAttachmentSummary | null;
  wordCount?: number | null;
  truncated: boolean;
  error?: string | null;
  quality?: {
    level: "excellent" | "good" | "fair" | "poor" | "insufficient";
    score: number;
    reasons?: string[];
    recommendation?: "screenshot" | "api_key" | "none";
    message?: string;
  } | null;
}

export interface AnalysisAttachmentSummary {
  id: string;
  kind: string;
  url: string;
  mediaType?: string | null;
  title?: string | null;
  summary?: string | null;
  altText?: string | null;
  caption?: string | null;
  createdAt: string;
}

export interface ClassificationMeta {
  model: string;
  confidence: number | null;
  rationale?: string | null;
  fallbackUsed: boolean;
}

export interface ClaimExtractionMeta {
  model: string;
  totalClaims: number;
  usedFallback: boolean;
  warnings?: string[];
}

export interface ReasonerMeta {
  model: string;
  confidence: number | null;
  fallbackUsed: boolean;
  rationale?: string | null;
}

class AnalysisService {
  async enqueueAnalysis(_input: SubmitAnalysisInput, userId?: string): Promise<string> {
    const rawAttachments =
      (_input as SubmitAnalysisInput & { attachments?: Array<Record<string, unknown>> }).attachments ?? [];

    const normalizedInput = analysisJobInputSchema.parse({
      ..._input,
      attachments: rawAttachments.map((attachment: Record<string, unknown>) => {
        const record = attachment ?? {};
        const kindSource = (record as { kind?: unknown }).kind;
        const kindRaw = typeof kindSource === "string" ? kindSource.toLowerCase() : kindSource;
        return {
          ...record,
          kind: kindRaw
        };
      })
    });

    const [{ id }] = await db
      .insert(analyses)
      .values({
        userId: userId ?? null,
        topic: normalizedInput.topicHint ?? "unknown",
        inputType: normalizedInput.mediaType,
        status: "QUEUED",
        rawInput: JSON.stringify({
          text: normalizedInput.text ?? null,
          contentUri: normalizedInput.contentUri ?? null,
          attachments: normalizedInput.attachments
        })
      })
      .returning({ id: analyses.id });

    if (normalizedInput.attachments.length > 0) {
      await db.insert(analysisAttachments).values(
        normalizedInput.attachments.map((attachment: AnalysisAttachmentInput) => ({
          analysisId: id,
          kind: attachment.kind,
          url: attachment.url,
          mediaType: attachment.mediaType ?? null,
          title: "title" in attachment ? (attachment.title ?? null) : null,
          summary: "summary" in attachment ? (attachment.summary ?? null) : null,
          altText: "altText" in attachment ? (attachment.altText ?? null) : null,
          caption: "caption" in attachment ? (attachment.caption ?? null) : null
        }))
      );
    }

    try {
      await queues.analysis.add("analysis", {
        analysisId: id,
        input: {
          contentUri: normalizedInput.contentUri ?? null,
          text: normalizedInput.text ?? null,
          mediaType: normalizedInput.mediaType,
          topicHint: normalizedInput.topicHint ?? null,
          attachments: normalizedInput.attachments
        }
      });
    } catch (error) {
      await db
        .update(analyses)
        .set({
          status: "FAILED",
          updatedAt: new Date()
        })
        .where(eq(analyses.id, id));
      throw error;
    }

    return id;
  }

  async getAnalysisSummary(id: string, clerkUserId?: string): Promise<AnalysisSummary | null> {
    const record = await db.query.analyses.findFirst({
      where: eq(analyses.id, id)
    });

    if (!record) {
      return null;
    }

    const claimsRows = await db.query.claims.findMany({
      where: eq(claims.analysisId, id),
      orderBy: (row, { desc: orderDesc }) => orderDesc(row.createdAt)
    });

    const attachmentRows = await db.query.analysisAttachments.findMany({
      where: eq(analysisAttachments.analysisId, id),
      orderBy: (row, { desc: orderDesc }) => orderDesc(row.createdAt)
    });

    const sourcesRows = await db
      .select({
        analysisSourceId: analysisSources.id,
        provider: sources.provider,
        title: sources.title,
        url: sources.url,
        reliability: analysisSources.relevance,
        createdAt: analysisSources.createdAt
      })
      .from(analysisSources)
      .leftJoin(sources, eq(analysisSources.sourceId, sources.id))
      .where(eq(analysisSources.analysisId, id))
      .orderBy(desc(analysisSources.createdAt));

    const explanationRows = await db.query.explanationSteps.findMany({
      where: eq(explanationSteps.analysisId, id),
      orderBy: (row, { desc: orderDesc }) => orderDesc(row.createdAt)
    });

    let parsedResultJson: Record<string, unknown> = {};
    try {
      parsedResultJson = record.resultJson ? JSON.parse(record.resultJson) : {};
    } catch {
      parsedResultJson = {};
    }

    const sourceDetailsByUrl = new Map<
      string,
      { summary: string | null; evaluation: SourceEvaluationSummary | null }
    >();
    const resultSources = Array.isArray((parsedResultJson as any)?.sources)
      ? ((parsedResultJson as any).sources as Array<Record<string, unknown>>)
      : [];
    for (const item of resultSources) {
      const url = typeof item?.url === "string" ? item.url : null;
      if (url) {
        const summary =
          typeof item?.summary === "string" ? (item.summary as string) : null;
        const evaluationRaw = item?.evaluation as Record<string, unknown> | undefined;
        const evaluation: SourceEvaluationSummary | null = evaluationRaw
          ? {
              reliability:
                typeof evaluationRaw.reliability === "number"
                  ? Number(evaluationRaw.reliability)
                  : null,
              relevance:
                typeof evaluationRaw.relevance === "number"
                  ? Number(evaluationRaw.relevance)
                  : null,
              assessment:
                typeof evaluationRaw.assessment === "string"
                  ? evaluationRaw.assessment
                  : null
            }
          : null;
        sourceDetailsByUrl.set(url, { summary, evaluation });
      }
    }

    const claimsSummary: ClaimSummary[] = claimsRows.map((row) => ({
      id: row.id,
      text: row.text,
      extractionConfidence: row.extractionConfidence !== null ? Number(row.extractionConfidence) : null,
      verdict: row.verdict ?? null,
      confidence: row.confidence !== null ? Number(row.confidence) : null,
      createdAt: row.createdAt.toISOString()
    }));

    const sourcesSummary: AnalysisSourceSummary[] = sourcesRows.map((row) => {
      const url = row.url ?? "";
      const details = sourceDetailsByUrl.get(url);
      return {
        id: row.analysisSourceId,
        provider: row.provider ?? "Unknown",
        title: row.title ?? "Untitled source",
        url,
        reliability: row.reliability !== null ? Number(row.reliability) : null,
        summary: details?.summary ?? null,
        evaluation: details?.evaluation ?? null,
        createdAt: row.createdAt.toISOString()
      };
    });

    const explanationSummary: ExplanationStepSummary[] = explanationRows.map((row) => ({
      id: row.id,
      claimId: row.claimId,
      description: row.description,
      supportingSourceIds: row.supportingSourceIds ? row.supportingSourceIds.split(",").filter(Boolean) : [],
      confidence: row.confidence !== null ? Number(row.confidence) : null,
      createdAt: row.createdAt.toISOString()
    }));

    const attachmentsSummary: AnalysisAttachmentSummary[] = attachmentRows.map((row) => ({
      id: row.id,
      kind: row.kind,
      url: row.url,
      mediaType: row.mediaType,
      title: row.title,
      summary: row.summary,
      altText: row.altText,
      caption: row.caption,
      createdAt: row.createdAt.toISOString()
    }));

    const metadata = (parsedResultJson?.metadata ?? {}) as Record<string, unknown>;
    const classificationMetaRaw = metadata.classification as Record<string, unknown> | undefined;
    const claimExtractionMetaRaw = metadata.claimExtraction as Record<string, unknown> | undefined;
    const reasonerMetaRaw = metadata.reasoner as Record<string, unknown> | undefined;
    const ingestionMetaRaw = metadata.ingestion as Record<string, unknown> | undefined;
    const resultIngestion = (parsedResultJson as Record<string, unknown>)?.ingestion as Record<string, unknown> | undefined;

    const classificationMeta: ClassificationMeta | null = classificationMetaRaw
      ? {
          model: String(classificationMetaRaw.model ?? "unknown"),
          confidence:
            typeof classificationMetaRaw.confidence === "number"
              ? Number(classificationMetaRaw.confidence)
              : null,
          rationale:
            typeof classificationMetaRaw.rationale === "string" ? classificationMetaRaw.rationale : null,
          fallbackUsed: Boolean(classificationMetaRaw.fallbackUsed)
        }
      : null;

    const claimExtractionMeta: ClaimExtractionMeta | null = claimExtractionMetaRaw
      ? {
          model: String(claimExtractionMetaRaw.model ?? "unknown"),
          totalClaims: Number(
            claimExtractionMetaRaw.totalClaims ??
              (Array.isArray((parsedResultJson as any)?.claims) ? (parsedResultJson as any).claims.length : 0)
          ),
          usedFallback: Boolean(claimExtractionMetaRaw.usedFallback),
          warnings: Array.isArray(claimExtractionMetaRaw.warnings)
            ? (claimExtractionMetaRaw.warnings as unknown[])
                .filter((warning): warning is string => typeof warning === "string")
            : undefined
        }
      : null;

    const reasonerMeta: ReasonerMeta | null = reasonerMetaRaw
      ? {
          model: String(reasonerMetaRaw.model ?? "unknown"),
          confidence:
            typeof reasonerMetaRaw.confidence === "number"
              ? Number(reasonerMetaRaw.confidence)
              : null,
          fallbackUsed: Boolean(reasonerMetaRaw.fallbackUsed),
          rationale:
            typeof reasonerMetaRaw.rationale === "string" ? reasonerMetaRaw.rationale : null
        }
      : null;

    const ingestionMeta: IngestionMetaSummary | null = ingestionMetaRaw
      ? {
          totalAttachments: Number(ingestionMetaRaw.totalAttachments ?? attachmentRows.length),
          processedLinks: Number(ingestionMetaRaw.processedLinks ?? 0),
          processedImages: Number(ingestionMetaRaw.processedImages ?? 0),
          processedDocuments: Number(ingestionMetaRaw.processedDocuments ?? 0),
          successful: Number(ingestionMetaRaw.successful ?? 0),
          failed: Number(ingestionMetaRaw.failed ?? 0),
          totalCharacters: Number(ingestionMetaRaw.totalCharacters ?? 0),
          warnings: Array.isArray(ingestionMetaRaw.warnings)
            ? (ingestionMetaRaw.warnings as unknown[])
                .filter((warning): warning is string => typeof warning === "string")
            : undefined
        }
      : null;

    const attachmentsByUrl = new Map(attachmentsSummary.map((attachment) => [attachment.url, attachment]));
    const ingestionRecordsRaw = Array.isArray(resultIngestion?.records)
      ? resultIngestion?.records
      : [];
    const ingestionRecords: IngestionRecordSummary[] = ingestionRecordsRaw
      .map((record) => {
        const recordObj = record as Record<string, unknown>;
        const attachmentRaw = recordObj.attachment as Record<string, unknown> | undefined;
        const urlFromAttachment =
          typeof attachmentRaw?.url === "string" ? (attachmentRaw.url as string) : undefined;
        const matchedAttachment = urlFromAttachment ? attachmentsByUrl.get(urlFromAttachment) ?? null : null;

        const qualityRaw = recordObj.quality as
          | {
              level?: string;
              score?: number;
              reasons?: string[];
              recommendation?: string;
              message?: string;
            }
          | undefined
          | null;

        const quality =
          qualityRaw &&
          typeof qualityRaw.level === "string" &&
          typeof qualityRaw.score === "number"
            ? {
                level: qualityRaw.level as "excellent" | "good" | "fair" | "poor" | "insufficient",
                score: Math.max(0, Math.min(1, qualityRaw.score)),
                reasons: Array.isArray(qualityRaw.reasons)
                  ? (qualityRaw.reasons as unknown[]).filter((r): r is string => typeof r === "string")
                  : undefined,
                recommendation:
                  typeof qualityRaw.recommendation === "string"
                    ? (qualityRaw.recommendation as "screenshot" | "api_key" | "none")
                    : undefined,
                message: typeof qualityRaw.message === "string" ? qualityRaw.message : undefined
              }
            : null;

        return {
          attachment: matchedAttachment,
          wordCount:
            typeof recordObj.wordCount === "number"
              ? Math.max(0, Math.floor(recordObj.wordCount))
              : null,
          truncated: Boolean(recordObj.truncated),
          error:
            typeof recordObj.error === "string" && recordObj.error.length > 0
              ? recordObj.error
              : null,
          quality
        };
      })
      .filter((entry) => entry.truncated !== undefined);

    // Check if watermark should be applied
    let hasWatermark = true; // Default to watermark for unauthenticated
    if (clerkUserId) {
      const user = await userService.getUserByExternalId(clerkUserId);
      if (user) {
        hasWatermark = await subscriptionService.shouldApplyWatermark(user.id);
      }
    }

    return {
      id: record.id,
      userId: record.userId ?? null,
      score: record.score ?? null,
      verdict: record.verdict ?? null,
      confidence: record.confidence !== null ? Number(record.confidence) : null,
      bias: record.bias,
      createdAt: record.createdAt ? record.createdAt.toISOString() : new Date(0).toISOString(),
      status: record.status,
      summary: record.summary ?? null,
      recommendation: record.recommendation ?? null,
      imageUrl: record.imageUrl ?? null,
      imageAttribution: record.imageAttribution
        ? (JSON.parse(record.imageAttribution) as AnalysisSummary["imageAttribution"])
        : null,
      hasWatermark,
      claims: claimsSummary,
      sources: sourcesSummary,
      explanationSteps: explanationSummary,
      attachments: attachmentsSummary,
      ingestionMeta,
      ingestionRecords,
      classificationMeta,
      claimExtractionMeta,
      reasonerMeta
    };
  }
}

export const analysisService = new AnalysisService();

