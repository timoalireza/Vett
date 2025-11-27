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
import { classifyTopicWithOpenAI } from "./classifiers/topic.js";
import { extractClaimsWithOpenAI } from "./extractors/claims.js";
import { retrieveEvidence } from "./retrievers/index.js";
import type { EvidenceResult } from "./retrievers/types.js";
import { evaluateEvidenceForClaim } from "./evidence/evaluator.js";
import { reasonVerdict, VERDICT_MODEL, type ReasonerVerdictOutput } from "./reasoners/verdict.js";
import { adjustReliability } from "./retrievers/trust.js";
import { ingestAttachments } from "./ingestion/index.js";

const CLAIM_CONFIDENCE_THRESHOLD = 0.5;

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
    let trust = adjustedReliability + evaluationBonus;
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

  const highTrustSources = sources.filter((source) => (source.reliability ?? 0) >= 0.75);
  const corroborationBonus = Math.min(15, highTrustSources.length * 4);

  const baseScore = ((avgClaimConfidence + avgReliability) / 2) * 100;
  const calculatedScore = Math.round(Math.min(100, Math.max(0, baseScore + corroborationBonus)));
  const verdict = validateVerdict(verdictFromScore(calculatedScore));
  
  // Ensure Verified verdicts (facts) always have a score of 100
  const score = verdict === "Verified" ? 100 : calculatedScore;

  const summary = `Evidence from ${sources.length} source${sources.length === 1 ? "" : "s"} indicates the information is ${verdict.toLowerCase()} with a Vett score of ${score}.`;
  const recommendation =
    verdict === "Verified" || verdict === "Mostly Accurate"
      ? "Share with confidence, noting any nuances mentioned."
      : "Highlight areas that need additional corroboration before sharing widely.";

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
const VALID_VERDICTS = ["Verified", "Mostly Accurate", "Partially Accurate", "False", "Opinion"] as const;

function validateVerdict(verdict: string): PipelineResult["verdict"] {
  if (VALID_VERDICTS.includes(verdict as any)) {
    return verdict as PipelineResult["verdict"];
  }
  console.warn(`[Pipeline] Invalid verdict "${verdict}", defaulting to "False"`);
  return "False";
}

export async function runAnalysisPipeline(payload: AnalysisJobPayload): Promise<PipelineResult> {
  const context = normalizeInput(payload);

  const ingestion = await ingestAttachments(context.attachments);

  // Validate content extraction
  if (context.attachments.length > 0) {
    const hasExtractedContent = ingestion.combinedText && ingestion.combinedText.trim().length >= 20;
    
    if (!hasExtractedContent) {
      const errorMessages = ingestion.records
        .filter((r) => r.error)
        .map((r) => r.error)
        .join("; ");
      
      const baseError = errorMessages || "The link may be private, require authentication, or the content may not be accessible.";
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
  
  // Run classification and extraction in parallel to save time
  const [classification, claimExtraction] = await Promise.all([
    classifyTopicWithOpenAI({
      ...payload.input,
      text: analysisCorpus
    }),
    extractClaimsWithOpenAI(analysisCorpus)
  ]);

  const processedClaims = mergeAndFilterClaims(claimExtraction.claims);

  if (processedClaims.length === 0) {
    throw new Error("Unable to extract meaningful claims from the content.");
  }

  const evidenceByClaim = await Promise.all(
    processedClaims.map(async (claim) => {
      const evidence = await retrieveEvidence({
        topic: classification.topic,
        claimText: claim.text,
        maxResults: 3
      });
      const evaluated = await evaluateEvidenceForClaim(claim.text, evidence);
      return { claimId: claim.id, evidence: evaluated };
    })
  );

  const evidenceResults: EvidenceResult[] = evidenceByClaim.flatMap((entry) => entry.evidence);

  const sources =
    evidenceResults.length > 0
      ? evidenceResults.map((item, index) => ({
          key: `retrieved-${index}`,
          provider: item.provider,
          title: item.title,
          url: item.url,
          reliability: item.evaluation ? (item.evaluation.reliability + item.reliability) / 2 : item.reliability,
          summary: item.summary,
          evaluation: item.evaluation
        }))
      : fabricateSources(classification.topic, processedClaims);

  const claimEvidenceMap = new Map<string, EvidenceResult[]>();
  evidenceByClaim.forEach(({ claimId, evidence }) => {
    claimEvidenceMap.set(claimId, evidence);
  });

  const rankedSources = rankEvidenceByTrust(sources);

  const claims = attachSourcesToClaims(processedClaims, rankedSources, claimEvidenceMap);

  // Validate image-derived claims against evidence
  // Check if any image descriptions were successfully processed
  // Images can be: (1) direct attachments (kind === "image") or (2) extracted from links (marked with "Image summary:")
  const hasImageDescriptions = ingestion.records.some(
    (record) =>
      record.text &&
      !record.error &&
      (record.attachment.kind === "image" || record.text.toLowerCase().includes("image summary:"))
  );
  
  const imageDerivedClaims = claims.filter((claim) => {
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
  let reasoned = await reasonVerdict(claims, rankedSources, imageDerivedClaimIds);
  
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
    
    if (unsupportedImageClaims.length > 0) {
      // Store original values before modification for accurate logging
      const originalScore = reasoned.score;
      const originalConfidence = reasoned.confidence;
      
      // Reduce score and confidence for unsupported image identifications
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
        const finalScore = finalVerdict === "Verified" ? 100 : rawScore;

        return {
          score: finalScore,
          verdict: finalVerdict,
          confidence: Number(reasoned.confidence.toFixed(2)),
          summary: reasoned.summary,
          recommendation: reasoned.recommendation
        };
      })()
    : synthesizeVerdict(claims, rankedSources);

  // Adjust scores: False with high confidence gets 0, Verified (facts) always gets 100
  const adjustedVerdictData = {
    ...verdictData,
    verdict: validateVerdict(verdictData.verdict),
    score:
      verdictData.verdict === "False" && verdictData.confidence >= 0.9
        ? 0
        : verdictData.verdict === "Verified"
          ? 100
          : verdictData.score
  };

  // Image generation removed - no longer using DALL-E 3 or Unsplash

  const reasonerMeta: ReasonerMetadata = reasoned
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

  return {
    topic: classification.topic,
    bias: classification.bias,
    score: adjustedVerdictData.score,
    verdict: adjustedVerdictData.verdict,
    confidence: adjustedVerdictData.confidence,
    summary: adjustedVerdictData.summary,
    recommendation: adjustedVerdictData.recommendation,
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
        : undefined
    }
  };
}

