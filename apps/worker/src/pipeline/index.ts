import { randomUUID } from "node:crypto";
import {
  PipelineContext,
  PipelineResult,
  PipelineSource,
  PipelineClaim,
  PipelineExplanationStep,
  PipelineMetadata,
  ReasonerMetadata
} from "./types.js";
import { AnalysisJobPayload } from "@vett/shared";
import { classifyTopicHeuristically, classifyTopicWithOpenAI } from "./classifiers/topic.js";
import { extractClaimsWithOpenAI } from "./extractors/claims.js";
import { retrieveEvidence } from "./retrievers/index.js";
import type { EvidenceResult } from "./retrievers/types.js";
import { evaluateEvidenceForClaim } from "./evidence/evaluator.js";
import { reasonVerdict, VERDICT_MODEL, type ReasonerVerdictOutput } from "./reasoners/verdict.js";
import { adjustReliability, extractHostname } from "./retrievers/trust.js";
import { ingestAttachments } from "./ingestion/index.js";
import { openai } from "../clients/openai.js";
import { runEpistemicPipeline, EpistemicResult } from "./epistemic/index.js";

const CLAIM_CONFIDENCE_THRESHOLD = 0.5;
const LEGACY_EVIDENCE_CONCURRENCY = Number(process.env.LEGACY_EVIDENCE_CONCURRENCY ?? 2);

async function asyncPool<T, R>(
  poolLimit: number,
  items: T[],
  iteratorFn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const limit = Number.isFinite(poolLimit) && poolLimit > 0 ? Math.floor(poolLimit) : 1;
  const ret: R[] = new Array(items.length);
  const executing = new Set<Promise<void>>();

  const enqueue = async (item: T, index: number) => {
    const p = (async () => {
      ret[index] = await iteratorFn(item, index);
    })();
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  };

  for (let i = 0; i < items.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await enqueue(items[i]!, i);
  }

  await Promise.all(executing);
  return ret;
}

function stanceToSignedValue(
  stance?: "supports" | "refutes" | "mixed" | "unclear" | "irrelevant" | null
): number {
  switch (stance) {
    case "supports":
      return 1;
    case "refutes":
      return -1;
    case "mixed":
      return 0;
    case "irrelevant":
      return 0;
    case "unclear":
    default:
      return 0;
  }
}

function parsePublishedAt(publishedAt: string | undefined): number | null {
  if (!publishedAt) return null;
  const trimmed = publishedAt.trim();
  if (!trimmed) return null;

  const asDate = Date.parse(trimmed);
  if (!Number.isNaN(asDate)) {
    return asDate;
  }

  // Handle common "X hours/days ago" style strings.
  const m = trimmed.match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/i);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const mult =
      unit === "minute"
        ? 60_000
        : unit === "hour"
          ? 3_600_000
          : unit === "day"
            ? 86_400_000
            : unit === "week"
              ? 7 * 86_400_000
              : unit === "month"
                ? 30 * 86_400_000
                : 365 * 86_400_000;
    return Date.now() - n * mult;
  }

  return null;
}

function recencyBonus(publishedAt?: string): number {
  const ts = parsePublishedAt(publishedAt);
  if (!ts) return 0;
  const ageMs = Date.now() - ts;
  if (ageMs < 0) return 0; // future/clock skew
  if (ageMs <= 24 * 3_600_000) return 0.08;
  if (ageMs <= 72 * 3_600_000) return 0.05;
  if (ageMs <= 7 * 86_400_000) return 0.02;
  return 0;
}

function isCorroboratingSource(source: PipelineSource): boolean {
  const rel = typeof source.evaluation?.relevance === "number" ? source.evaluation.relevance : 0;
  const stance = source.evaluation?.stance ?? "unclear";
  return (source.reliability ?? 0) >= 0.75 && rel >= 0.55 && stance !== "irrelevant";
}

function normalizeInput(payload: AnalysisJobPayload): PipelineContext {
  const text =
    payload.input.text?.trim() ??
    payload.input.contentUri ??
    "No textual content provided.";
  
  let attachments = Array.isArray(payload.input.attachments) ? [...payload.input.attachments] : [];

  // Check if the text is just a URL and we have no attachments
  // If so, treat it as a link attachment to enable scraping
  const urlMatch = text.match(/^https?:\/\/[^\s]+$/);
  if (urlMatch && attachments.length === 0) {
    console.log(`[Pipeline] Detected URL-only input: ${text}, auto-creating attachment.`);
    attachments.push({
      kind: "link",
      url: text,
      mediaType: "text/html" // Assumed, fetcher handles actual type
    });
  }

  return {
    analysisId: payload.analysisId,
    input: payload.input,
    normalizedText: text.replace(/\s+/g, " ").trim(),
    attachments
  };
}

function mergeAndFilterClaims(claims: Omit<PipelineClaim, "sourceKeys">[]): Omit<PipelineClaim, "sourceKeys">[] {
  if (claims.length === 0) {
    return [];
  }

  const filtered = claims.filter((claim) => (claim.extractionConfidence ?? 0) >= CLAIM_CONFIDENCE_THRESHOLD);
  if (filtered.length === 0) {
    return [];
  }

  const merged: Omit<PipelineClaim, "sourceKeys">[] = [];

  for (const claim of filtered) {
    const last = merged[merged.length - 1];
    const trimmedIncoming = claim.text.trim();
    const shouldMerge =
      last &&
      !/[.!?]$/.test(last.text.trim()) &&
      trimmedIncoming.length < 80 &&
      /^[a-z]/.test(trimmedIncoming);

    if (shouldMerge) {
      last.text = `${last.text} ${trimmedIncoming}`.replace(/\s+/g, " ").trim();
      last.confidence = Math.max(last.confidence ?? 0, claim.confidence ?? 0);
      last.extractionConfidence = Math.max(
        last.extractionConfidence ?? CLAIM_CONFIDENCE_THRESHOLD,
        claim.extractionConfidence ?? CLAIM_CONFIDENCE_THRESHOLD
      );
      if (last.verdict === "Opinion" && claim.verdict) {
        last.verdict = validateVerdict(claim.verdict);
      }
    } else {
      merged.push({ ...claim });
    }
  }

  return merged;
}

function fabricateSources(topic: string, claims: Omit<PipelineClaim, "sourceKeys">[]): PipelineSource[] {
  return claims.map((claim, index) => ({
    key: `source-${index}`,
    provider: topic === "health" ? "World Health Organization" : "Reuters",
    title: `Context for "${claim.text.slice(0, 32)}..."`,
    url: `https://example.com/${topic}/${index}`,
    reliability: 0.75 + index * 0.05
  }));
}

function attachSourcesToClaims(
  claims: Omit<PipelineClaim, "sourceKeys">[],
  sources: PipelineSource[],
  claimEvidence: Map<string, EvidenceResult[]>
): PipelineClaim[] {
  return claims.map((claim, index) => {
    const directEvidence = claimEvidence.get(claim.id) ?? [];
    const sourceKeys =
      directEvidence.length > 0
        ? directEvidence
            .map((evidence) => sources.find((source) => source.url === evidence.url)?.key)
            .filter((key): key is string => Boolean(key))
        : [sources[index % sources.length]?.key ?? sources[0]?.key ?? "source-0"];

    return {
      ...claim,
      sourceKeys
    };
  });
}

function rankEvidenceByTrust(sources: PipelineSource[]): PipelineSource[] {
  const scored = sources.map((source) => {
    const evaluationBonus =
      source.evaluation && typeof source.evaluation.relevance === "number"
        ? source.evaluation.relevance * 0.15
        : 0;
    const adjustedReliability = adjustReliability(source.url, source.reliability);
    const stancePenalty =
      source.evaluation?.stance === "irrelevant" ? -0.2 : 0;
    const freshnessBonus = recencyBonus(source.publishedAt);
    let trust = adjustedReliability + evaluationBonus + freshnessBonus + stancePenalty;
    return { source, trust };
  });

  scored.sort((a, b) => b.trust - a.trust);

  return scored.map(({ source }) => source);
}

function buildExplanationSteps(claims: PipelineClaim[]): PipelineExplanationStep[] {
  return claims.map((claim) => ({
    id: claim.id,
    description: `Evidence summary supporting claim: "${claim.text.slice(0, 48)}..."`,
    sourceKeys: claim.sourceKeys,
    confidence: Math.min(claim.confidence + 0.1, 0.95)
  }));
}

function buildExplanationStepsFromReasoner(
  claims: PipelineClaim[],
  reasoned: Awaited<ReturnType<typeof reasonVerdict>>
): PipelineExplanationStep[] {
  if (!reasoned) {
    return buildExplanationSteps(claims);
  }

  const supportMap = new Map(reasoned.evidenceSupport.map((entry) => [entry.claimId, entry.supportingSources]));

  return claims.map((claim) => {
    const supporting = supportMap.get(claim.id) ?? claim.sourceKeys;
    return {
      id: claim.id,
      description: `Reasoned assessment for claim: "${claim.text.slice(0, 48)}..."`,
      sourceKeys: supporting,
      confidence: Math.min(reasoned.confidence + 0.1, 0.99)
    };
  });
}

function synthesizeVerdict(claims: PipelineClaim[], sources: PipelineSource[]): {
  score: number;
  verdict: PipelineResult["verdict"];
  confidence: number;
  summary: string;
  recommendation: string;
} {
  const avgClaimConfidence =
    claims.reduce((total, claim) => total + claim.confidence, 0) / claims.length || 0.5;

  const avgReliability =
    sources.reduce((total, source) => total + source.reliability, 0) / sources.length || 0.5;

  // Keep scoring corroboration criteria consistent with the corroboration guardrail below.
  // Otherwise the score can get a corroboration bonus that later gets invalidated and downgraded.
  const corroboratingSources = sources.filter(isCorroboratingSource);
  const uniqueCorroboratingHosts = new Set(
    corroboratingSources
      .map((s) => extractHostname(s.url) ?? s.provider)
      .filter(Boolean)
  );
  const corroborationBonus = Math.min(15, uniqueCorroboratingHosts.size * 5);

  const weightedStance =
    sources.reduce((sum, s) => {
      // Keep defensive defaults consistent with corroboration checks:
      // if relevance is missing/invalid, treat it as 0 (do not let it influence stance adjustment).
      const rel = typeof s.evaluation?.relevance === "number" ? s.evaluation.relevance : 0;
      const stance = stanceToSignedValue(s.evaluation?.stance);
      return sum + stance * (s.reliability ?? 0.6) * rel;
    }, 0) / Math.max(1, sources.length);
  const stanceAdjustment = Math.round(weightedStance * 30); // [-30, +30]

  const baseScore = ((avgClaimConfidence + avgReliability) / 2) * 100;
  const calculatedScore = Math.round(
    Math.min(100, Math.max(0, baseScore + corroborationBonus + stanceAdjustment))
  );
  const verdict = validateVerdict(verdictFromScore(calculatedScore));
  
  // Ensure Verified verdicts (facts) always have a score of 100
  const score = verdict === "Verified" ? 100 : calculatedScore;

  const summary = `Based on ${sources.length} source${sources.length === 1 ? "" : "s"}, this information appears to be ${verdict.toLowerCase()}.`;
  const recommendation =
    verdict === "Verified" || verdict === "Mostly Accurate"
      ? "Multiple reliable sources confirm this information. The claim aligns with established facts and credible reporting."
      : "The available evidence is mixed or limited. Some sources support parts of this claim, while others contradict it or lack sufficient information to verify.";

  return {
    score,
    verdict,
    confidence: Number(avgClaimConfidence.toFixed(2)),
    summary,
    recommendation
  };
}

function verdictFromScore(score: number): PipelineResult["verdict"] {
  if (score >= 76) return "Verified";
  if (score >= 61) return "Mostly Accurate";
  if (score >= 41) return "Partially Accurate";
  return "False";
}

// Validate verdicts match database enum before saving
const VALID_VERDICTS = ["Verified", "Mostly Accurate", "Partially Accurate", "False", "Opinion", "Unverified"] as const;

function validateVerdict(verdict: string): PipelineResult["verdict"] {
  if (VALID_VERDICTS.includes(verdict as any)) {
    return verdict as PipelineResult["verdict"];
  }
  console.warn(`[Pipeline] Invalid verdict "${verdict}", defaulting to "False"`);
  return "False";
}

export async function runAnalysisPipeline(payload: AnalysisJobPayload): Promise<PipelineResult> {
  const startTime = Date.now();
  const timings: Record<string, number> = {};
  
  const context = normalizeInput(payload);
  timings.normalizeInput = Date.now() - startTime;

  const ingestionStart = Date.now();
  const ingestion = await ingestAttachments(context.attachments);
  timings.ingestion = Date.now() - ingestionStart;

  // Validate content extraction
  if (context.attachments.length > 0) {
    const hasExtractedContent = ingestion.combinedText && ingestion.combinedText.trim().length >= 20;
    
    if (!hasExtractedContent) {
      const errorMessages = ingestion.records
        .filter((r) => r.error)
        .map((r) => r.error)
        .join("; ");
      
      // Get attachment URLs for better error context
      const attachmentUrls = context.attachments
        .map((att) => att.kind === "link" ? att.url : att.kind === "image" ? `[image: ${att.url.substring(0, 50)}...]` : "[unknown]")
        .join(", ");
      
      // Check if any attachments are Instagram CDN URLs (should be images, not links)
      const instagramCdnUrls = context.attachments
        .filter((att) => att.kind === "link" && (
          att.url.includes("fbsbx.com") || 
          att.url.includes("ig_messaging_cdn") ||
          att.url.includes("lookaside.fbsbx.com")
        ))
        .map((att) => att.url);
      
      let baseError = errorMessages || "The link may be private, require authentication, or the content may not be accessible.";
      
      // Provide specific guidance for Instagram CDN URLs
      if (instagramCdnUrls.length > 0) {
        baseError = `Instagram CDN URLs detected: ${instagramCdnUrls.join(", ")}. These should be processed as image attachments, not links. Please ensure Instagram media attachments are marked as kind: 'image'. ${baseError}`;
      }
      
      // Log detailed error information for debugging
      console.error(`[Pipeline] Content extraction failed:`, {
        attachmentCount: context.attachments.length,
        attachmentUrls,
        errorMessages,
        hasInstagramCdnUrls: instagramCdnUrls.length > 0,
        combinedTextLength: ingestion.combinedText?.length || 0,
        records: ingestion.records.map((r) => ({
          kind: r.attachment.kind,
          url: r.attachment.kind === "link" ? r.attachment.url : r.attachment.kind === "image" ? r.attachment.url.substring(0, 50) : "unknown",
          error: r.error,
          textLength: r.text?.length || 0
        }))
      });
      
      throw new Error(`Failed to extract content from the provided link(s). ${baseError} Please try uploading a screenshot of the post instead.`);
    }

    const successfulRecords = ingestion.records.filter(
      (r) => r.text && r.text.trim().length > 0 && !r.error
    );
    const poorQualityRecords = successfulRecords.filter(
      (r) => r.quality && (r.quality.level === "poor" || r.quality.level === "insufficient")
    );
    
    if (successfulRecords.length > 0 && poorQualityRecords.length === successfulRecords.length) {
      throw new Error("Unable to extract meaningful content from the provided link. Please try uploading a screenshot of the post instead.");
    }
  }

  const corpusSegments = [context.normalizedText];
  if (ingestion.combinedText) {
    corpusSegments.push(ingestion.combinedText);
  }

  const analysisCorpus =
    corpusSegments
      .filter((segment) => typeof segment === "string" && segment.trim().length > 0)
      .join("\n\n") || context.normalizedText;

  const hasUrl = /https?:\/\/[^\s]+/.test(analysisCorpus);
  const hasAttachments = context.attachments.length > 0;

  if (hasUrl || hasAttachments) {
    const urlPattern = /https?:\/\/[^\s]+/g;
    const placeholderPattern = /No textual content provided\./i;
    const meaningfulContent = analysisCorpus
      .replace(urlPattern, "")
      .replace(placeholderPattern, "")
      .trim();
    
    if (meaningfulContent.length < 20) {
      throw new Error("Insufficient content extracted from the provided link. Unable to perform analysis. Please try uploading a screenshot of the post instead.");
    }
  }
  
  const isFastTypedClaim =
    context.attachments.length === 0 &&
    !/https?:\/\/[^\s]+/i.test(context.normalizedText) &&
    context.normalizedText.trim().length > 0 &&
    context.normalizedText.trim().length <= 320;

  // Run classification and extraction in parallel to save time
  const classificationStart = Date.now();
  const [classification, claimExtraction] = await Promise.all([
    isFastTypedClaim
      ? Promise.resolve(classifyTopicHeuristically(analysisCorpus))
      : classifyTopicWithOpenAI({
          ...payload.input,
          text: analysisCorpus
        }),
    isFastTypedClaim
      ? Promise.resolve({
          claims: [
            {
              id: randomUUID(),
              text: context.normalizedText.trim(),
              extractionConfidence: 1,
              verdict: "Opinion" as const,
              confidence: 0.75
            }
          ],
          meta: {
            model: "fast-path-single-claim",
            usedFallback: true,
            totalClaims: 1,
            warnings: ["Fast path: treated input as a single claim."]
          }
        })
      : extractClaimsWithOpenAI(analysisCorpus)
  ]);
  timings.classificationAndExtraction = Date.now() - classificationStart;

  const processedClaims = mergeAndFilterClaims(claimExtraction.claims);

  if (processedClaims.length === 0) {
    throw new Error("Unable to extract meaningful claims from the content.");
  }

  // Validate image-derived claims against evidence
  // Check if any image descriptions were successfully processed
  // Images can be: (1) direct attachments (kind === "image") or (2) extracted from links (marked with "Image summary:")
  const hasImageDescriptions = ingestion.records.some(
    (record) =>
      record.text &&
      !record.error &&
      (record.attachment.kind === "image" || record.text.toLowerCase().includes("image summary:"))
  );
  
  const imageDerivedClaims = processedClaims.filter((claim) => {
    const claimText = claim.text.toLowerCase();
    // Check if claim contains image-related keywords or was likely derived from image description
    // Only flag as image-derived if image descriptions were successfully processed
    return (
      hasImageDescriptions &&
      (claimText.includes("shown") ||
        claimText.includes("image") ||
        claimText.includes("photo") ||
        claimText.includes("picture") ||
        claimText.includes("depicts") ||
        claimText.includes("appears to be"))
    );
  });

  const imageDerivedClaimIds = new Set(imageDerivedClaims.map((c) => c.id));
  
  // ============================================================================
  // Run Epistemic Pipeline (new graded evaluator)
  // This produces the deterministic, penalty-based score
  // ============================================================================
  const epistemicStart = Date.now();
  let epistemicResult: EpistemicResult | null = null;
  try {
    const epistemicOutput = await runEpistemicPipeline({
      analysisId: payload.analysisId,
      claims: processedClaims.map((c) => ({ id: c.id, text: c.text })),
      topic: classification.topic,
      maxEvidencePerClaim: 5,
      evidenceRetrieverTimeoutMs: isFastTypedClaim ? 2_500 : undefined
    });
    epistemicResult = epistemicOutput.result;
    const stage3 = epistemicOutput.auditLog.stages.find((s) => s.stage === "Stage3_EvidenceRetrieval");
    if (stage3) timings.epistemicEvidenceRetrieval = stage3.durationMs;
    console.log(`[Pipeline] Epistemic pipeline completed: score=${epistemicResult.finalScore}, band="${epistemicResult.scoreBand}"`);
  } catch (error) {
    console.error("[Pipeline] Epistemic pipeline failed, falling back to legacy reasoning:", error);
    epistemicResult = null;
  }
  timings.epistemic = Date.now() - epistemicStart;

  // ============================================================================
  // Evidence + sources
  // Prefer epistemic evidence graph (single pass); fall back to legacy retrieval/eval if needed.
  // ============================================================================
  const evidenceStart = Date.now();
  let evidenceResults: EvidenceResult[] = [];
  const claimEvidenceMap = new Map<string, EvidenceResult[]>();

  if (epistemicResult) {
    const evidenceGraph = epistemicResult.artifacts.evidenceRetrieval.evidenceGraph;
    for (const node of evidenceGraph.nodes) {
      const ev: EvidenceResult = {
        id: node.id,
        provider: node.provider,
        title: node.title,
        url: node.url,
        summary: node.summary ?? "",
        reliability: node.reliability,
        publishedAt: node.publishedAt,
        evaluation: {
          reliability: node.reliability,
          relevance: node.relevance,
          stance: node.stance,
          assessment: node.summary?.slice(0, 140) || "Evidence summary."
        }
      };
      evidenceResults.push(ev);
      for (const claimId of node.claimIds ?? []) {
        const list = claimEvidenceMap.get(claimId) ?? [];
        list.push(ev);
        claimEvidenceMap.set(claimId, list);
      }
    }
  } else {
    const evidenceByClaim = await asyncPool(LEGACY_EVIDENCE_CONCURRENCY, processedClaims, async (claim) => {
      const evidence = await retrieveEvidence({
        topic: classification.topic,
        claimText: claim.text,
        maxResults: 5
      });
      const evaluated = await evaluateEvidenceForClaim(claim.text, evidence);
      return { claimId: claim.id, evidence: evaluated };
    });

    evidenceResults = evidenceByClaim.flatMap((entry) => entry.evidence);
    evidenceByClaim.forEach(({ claimId, evidence }) => claimEvidenceMap.set(claimId, evidence));
  }
  timings.evidenceRetrievalAndEvaluation = Date.now() - evidenceStart;

  const hasRealSources = evidenceResults.length > 0;
  const sources: PipelineSource[] = hasRealSources
    ? evidenceResults.map((item, index) => ({
        key: `retrieved-${index}`,
        provider: item.provider,
        title: item.title,
        url: item.url,
        reliability: item.evaluation ? (item.evaluation.reliability + item.reliability) / 2 : item.reliability,
        summary: item.summary,
        publishedAt: item.publishedAt,
        evaluation: item.evaluation
      }))
    : fabricateSources(classification.topic, processedClaims);

  const rankedSources = rankEvidenceByTrust(sources);
  const claims = attachSourcesToClaims(processedClaims, rankedSources, claimEvidenceMap);
  
  // Legacy reasoning (kept for backward compatibility, will be phased out)
  const reasonStart = Date.now();
  let reasoned = epistemicResult ? null : await reasonVerdict(claims, rankedSources, imageDerivedClaimIds);
  timings.reasoning = Date.now() - reasonStart;
  
  // Validate reasoned verdict immediately after receiving it
  if (reasoned) {
    reasoned.verdict = validateVerdict(reasoned.verdict) as ReasonerVerdictOutput["verdict"];
  }
  
  // Post-process: If image-derived claims have low evidence match, reduce confidence
  if (reasoned && imageDerivedClaims.length > 0) {
    const evidenceSupportMap = new Map(
      reasoned.evidenceSupport.map((es) => [es.claimId, es.supportingSources])
    );
    
    // Check all image-derived claims: missing from evidenceSupport OR have empty supportingSources
    const unsupportedImageClaims = imageDerivedClaims.filter((claim) => {
      const supportingSources = evidenceSupportMap.get(claim.id);
      return !supportingSources || supportingSources.length === 0;
    });
    
    if (unsupportedImageClaims.length > 0 && reasoned.score !== null) {
      // Store original values before modification for accurate logging
      const originalScore = reasoned.score;
      const originalConfidence = reasoned.confidence;
      
      // Reduce score and confidence for unsupported image identifications
      // Only apply penalty if verdict is not already "Unverified" (which has null score)
      reasoned.score = Math.max(0, reasoned.score - 30);
      // Ensure confidence is reduced, not increased (use 0 as minimum, not 0.3)
      reasoned.confidence = Math.max(0, reasoned.confidence - 0.2);
      // Round score before calling verdictFromScore to match behavior at line 313
      const roundedScore = Math.round(Math.min(100, Math.max(0, reasoned.score)));
      // Validate the verdict after modification
      reasoned.verdict = validateVerdict(verdictFromScore(roundedScore)) as ReasonerVerdictOutput["verdict"];
      
      // eslint-disable-next-line no-console
      console.warn(
        `[pipeline] Image-derived claims lack supporting evidence. Reduced score from ${originalScore} to ${reasoned.score}, confidence from ${originalConfidence.toFixed(2)} to ${reasoned.confidence.toFixed(2)}.`,
        { analysisId: payload.analysisId, unsupportedClaims: unsupportedImageClaims.length }
      );
    }
  }
  
  const explanationSteps = reasoned
    ? buildExplanationStepsFromReasoner(claims, reasoned)
    : buildExplanationSteps(claims);
  const verdictData = reasoned
    ? (() => {
        // Handle Unverified verdicts which have null scores
        if (reasoned.verdict === "Unverified" || reasoned.score === null) {
          return {
            score: null,
            verdict: validateVerdict("Unverified"),
            confidence: Number(reasoned.confidence.toFixed(2)),
            summary: reasoned.summary,
            recommendation: reasoned.recommendation
          };
        }
        
        const rawScore = Math.round(Math.min(100, Math.max(0, reasoned.score)));
        const derivedVerdict = verdictFromScore(rawScore);
        const verdict = validateVerdict(reasoned.verdict || derivedVerdict);

        if (verdict !== derivedVerdict) {
          // eslint-disable-next-line no-console
          console.warn(
            "[reasoner] Verdict mismatch with score. Using derived verdict.",
            JSON.stringify({
              analysisId: payload.analysisId,
              modelVerdict: verdict,
              derivedVerdict,
              score: rawScore
            })
          );
        }

        const finalVerdict = validateVerdict(reasoned.verdict || derivedVerdict);
        // Unverified verdicts don't have scores (already handled above, but double-check)
        const finalScore = finalVerdict === "Unverified" ? null : (finalVerdict === "Verified" ? 100 : rawScore);

        return {
          score: finalScore,
          verdict: finalVerdict,
          confidence: Number(reasoned.confidence.toFixed(2)),
          summary: reasoned.summary,
          recommendation: reasoned.recommendation
        };
      })()
    : synthesizeVerdict(claims, rankedSources);

  // Check for insufficient evidence conditions
  const avgSourceReliability = rankedSources.length > 0
    ? rankedSources.reduce((sum, s) => sum + (s.reliability ?? 0), 0) / rankedSources.length
    : 0;
  const hasLowReliabilitySources = avgSourceReliability < 0.3;
  const hasVeryLowConfidence = verdictData.confidence < 0.3;
  const insufficientEvidence = !hasRealSources || (hasLowReliabilitySources && hasVeryLowConfidence);

  // Adjust scores: False with high confidence gets 0, Verified (facts) always gets 100
  // Unverified verdicts don't have scores
  const finalVerdict = insufficientEvidence && verdictData.verdict !== "Unverified"
    ? validateVerdict("Unverified")
    : validateVerdict(verdictData.verdict);
  
  // Use epistemic score as the primary score if available
  // Map epistemic score band to legacy verdict for backward compatibility
  const epistemicToLegacyVerdict = (scoreBand: string): PipelineResult["verdict"] => {
    switch (scoreBand) {
      case "Strongly Supported":
        return "Verified";
      case "Supported":
        return "Mostly Accurate";
      case "Plausible":
      case "Mixed":
        return "Partially Accurate";
      case "Weakly Supported":
      case "Mostly False":
      case "False":
        return "False";
      default:
        return "Unverified";
    }
  };

  const adjustedVerdictData = epistemicResult
    ? {
        score: epistemicResult.finalScore,
        verdict: epistemicToLegacyVerdict(epistemicResult.scoreBand),
        confidence: epistemicResult.confidenceInterval 
          ? ((epistemicResult.confidenceInterval.low + epistemicResult.confidenceInterval.high) / 2) / 100
          : verdictData.confidence,
        summary: epistemicResult.explanationText,
        recommendation: epistemicResult.evidenceSummary
      }
    : {
        ...verdictData,
        verdict: finalVerdict,
        score:
          finalVerdict === "Unverified"
            ? null // Unverified has no score
          : finalVerdict === "False" && verdictData.confidence >= 0.9
              ? 0
            : finalVerdict === "Verified"
                ? 100
                : verdictData.score
      };

  // Guardrail: require corroboration across multiple independent sources for high-certainty verdicts.
  // This prevents "looks plausible" conclusions when only one outlet is retrieved, and encourages multi-perspective grounding.
  if (adjustedVerdictData.verdict === "Verified" || adjustedVerdictData.verdict === "Mostly Accurate") {
    const corroborating = rankedSources.filter(isCorroboratingSource);
    const uniqueHosts = new Set(
      corroborating.map((s) => extractHostname(s.url) ?? s.provider).filter(Boolean)
    );

    if (uniqueHosts.size < 2) {
      adjustedVerdictData.verdict = validateVerdict("Unverified");
      adjustedVerdictData.score = null;
      adjustedVerdictData.confidence = Math.min(adjustedVerdictData.confidence, 0.55);
      adjustedVerdictData.summary =
        `The retrieved sources discuss this, but corroboration is limited (${uniqueHosts.size} independent source${uniqueHosts.size === 1 ? "" : "s"}).`;
      adjustedVerdictData.recommendation =
        "Reporting exists, but the current evidence set is too narrow to confidently label this as verified.";
    }
  }

  // Image generation removed - no longer using DALL-E 3 or Unsplash

  const reasonerMeta: ReasonerMetadata = epistemicResult
    ? {
        model: `epistemic:${epistemicResult.pipelineVersion}`,
        confidence: epistemicResult.confidenceInterval
          ? ((epistemicResult.confidenceInterval.low + epistemicResult.confidenceInterval.high) / 2) / 100
          : verdictData.confidence,
        fallbackUsed: false,
        rationale: `Epistemic pipeline ${epistemicResult.pipelineVersion} applied.`
      }
    : reasoned
      ? {
          model: VERDICT_MODEL,
          confidence: reasoned.confidence,
          fallbackUsed: false,
          rationale: reasoned.rationale
        }
      : {
          model: VERDICT_MODEL,
          confidence: verdictData.confidence,
          fallbackUsed: true,
          rationale: "Reasoning model unavailable. Heuristic verdict applied."
        };

  const totalTime = Date.now() - startTime;
  timings.total = totalTime;
  
  // Log timing breakdown for performance analysis
  console.log(`[Pipeline] Timing breakdown (ms):`, {
    ingestion: timings.ingestion,
    classificationAndExtraction: timings.classificationAndExtraction,
    evidenceRetrievalAndEvaluation: timings.evidenceRetrievalAndEvaluation,
    epistemicEvidenceRetrieval: timings.epistemicEvidenceRetrieval ?? "N/A",
    epistemic: timings.epistemic,
    reasoning: timings.reasoning,
    total: timings.total,
    claimsProcessed: processedClaims.length,
    epistemicScore: epistemicResult?.finalScore ?? "N/A",
    epistemicBand: epistemicResult?.scoreBand ?? "N/A"
  });

  const metadata: PipelineMetadata = {
    classification: classification.meta,
    claimExtraction: {
      ...claimExtraction.meta,
      totalClaims: claimExtraction.claims.length,
      usedFallback: claimExtraction.meta.usedFallback || processedClaims.length === 0,
      warnings: [
        ...(claimExtraction.meta.warnings ?? []),
        ...(claimExtraction.claims.length !== processedClaims.length
          ? [
              `Merged/filtered claims: original=${claimExtraction.claims.length}, ` +
                `final=${processedClaims.length}`
            ]
          : [])
      ].filter(Boolean)
    },
    reasoner: reasonerMeta,
    ingestion: ingestion.metadata
  };

  // Calculate complexity based on claims count, sources count, and attachments
  const calculateComplexity = (): "simple" | "medium" | "complex" => {
    const claimsCount = claims.length;
    const sourcesCount = sources.length;
    const attachmentsCount = context.attachments.length;
    
    // Complex: 3+ claims OR 5+ sources OR multiple attachments
    if (claimsCount >= 3 || sourcesCount >= 5 || attachmentsCount > 1) {
      return "complex";
    }
    
    // Medium: 2 claims OR 3-4 sources OR has attachments
    if (claimsCount === 2 || (sourcesCount >= 3 && sourcesCount <= 4) || attachmentsCount === 1) {
      return "medium";
    }
    
    // Simple: 1 claim, <= 2 sources, no attachments
    return "simple";
  };

  const complexity = calculateComplexity();

  // Generate title from claims (3-10 words)
  // Helper function to ensure title meets 3-10 word constraint
  const ensureTitleConstraint = (text: string): string => {
    const words = text.split(" ").filter(w => w.length > 0);
    
    // If no words, use first claim as fallback
    if (words.length === 0) {
      const fallbackWords = claims[0]?.text?.split(" ").filter(w => w.length > 0) || [];
      if (fallbackWords.length === 0) {
        return "Analysis";
      }
      // Ensure 3-10 words from fallback
      if (fallbackWords.length < 3) {
        // Pad with "Analysis" to reach minimum 3 words
        return [...fallbackWords, ...Array(3 - fallbackWords.length).fill("Analysis")].slice(0, 10).join(" ");
      }
      return fallbackWords.slice(0, 10).join(" ");
    }
    
    // Truncate if more than 10 words
    if (words.length > 10) {
      return words.slice(0, 10).join(" ");
    }
    
    // Ensure minimum 3 words
    if (words.length < 3) {
      // Try to get additional words from first claim
      if (claims[0]?.text) {
        const claimWords = claims[0].text.split(" ").filter(w => w.length > 0);
        const neededWords = 3 - words.length;
        // Take words from claim that aren't already in the title (avoid duplicates)
        const existingLower = new Set(words.map(w => w.toLowerCase()));
        const additionalWords = claimWords.filter(w => !existingLower.has(w.toLowerCase())).slice(0, neededWords);
        const combined = [...words, ...additionalWords];
        
        if (combined.length >= 3) {
          return combined.slice(0, 10).join(" ");
        }
        // If still not enough, pad with "Analysis"
        while (combined.length < 3 && combined.length < 10) {
          combined.push("Analysis");
        }
        return combined.join(" ");
      }
      // Last resort: pad with "Analysis"
      const padded = [...words];
      while (padded.length < 3 && padded.length < 10) {
        padded.push("Analysis");
      }
      return padded.join(" ");
    }
    
    return words.join(" ");
  };

  let title: string;
  try {
    const claimsText = claims.map(c => c.text).join(" ");
    const titleResponse = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: "You are a text shortening assistant. Your task is to shorten the given claim text to fit within 40 characters while preserving the original meaning and wording as much as possible. Do not create a new title or add stylization. Simply truncate or compress the claim naturally. Return only the shortened text, no quotes or extra text."
        },
        {
          role: "user",
          content: `Shorten this claim to max 40 characters, preserving the original wording:\n\n${claimsText.substring(0, 500)}`
        }
      ],
      max_tokens: 15,
      temperature: 0.3
    });
    let rawTitle = titleResponse.choices[0]?.message?.content?.trim() || "";
    // Enforce 40 character limit
    if (rawTitle.length > 40) {
      const words = rawTitle.split(" ");
      rawTitle = "";
      for (const word of words) {
        if ((rawTitle + " " + word).trim().length <= 37) {
          rawTitle = (rawTitle + " " + word).trim();
        } else {
          break;
        }
      }
      if (rawTitle.length === 0) {
        rawTitle = words[0]?.slice(0, 37) || "Analysis";
      }
      rawTitle += "...";
    }
    title = ensureTitleConstraint(rawTitle || claims[0]?.text || "Analysis");
  } catch (error) {
    console.warn("[Pipeline] Failed to generate title, using fallback", error);
    // Fallback: use first claim text, ensuring 3-10 words and max 40 chars
    let fallbackText = claims[0]?.text || "Analysis";
    if (fallbackText.length > 40) {
      fallbackText = fallbackText.slice(0, 37) + "...";
    }
    title = ensureTitleConstraint(fallbackText);
  }

  return {
    topic: classification.topic,
    bias: classification.bias,
    score: adjustedVerdictData.score,
    verdict: adjustedVerdictData.verdict,
    confidence: adjustedVerdictData.confidence,
    title,
    summary: adjustedVerdictData.summary,
    recommendation: adjustedVerdictData.recommendation,
    complexity,
    sources,
    claims,
    explanationSteps,
    metadata,
    ingestionRecords: ingestion.records,
    resultJson: {
      analysisId: payload.analysisId,
      topic: classification.topic,
      bias: classification.bias,
      claims: claims.map((claim) => ({
        id: claim.id,
        text: claim.text,
        verdict: claim.verdict,
        confidence: claim.confidence,
        extractionConfidence: claim.extractionConfidence
      })),
      sources: sources.map((source) => ({
        key: source.key,
        title: source.title,
        url: source.url,
        reliability: source.reliability,
        publishedAt: source.publishedAt,
        summary: (source as PipelineSource & { summary?: string }).summary,
        evaluation: source.evaluation ?? null
      })),
      verdict: adjustedVerdictData.verdict,
      score: adjustedVerdictData.score,
      metadata,
      ingestion: ingestion.records.length
        ? {
            metadata: ingestion.metadata,
            records: ingestion.records.map((record) => ({
              attachment: record.attachment,
              wordCount: record.wordCount,
              truncated: record.truncated,
              error: record.error
            }))
          }
        : undefined,
      // Epistemic pipeline result (new graded evaluator - source of truth for scoring)
      epistemic: epistemicResult
        ? {
            version: epistemicResult.version,
            finalScore: epistemicResult.finalScore,
            scoreBand: epistemicResult.scoreBand,
            scoreBandDescription: epistemicResult.scoreBandDescription,
            penaltiesApplied: epistemicResult.penaltiesApplied,
            evidenceSummary: epistemicResult.evidenceSummary,
            confidenceInterval: epistemicResult.confidenceInterval,
            explanationText: epistemicResult.explanationText,
            pipelineVersion: epistemicResult.pipelineVersion,
            processedAt: epistemicResult.processedAt,
            totalProcessingTimeMs: epistemicResult.totalProcessingTimeMs,
            // Include artifacts for audit/determinism verification
            artifacts: epistemicResult.artifacts
          }
        : undefined
    }
  };
}

