/**
 * Stage 5: Scoring
 * 
 * Mechanical scoring engine:
 * 1. Start at 100
 * 2. Apply cumulative penalties
 * 3. Enforce floor/ceiling safeguards
 * 4. Clamp to 0-100
 * 5. Map to score band
 */

import {
  TypedClaim,
  EvidenceGraph,
  Penalty,
  ScoringResult,
  ScoringArtifact,
  getScoreBand,
  computeContentHash,
  EPISTEMIC_PIPELINE_VERSION
} from "./types.js";

export interface ScoringInput {
  typedClaims: TypedClaim[];
  evidenceGraph: EvidenceGraph;
  penalties: Penalty[];
}

export interface ScoringOutput {
  artifact: ScoringArtifact;
  durationMs: number;
}

// ============================================================================
// Safeguard Checks
// ============================================================================

/**
 * Check if claim has credible peer-reviewed grounding
 * If so, floor rule applies: score >= 20
 */
function checkFloorRule(
  _claims: TypedClaim[],
  evidence: EvidenceGraph
): { applies: boolean; reason?: string } {
  const peerReviewedEvidence = evidence.nodes.filter((n) =>
    n.isPeerReviewed && n.stance === "supports" && n.relevance > 0.5
  );

  if (peerReviewedEvidence.length >= 1) {
    return {
      applies: true,
      reason: `Claim has ${peerReviewedEvidence.length} peer-reviewed supporting source(s), enforcing minimum score of 20.`
    };
  }

  // Also check for institutional consensus support
  const institutionalSupport = evidence.nodes.filter((n) =>
    n.isInstitutional && n.stance === "supports" && n.relevance > 0.6
  );

  if (institutionalSupport.length >= 1) {
    return {
      applies: true,
      reason: `Claim has institutional support from ${institutionalSupport[0].hostname}, enforcing minimum score of 20.`
    };
  }

  return { applies: false };
}

/**
 * Check if claim relies primarily on models
 * If so, ceiling rule applies: score <= 75
 */
function checkCeilingRule(
  claims: TypedClaim[],
  evidence: EvidenceGraph
): { applies: boolean; reason?: string } {
  const stats = evidence.stats;

  // Check if primarily model-based
  const modelRatio = stats.totalSources > 0
    ? stats.modelBasedCount / stats.totalSources
    : 0;

  if (modelRatio > 0.5) {
    return {
      applies: true,
      reason: `${Math.round(modelRatio * 100)}% of evidence is model-based projections, capping score at 75.`
    };
  }

  // Check for predictive claims without empirical validation
  const predictiveClaims = claims.filter((c) => c.primaryType === "predictive");
  if (predictiveClaims.length > 0) {
    const hasEmpiricalValidation = evidence.nodes.some((n) =>
      n.sourceType === "empirical" && n.stance === "supports"
    );

    if (!hasEmpiricalValidation) {
      return {
        applies: true,
        reason: `Predictive claim lacks empirical validation, capping score at 75.`
      };
    }
  }

  return { applies: false };
}

// ============================================================================
// Main Scoring Function
// ============================================================================

export function computeEpistemicScore(input: ScoringInput): ScoringOutput {
  const startTime = Date.now();

  // Step 1: Initialize at 100
  const initialScore = 100;

  // Step 2: Apply penalties cumulatively
  const penaltiesApplied = [...input.penalties];
  const totalPenalties = penaltiesApplied.reduce((sum, p) => sum + p.weight, 0);
  let rawScore = initialScore - totalPenalties;

  // Step 3: Apply safeguards
  const floorCheck = checkFloorRule(input.typedClaims, input.evidenceGraph);
  const ceilingCheck = checkCeilingRule(input.typedClaims, input.evidenceGraph);

  let finalScore = rawScore;
  let floorApplied = false;
  let ceilingApplied = false;
  let floorReason: string | undefined;
  let ceilingReason: string | undefined;

  // Apply floor (minimum 20 if peer-reviewed support)
  if (floorCheck.applies && finalScore < 20) {
    finalScore = 20;
    floorApplied = true;
    floorReason = floorCheck.reason;
  }

  // Apply ceiling (maximum 75 if primarily model-based)
  if (ceilingCheck.applies && finalScore > 75) {
    finalScore = 75;
    ceilingApplied = true;
    ceilingReason = ceilingCheck.reason;
  }

  // Step 4: Clamp to 0-100
  finalScore = Math.max(0, Math.min(100, Math.round(finalScore)));

  // Step 5: Map to score band
  const { key: scoreBandKey, band: scoreBand } = getScoreBand(finalScore);

  const result: ScoringResult = {
    initialScore: 100,
    penaltiesApplied,
    totalPenalties,
    rawScore,
    floorApplied,
    floorReason,
    ceilingApplied,
    ceilingReason,
    finalScore,
    scoreBand: scoreBandKey,
    scoreBandLabel: scoreBand.label
  };

  const artifact: ScoringArtifact = {
    version: EPISTEMIC_PIPELINE_VERSION,
    timestamp: new Date().toISOString(),
    contentHash: computeContentHash(result),
    result
  };

  return {
    artifact,
    durationMs: Date.now() - startTime
  };
}

