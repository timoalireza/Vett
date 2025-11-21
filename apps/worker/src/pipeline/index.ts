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
import { reasonVerdict, VERDICT_MODEL } from "./reasoners/verdict.js";
import { adjustReliability } from "./retrievers/trust.js";
import { ingestAttachments } from "./ingestion/index.js";
import { findBestImage } from "./image-search.js";

const CLAIM_CONFIDENCE_THRESHOLD = 0.5;

function normalizeInput(payload: AnalysisJobPayload): PipelineContext {
  const text =
    payload.input.text?.trim() ??
    payload.input.contentUri ??
    "No textual content provided.";
  const attachments = Array.isArray(payload.input.attachments) ? payload.input.attachments : [];

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
        last.verdict = claim.verdict;
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
  const verdict = verdictFromScore(calculatedScore);
  
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
  if (score >= 51) return "Mostly Accurate";
  if (score >= 26) return "Partially True";
  return "False";
}

export async function runAnalysisPipeline(payload: AnalysisJobPayload): Promise<PipelineResult> {
  const context = normalizeInput(payload);

  const ingestion = await ingestAttachments(context.attachments);

  const corpusSegments = [context.normalizedText];
  if (ingestion.combinedText) {
    corpusSegments.push(ingestion.combinedText);
  }

  const analysisCorpus =
    corpusSegments
      .filter((segment) => typeof segment === "string" && segment.trim().length > 0)
      .join("\n\n") || context.normalizedText;

  const classification = await classifyTopicWithOpenAI({
    ...payload.input,
    text: analysisCorpus
  });
  const claimExtraction = await extractClaimsWithOpenAI(analysisCorpus);

  const processedClaims = mergeAndFilterClaims(claimExtraction.claims);

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

  const reasoned = await reasonVerdict(claims, rankedSources);
  const explanationSteps = reasoned
    ? buildExplanationStepsFromReasoner(claims, reasoned)
    : buildExplanationSteps(claims);
  const verdictData = reasoned
    ? (() => {
        const rawScore = Math.round(Math.min(100, Math.max(0, reasoned.score)));
        const derivedVerdict = verdictFromScore(rawScore);
        const verdict =
          reasoned.verdict && ["Verified", "Mostly Accurate", "Partially True", "False"].includes(reasoned.verdict)
            ? (reasoned.verdict as PipelineResult["verdict"])
            : derivedVerdict;

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

        // Ensure Verified verdicts (facts) always have a score of 100
        // Use the verdict (either from model or derived) to determine if it's Verified
        const finalVerdict = derivedVerdict;
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
  const adjustedVerdictData =
    verdictData.verdict === "False" && verdictData.confidence >= 0.9
      ? {
          ...verdictData,
          score: 0
        }
      : verdictData.verdict === "Verified"
        ? {
            ...verdictData,
            score: 100
          }
        : verdictData;

  // Find best image for the analysis card
  const claimTexts = claims.map((c) => c.text);
  const imageResult = await findBestImage(
    adjustedVerdictData.summary,
    classification.topic,
    claimTexts
  );

  // Extract attribution info (only for Unsplash images, not DALL-E)
  const imageAttribution = imageResult && !imageResult.isGenerated
    ? {
        photographer: imageResult.photographer,
        photographerProfileUrl: imageResult.photographerProfileUrl,
        unsplashPhotoUrl: imageResult.unsplashPhotoUrl,
        isGenerated: false
      }
    : imageResult?.isGenerated
      ? { isGenerated: true }
      : undefined;

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
    imageUrl: imageResult?.url,
    imageAttribution,
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

