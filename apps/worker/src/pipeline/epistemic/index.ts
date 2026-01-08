/**
 * Epistemic Claim Analysis Pipeline
 * 
 * A graded epistemic evaluator that produces:
 * - Stable 0-100 confidence scores
 * - Mandatory score bands
 * - Auditable penalty ledgers
 * - Deterministic re-evaluation
 * 
 * The pipeline consists of 6 explicit stages:
 * 1. Claim Parsing - Extract structured components
 * 2. Claim Typing - Classify claim types
 * 3. Evidence Retrieval - Build evidence graph
 * 4. Failure Mode Detection - Identify penalties
 * 5. Scoring - Apply mechanical scoring
 * 6. Explanation - Generate human-readable output
 */

import {
  EpistemicResult,
  EpistemicArtifacts,
  EpistemicAuditLog,
  StageLog,
  PenaltySeverity,
  computeContentHash,
  EPISTEMIC_PIPELINE_VERSION
} from "./types.js";
import { parseClaimsForEpistemic, ClaimParsingInput } from "./stage1_claimParsing.js";
import { typeClaimsForEpistemic } from "./stage2_claimTyping.js";
import { retrieveEvidenceForEpistemic } from "./stage3_evidenceRetrieval.js";
import { detectFailureModes } from "./stage4_failureModes.js";
import { computeEpistemicScore } from "./stage5_scoring.js";
import { generateEpistemicExplanation } from "./stage6_explanation.js";

export * from "./types.js";
export { parseClaimsForEpistemic } from "./stage1_claimParsing.js";
export { typeClaimsForEpistemic } from "./stage2_claimTyping.js";
export { retrieveEvidenceForEpistemic } from "./stage3_evidenceRetrieval.js";
export { detectFailureModes } from "./stage4_failureModes.js";
export { computeEpistemicScore } from "./stage5_scoring.js";
export { generateEpistemicExplanation } from "./stage6_explanation.js";

export interface EpistemicPipelineInput {
  analysisId: string;
  claims: Array<{ id: string; text: string }>;
  topic: string;
  maxEvidencePerClaim?: number;
  /**
   * Optional per-retriever timeout for evidence retrieval (ms).
   * Use this to keep "typed claim" latency low.
   */
  evidenceRetrieverTimeoutMs?: number;
}

export interface EpistemicPipelineOutput {
  result: EpistemicResult;
  auditLog: EpistemicAuditLog;
}

function createStageLog(
  stage: string,
  startTime: number,
  durationMs: number,
  inputHash: string,
  outputHash: string,
  success: boolean,
  error?: string
): StageLog {
  return {
    stage,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date(startTime + durationMs).toISOString(),
    durationMs,
    inputHash,
    outputHash,
    success,
    error
  };
}

/**
 * Run the complete epistemic analysis pipeline
 * 
 * This function orchestrates all 6 stages and produces:
 * - A complete EpistemicResult with score, band, penalties, and explanation
 * - An audit log for determinism verification
 */
export async function runEpistemicPipeline(
  input: EpistemicPipelineInput
): Promise<EpistemicPipelineOutput> {
  const pipelineStartTime = Date.now();
  const stageLogs: StageLog[] = [];

  // Skip if no claims
  if (input.claims.length === 0) {
    const emptyResult: EpistemicResult = {
      version: EPISTEMIC_PIPELINE_VERSION,
      finalScore: 50,
      scoreBand: "Mixed",
      scoreBandDescription: "No claims to analyze",
      penaltiesApplied: [],
      evidenceSummary: "No claims were provided for analysis.",
      explanationText: "Unable to perform epistemic analysis: no claims were extracted from the content.",
      keyReasons: ["No verifiable claims were extracted from the provided content."],
      artifacts: {
        claimParsing: {
          version: EPISTEMIC_PIPELINE_VERSION,
          model: "none",
          timestamp: new Date().toISOString(),
          contentHash: computeContentHash([]),
          claims: []
        },
        claimTyping: {
          version: EPISTEMIC_PIPELINE_VERSION,
          model: "none",
          timestamp: new Date().toISOString(),
          contentHash: computeContentHash([]),
          typedClaims: []
        },
        evidenceRetrieval: {
          version: EPISTEMIC_PIPELINE_VERSION,
          timestamp: new Date().toISOString(),
          contentHash: computeContentHash({ nodes: [], stats: {} }),
          evidenceGraph: {
            nodes: [],
            stats: {
              totalSources: 0,
              uniqueHostnames: 0,
              hostnameDistribution: {},
              singleSourceDominance: false,
              sourceTypeDistribution: {
                empirical: 0,
                model_based: 0,
                meta_analysis: 0,
                institutional_consensus: 0,
                news_report: 0,
                opinion: 0,
                unknown: 0
              },
              averageReliability: 0,
              peerReviewedCount: 0,
              modelBasedCount: 0,
              supportingCount: 0,
              refutingCount: 0
            },
            retrievalTimestamp: new Date().toISOString()
          }
        },
        failureModeDetection: {
          version: EPISTEMIC_PIPELINE_VERSION,
          timestamp: new Date().toISOString(),
          contentHash: computeContentHash({ penalties: [], totalPenaltyWeight: 0 }),
          penalties: [],
          totalPenaltyWeight: 0
        },
        scoring: {
          version: EPISTEMIC_PIPELINE_VERSION,
          timestamp: new Date().toISOString(),
          contentHash: computeContentHash({ finalScore: 50 }),
          result: {
            initialScore: 100,
            penaltiesApplied: [],
            totalPenalties: 0,
            rawScore: 100,
            floorApplied: false,
            ceilingApplied: false,
            finalScore: 50,
            scoreBand: "MIXED",
            scoreBandLabel: "Mixed"
          }
        }
      },
      pipelineVersion: EPISTEMIC_PIPELINE_VERSION,
      processedAt: new Date().toISOString(),
      totalProcessingTimeMs: Date.now() - pipelineStartTime
    };

    return {
      result: emptyResult,
      auditLog: {
        analysisId: input.analysisId,
        pipelineVersion: EPISTEMIC_PIPELINE_VERSION,
        startedAt: new Date(pipelineStartTime).toISOString(),
        completedAt: new Date().toISOString(),
        totalDurationMs: Date.now() - pipelineStartTime,
        stages: [],
        finalScore: 50,
        scoreBand: "Mixed"
      }
    };
  }

  // ============================================================================
  // Stage 1: Claim Parsing
  // ============================================================================
  const stage1StartTime = Date.now();
  const claimParsingInput: ClaimParsingInput = {
    claimTexts: input.claims
  };
  const inputHash1 = computeContentHash(claimParsingInput);

  let claimParsingOutput;
  try {
    claimParsingOutput = await parseClaimsForEpistemic(claimParsingInput);
    stageLogs.push(createStageLog(
      "Stage1_ClaimParsing",
      stage1StartTime,
      claimParsingOutput.durationMs,
      inputHash1,
      claimParsingOutput.artifact.contentHash,
      true
    ));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    stageLogs.push(createStageLog(
      "Stage1_ClaimParsing",
      stage1StartTime,
      Date.now() - stage1StartTime,
      inputHash1,
      "",
      false,
      errorMsg
    ));
    throw new Error(`[EpistemicPipeline] Stage 1 failed: ${errorMsg}`);
  }

  // ============================================================================
  // Stage 2: Claim Typing
  // ============================================================================
  const stage2StartTime = Date.now();
  const inputHash2 = computeContentHash(claimParsingOutput.artifact.claims);

  let claimTypingOutput;
  try {
    claimTypingOutput = await typeClaimsForEpistemic({
      parsedClaims: claimParsingOutput.artifact.claims
    });
    stageLogs.push(createStageLog(
      "Stage2_ClaimTyping",
      stage2StartTime,
      claimTypingOutput.durationMs,
      inputHash2,
      claimTypingOutput.artifact.contentHash,
      true
    ));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    stageLogs.push(createStageLog(
      "Stage2_ClaimTyping",
      stage2StartTime,
      Date.now() - stage2StartTime,
      inputHash2,
      "",
      false,
      errorMsg
    ));
    throw new Error(`[EpistemicPipeline] Stage 2 failed: ${errorMsg}`);
  }

  // Filter out normative claims (flagged but not scored)
  const scorableClaims = claimTypingOutput.artifact.typedClaims.filter((c) => !c.isNormative);

  // ============================================================================
  // Stage 3: Evidence Retrieval
  // ============================================================================
  const stage3StartTime = Date.now();
  const inputHash3 = computeContentHash({ claims: scorableClaims, topic: input.topic });

  let evidenceRetrievalOutput;
  try {
    evidenceRetrievalOutput = await retrieveEvidenceForEpistemic({
      typedClaims: scorableClaims,
      topic: input.topic,
      maxResultsPerClaim: input.maxEvidencePerClaim ?? 5,
      retrieverTimeoutMs: input.evidenceRetrieverTimeoutMs
    });
    stageLogs.push(createStageLog(
      "Stage3_EvidenceRetrieval",
      stage3StartTime,
      evidenceRetrievalOutput.durationMs,
      inputHash3,
      evidenceRetrievalOutput.artifact.contentHash,
      true
    ));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    stageLogs.push(createStageLog(
      "Stage3_EvidenceRetrieval",
      stage3StartTime,
      Date.now() - stage3StartTime,
      inputHash3,
      "",
      false,
      errorMsg
    ));
    throw new Error(`[EpistemicPipeline] Stage 3 failed: ${errorMsg}`);
  }

  // ============================================================================
  // Stage 4: Failure Mode Detection
  // ============================================================================
  const stage4StartTime = Date.now();
  const inputHash4 = computeContentHash({
    claims: scorableClaims,
    evidence: evidenceRetrievalOutput.artifact.evidenceGraph
  });

  let failureModeOutput;
  try {
    failureModeOutput = await detectFailureModes({
      typedClaims: scorableClaims,
      evidenceGraph: evidenceRetrievalOutput.artifact.evidenceGraph
    });
    stageLogs.push(createStageLog(
      "Stage4_FailureModeDetection",
      stage4StartTime,
      failureModeOutput.durationMs,
      inputHash4,
      failureModeOutput.artifact.contentHash,
      true
    ));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    stageLogs.push(createStageLog(
      "Stage4_FailureModeDetection",
      stage4StartTime,
      Date.now() - stage4StartTime,
      inputHash4,
      "",
      false,
      errorMsg
    ));
    throw new Error(`[EpistemicPipeline] Stage 4 failed: ${errorMsg}`);
  }

  // ============================================================================
  // Stage 5: Scoring
  // ============================================================================
  const stage5StartTime = Date.now();
  const inputHash5 = computeContentHash({
    claims: scorableClaims,
    evidence: evidenceRetrievalOutput.artifact.evidenceGraph,
    penalties: failureModeOutput.artifact.penalties
  });

  let scoringOutput;
  try {
    scoringOutput = computeEpistemicScore({
      typedClaims: scorableClaims,
      evidenceGraph: evidenceRetrievalOutput.artifact.evidenceGraph,
      penalties: failureModeOutput.artifact.penalties
    });
    stageLogs.push(createStageLog(
      "Stage5_Scoring",
      stage5StartTime,
      scoringOutput.durationMs,
      inputHash5,
      scoringOutput.artifact.contentHash,
      true
    ));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    stageLogs.push(createStageLog(
      "Stage5_Scoring",
      stage5StartTime,
      Date.now() - stage5StartTime,
      inputHash5,
      "",
      false,
      errorMsg
    ));
    throw new Error(`[EpistemicPipeline] Stage 5 failed: ${errorMsg}`);
  }

  // ============================================================================
  // Stage 6: Explanation Generation
  // ============================================================================
  const stage6StartTime = Date.now();
  const inputHash6 = computeContentHash({
    claims: scorableClaims,
    evidence: evidenceRetrievalOutput.artifact.evidenceGraph,
    scoring: scoringOutput.artifact.result
  });

  let explanationOutput;
  try {
    explanationOutput = generateEpistemicExplanation({
      typedClaims: scorableClaims,
      evidenceGraph: evidenceRetrievalOutput.artifact.evidenceGraph,
      scoringResult: scoringOutput.artifact.result
    });
    stageLogs.push(createStageLog(
      "Stage6_Explanation",
      stage6StartTime,
      explanationOutput.durationMs,
      inputHash6,
      computeContentHash(explanationOutput.explanation),
      true
    ));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    stageLogs.push(createStageLog(
      "Stage6_Explanation",
      stage6StartTime,
      Date.now() - stage6StartTime,
      inputHash6,
      "",
      false,
      errorMsg
    ));
    throw new Error(`[EpistemicPipeline] Stage 6 failed: ${errorMsg}`);
  }

  // ============================================================================
  // Assemble Final Result
  // ============================================================================
  const totalProcessingTimeMs = Date.now() - pipelineStartTime;

  const artifacts: EpistemicArtifacts = {
    claimParsing: claimParsingOutput.artifact,
    claimTyping: claimTypingOutput.artifact,
    evidenceRetrieval: evidenceRetrievalOutput.artifact,
    failureModeDetection: failureModeOutput.artifact,
    scoring: scoringOutput.artifact
  };

  // Compute confidence interval based on evidence quality
  const stats = evidenceRetrievalOutput.artifact.evidenceGraph.stats;
  const confidenceSpread = Math.max(5, Math.round(20 - stats.averageReliability * 15));
  const confidenceInterval = {
    low: Math.max(0, scoringOutput.artifact.result.finalScore - confidenceSpread),
    high: Math.min(100, scoringOutput.artifact.result.finalScore + confidenceSpread)
  };

  const result: EpistemicResult = {
    version: EPISTEMIC_PIPELINE_VERSION,
    finalScore: scoringOutput.artifact.result.finalScore,
    scoreBand: explanationOutput.explanation.scoreBand,
    scoreBandDescription: explanationOutput.explanation.scoreBandDescription,
    penaltiesApplied: failureModeOutput.artifact.penalties.map((p) => ({
      name: p.name,
      weight: p.weight,
      rationale: p.rationale,
      severity: p.severity as PenaltySeverity
    })),
    evidenceSummary: explanationOutput.explanation.evidenceSummary,
    confidenceInterval,
    explanationText: explanationOutput.explanation.explanationText,
    keyReasons: explanationOutput.explanation.keyReasons,
    artifacts,
    pipelineVersion: EPISTEMIC_PIPELINE_VERSION,
    processedAt: new Date().toISOString(),
    totalProcessingTimeMs
  };

  const auditLog: EpistemicAuditLog = {
    analysisId: input.analysisId,
    pipelineVersion: EPISTEMIC_PIPELINE_VERSION,
    startedAt: new Date(pipelineStartTime).toISOString(),
    completedAt: new Date().toISOString(),
    totalDurationMs: totalProcessingTimeMs,
    stages: stageLogs,
    finalScore: result.finalScore,
    scoreBand: result.scoreBand
  };

  console.log(`[EpistemicPipeline] Completed in ${totalProcessingTimeMs}ms. Score: ${result.finalScore} (${result.scoreBand})`);

  return {
    result,
    auditLog
  };
}

