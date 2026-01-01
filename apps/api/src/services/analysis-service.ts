import { desc, eq, and, lt, gt } from "drizzle-orm";

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
import { queues, ensureRedisReady } from "../queues/index.js";
import { subscriptionService } from "./subscription-service.js";
import { userService } from "./user-service.js";
import type { PaginationArgs, PaginatedResult } from "../utils/pagination.js";
import { validatePaginationArgs, createPageInfo, createCursor } from "../utils/pagination.js";
import { trackAnalysisSubmitted } from "../plugins/metrics.js";

type SubmitAnalysisInput = AnalysisJobInput;

export interface AnalysisSummary {
  id: string;
  userId: string | null;
  score: number | null;
  verdict: string | null;
  confidence: number | null;
  bias?: string | null;
  topic?: string | null;
  createdAt: string;
  status: string;
  title?: string | null;
  summary?: string | null;
  recommendation?: string | null;
  rawInput?: string | null;
  complexity?: string | null;
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
  async enqueueAnalysis(_input: SubmitAnalysisInput, userId?: string, instagramUserId?: string): Promise<string> {
    console.log("[AnalysisService] enqueueAnalysis called", { 
      hasInput: !!_input,
      inputType: _input?.mediaType,
      hasUserId: !!userId,
      attachmentsCount: (_input as any)?.attachments?.length || 0
    });
    
    const rawAttachments =
      (_input as SubmitAnalysisInput & { attachments?: Array<Record<string, unknown>> }).attachments ?? [];

    console.log("[AnalysisService] Parsing input...");
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
    console.log("[AnalysisService] ✅ Input parsed successfully");

    let id: string;
    try {
      console.log("[AnalysisService] Inserting into database...");
      const result = await db
        .insert(analyses)
        .values({
          userId: userId ?? null,
          instagramUserId: instagramUserId ?? null,
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
      
      if (!result || result.length === 0) {
        throw new Error("Failed to create analysis record");
      }
      
      id = result[0].id;
      console.log(`[AnalysisService] ✅ Database insert successful, analysisId: ${id}`);
    } catch (error) {
      console.error("[AnalysisService] ❌ Database insert error:", error);
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (
          errorMsg.includes("connection") ||
          errorMsg.includes("timeout") ||
          errorMsg.includes("econnrefused") ||
          errorMsg.includes("getaddrinfo")
        ) {
          throw new Error("Database connection error. Please check your database configuration.");
        }
        // Check for missing column/relation errors (schema mismatch)
        if (
          errorMsg.includes("does not exist") &&
          (errorMsg.includes("column") || errorMsg.includes("relation") || errorMsg.includes("table"))
        ) {
          // Try to match column errors: column "column_name" of relation "table_name"
          const columnMatch = errorMsg.match(/column "([^"]+)" of relation/);
          if (columnMatch) {
            const columnName = columnMatch[1];
            console.error(
              `[AnalysisService] Schema mismatch: Column '${columnName}' is missing from database. ` +
              `Please run migrations. See docs/RAILWAY_MIGRATION_FIX.md for instructions.`
            );
            throw new Error(
              `Database schema mismatch: Column '${columnName}' is missing. ` +
              `Please run database migrations. See docs/RAILWAY_MIGRATION_FIX.md`
            );
          }
          
          // Try to match relation/table errors: relation "table_name" does not exist
          const relationMatch = errorMsg.match(/(?:relation|table) "([^"]+)" does not exist/);
          if (relationMatch) {
            const tableName = relationMatch[1];
            console.error(
              `[AnalysisService] Schema mismatch: Table '${tableName}' is missing from database. ` +
              `Please run migrations. See docs/RAILWAY_MIGRATION_FIX.md for instructions.`
            );
            throw new Error(
              `Database schema mismatch: Table '${tableName}' is missing. ` +
              `Please run database migrations. See docs/RAILWAY_MIGRATION_FIX.md`
            );
          }
          
          // Fallback: if condition matched but regex patterns didn't, still provide helpful error
          console.error(
            `[AnalysisService] Schema mismatch detected but couldn't extract specific details. ` +
            `Original error: ${error.message}. Please run migrations. See docs/RAILWAY_MIGRATION_FIX.md for instructions.`
          );
          throw new Error(
            `Database schema mismatch detected. The database schema is out of sync with the application code. ` +
            `Please run database migrations. See docs/RAILWAY_MIGRATION_FIX.md for instructions. ` +
            `Original error: ${error.message}`
          );
        }
      }
      throw error;
    }

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
            console.log(`[AnalysisService] Adding job to queue for analysisId: ${id}...`);
            
            // CRITICAL: Ensure Redis is ready before adding job
            // BullMQ Queue.add() will hang if Redis isn't connected
            console.log(`[AnalysisService] Ensuring Redis is ready before enqueueing...`);
            await ensureRedisReady();
            console.log(`[AnalysisService] ✅ Redis ready, proceeding with job enqueue`);
            
            // Add job to queue with retry logic for Redis connection issues
            // BullMQ will handle Redis reconnection automatically
            console.log(`[AnalysisService] Calling queues.analysis.add()...`);
      const job = await Promise.race([
        queues.analysis.add("analysis", {
          analysisId: id,
          input: {
            contentUri: normalizedInput.contentUri ?? null,
            text: normalizedInput.text ?? null,
            mediaType: normalizedInput.mediaType,
            topicHint: normalizedInput.topicHint ?? null,
            attachments: normalizedInput.attachments
          }
        }, {
          // Retry job if Redis connection fails
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000
          },
          // Remove completed jobs after 24 hours
          removeOnComplete: {
            age: 24 * 3600, // 24 hours in seconds
            count: 1000
          }
        }) as Promise<{ id: string }>,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Queue.add() timeout after 30 seconds")), 30000)
      )
      ]);
      
      // Log successful enqueue (for debugging)
      console.log(`[AnalysisService] ✅ Analysis ${id} enqueued as job ${job.id}`);
      // Note: logger not available in this service, using console.log instead
      
      // Track metrics
      trackAnalysisSubmitted();
    } catch (error) {
      // Log the actual error for debugging (even in production)
      console.error("[AnalysisService] Failed to enqueue analysis:", {
        analysisId: id,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });
      
      // Update analysis status to FAILED
      await db
        .update(analyses)
        .set({
          status: "FAILED",
          updatedAt: new Date(),
          summary: "Failed to queue analysis for processing. Please try again."
        })
        .where(eq(analyses.id, id));
      
      // Throw a user-friendly error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Redis") || errorMessage.includes("ECONNRESET") || errorMessage.includes("Connection") || errorMessage.includes("ioredis")) {
        throw new Error("Unable to process analysis at this time. Please try again in a moment.");
      }
      throw new Error(`Failed to queue analysis: ${errorMessage}`);
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
    let hasWatermark = false; // Watermarks disabled globally
    if (clerkUserId) {
      const user = await userService.getUserByExternalId(clerkUserId);
      if (user) {
        hasWatermark = await subscriptionService.shouldApplyWatermark(user.id);
      }
    }

    // Parse rawInput to extract text if available
    let rawInputText: string | null = null;
    try {
      if (record.rawInput && typeof record.rawInput === "string") {
        try {
          const parsed = JSON.parse(record.rawInput) as { text?: string | null; contentUri?: string | null };
          rawInputText = parsed.text ?? null;
        } catch {
          // If parsing fails, use rawInput as-is (might be plain text)
          rawInputText = record.rawInput;
        }
      }
    } catch (error) {
      // Log warning but don't fail the request
      console.warn(`[AnalysisService] Error processing rawInput for analysis ${id}:`, error);
      rawInputText = null;
    }

    return {
      id: record.id,
      userId: record.userId ?? null,
      score: record.score ?? null,
      verdict: record.verdict ?? null,
      confidence: record.confidence !== null ? Number(record.confidence) : null,
      bias: record.bias,
      topic: record.topic ?? null,
      createdAt: record.createdAt ? record.createdAt.toISOString() : new Date(0).toISOString(),
      status: record.status,
      title: record.title ?? null,
      summary: record.summary ?? null,
      recommendation: record.recommendation ?? null,
      rawInput: rawInputText,
      complexity: record.complexity ?? null,
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

  /**
   * Get paginated list of analyses for a user
   */
  async getAnalyses(
    userId: string,
    paginationArgs: PaginationArgs,
    clerkUserId?: string
  ): Promise<PaginatedResult<AnalysisSummary>> {
    const { limit, cursor, direction } = validatePaginationArgs(paginationArgs);

    // Build where conditions
    const conditions = [eq(analyses.userId, userId)];

    // Apply history retention limit
    const retentionCutoff = await subscriptionService.getHistoryCutoffDate(userId);
    if (retentionCutoff) {
      conditions.push(gt(analyses.createdAt, retentionCutoff));
    }

    // Add cursor condition for pagination
    // Ordering is DESC (newest first), so:
    // - Forward (after cursor): get items older than cursor (createdAt < cursor.createdAt)
    // - Backward (before cursor): get items newer than cursor (createdAt > cursor.createdAt)
    if (cursor && typeof cursor.id === "string" && typeof cursor.createdAt === "string") {
      if (direction === "forward") {
        // Forward pagination: get items after cursor (older items in DESC order)
        conditions.push(lt(analyses.createdAt, new Date(cursor.createdAt)));
      } else {
        // Backward pagination: get items before cursor (newer items in DESC order)
        conditions.push(gt(analyses.createdAt, new Date(cursor.createdAt)));
      }
    }

    // Fetch one extra to determine if there are more pages
    const limitPlusOne = limit + 1;

    // Query analyses ordered by createdAt descending (newest first)
    let results;
    try {
      results = await db.query.analyses.findMany({
      where: and(...conditions),
      orderBy: (analyses, { desc }) => [desc(analyses.createdAt)],
      limit: limitPlusOne
    });
    } catch (dbError: any) {
      console.error("[AnalysisService] Database error fetching analyses:", {
        userId,
        error: dbError.message,
        stack: dbError.stack,
        code: dbError.code,
        detail: dbError.detail
      });
      throw new Error(`Database error: ${dbError.message || "Failed to fetch analyses"}`);
    }

    // Check if there are more results
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    // For backward pagination, reverse the results to get correct order
    const orderedItems = direction === "backward" ? [...items].reverse() : items;

    // Get full analysis summaries (this could be optimized to batch load)
    const summaries = await Promise.all(
      orderedItems.map((item) => this.getAnalysisSummary(item.id, clerkUserId))
    );

    // Filter out nulls (shouldn't happen, but TypeScript)
    const validSummaries = summaries.filter((s): s is AnalysisSummary => s !== null);

    // Create edges with cursors
    const edges = validSummaries.map((summary) => ({
      node: summary,
      cursor: createCursor({
        id: summary.id,
        createdAt: summary.createdAt
      })
    }));

    // Create page info
    const pageInfo = createPageInfo(validSummaries, hasMore, direction);

    return {
      edges,
      pageInfo,
      totalCount: undefined // Could add total count if needed (expensive for large datasets)
    };
  }

  async deleteAnalysis(analysisId: string, userId: string): Promise<boolean> {
    try {
      // First verify the analysis belongs to the user
      const analysis = await db.query.analyses.findFirst({
        where: eq(analyses.id, analysisId)
      });

      if (!analysis) {
        throw new Error("Analysis not found");
      }

      // Check ownership - only allow deletion if:
      // 1. Analysis belongs to the user (analysis.userId === userId)
      // 2. Analysis is anonymous (analysis.userId === null) - allow deletion by anyone for anonymous analyses
      if (analysis.userId !== null && analysis.userId !== userId) {
        throw new Error("Unauthorized: You can only delete your own analyses");
      }

      // Delete the analysis - cascade delete will handle related records (claims, sources, etc.)
      const result = await db.delete(analyses).where(eq(analyses.id, analysisId)).returning({ id: analyses.id });

      if (result.length === 0) {
        throw new Error("Failed to delete analysis. No rows were deleted.");
      }

      return true;
    } catch (error: any) {
      // Re-throw with clearer error message
      // If it's already an Error object with a message, use it; otherwise wrap it
      if (error instanceof Error && error.message) {
        throw error;
      }
      // For non-Error objects or errors without messages, wrap with a clear message
      const errorMessage = error?.message || String(error) || "Unknown error";
      throw new Error(`Failed to delete analysis: ${errorMessage}`);
    }
  }
}

export const analysisService = new AnalysisService();

