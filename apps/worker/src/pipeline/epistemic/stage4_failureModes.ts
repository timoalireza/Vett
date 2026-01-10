/**
 * Stage 4: Failure Mode Detection
 * 
 * Deterministic checks that emit named penalties with severity + rationale.
 * Each penalty has a weight range defined in types.ts.
 */

import {
  TypedClaim,
  EvidenceGraph,
  Penalty,
  PenaltyName,
  PenaltySeverity,
  PENALTY_RANGES,
  FailureModeDetectionArtifact,
  computeContentHash,
  EPISTEMIC_PIPELINE_VERSION
} from "./types.js";

export interface FailureModeDetectionInput {
  typedClaims: TypedClaim[];
  evidenceGraph: EvidenceGraph;
}

export interface FailureModeDetectionOutput {
  artifact: FailureModeDetectionArtifact;
  durationMs: number;
}

// Helper to calculate penalty weight based on severity
function calculateWeight(penaltyName: PenaltyName, severity: PenaltySeverity): number {
  const range = PENALTY_RANGES[penaltyName];
  switch (severity) {
    case "low":
      return range.min;
    case "medium":
      return Math.round((range.min + range.max) / 2);
    case "high":
      return range.max;
  }
}

// Helper to create a penalty
function createPenalty(
  name: PenaltyName,
  severity: PenaltySeverity,
  rationale: string,
  affectedClaimIds: string[],
  detectionMethod: "rule_based" | "llm_assisted" = "rule_based"
): Penalty {
  return {
    name,
    weight: calculateWeight(name, severity),
    severity,
    rationale,
    affectedClaimIds,
    detectionMethod
  };
}

// ============================================================================
// Individual Failure Mode Detectors
// ============================================================================

function detectTemporalMismatch(
  claims: TypedClaim[],
  evidence: EvidenceGraph
): Penalty | null {
  for (const claim of claims) {
    // Check for future claims (predictive) with only past evidence
    if (claim.primaryType === "predictive" || claim.timeframe.type === "future") {
      const relevantEvidence = evidence.nodes.filter((n) =>
        n.claimIds.includes(claim.id) && n.stance !== "irrelevant"
      );

      // Check if evidence is all from past (not projections)
      const nonModelEvidence = relevantEvidence.filter((n) =>
        n.sourceType !== "model_based" && n.sourceType !== "unknown"
      );

      if (nonModelEvidence.length > 0 && nonModelEvidence.length === relevantEvidence.length) {
        // All evidence is empirical but claim is future-oriented
        return createPenalty(
          "temporal_mismatch",
          "medium",
          `Claim makes future projection but evidence is based on past/present observations without forward-looking models.`,
          [claim.id]
        );
      }
    }

    // Check for present-tense claims with only outdated evidence
    if (claim.timeframe.type === "present") {
      const relevantEvidence = evidence.nodes.filter((n) =>
        n.claimIds.includes(claim.id) && n.publishedAt
      );

      if (relevantEvidence.length > 0) {
        const now = Date.now();
        const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
        const allOld = relevantEvidence.every((n) => {
          const date = new Date(n.publishedAt!).getTime();
          return date < oneYearAgo;
        });

        if (allOld) {
          return createPenalty(
            "temporal_mismatch",
            "low",
            `Claim describes present state but all supporting evidence is over a year old.`,
            [claim.id]
          );
        }
      }
    }
  }

  return null;
}

function detectContextOmission(
  claims: TypedClaim[],
  evidence: EvidenceGraph
): Penalty | null {
  for (const claim of claims) {
    // Check for claims with unspecified geography/timeframe that evidence suggests is conditional
    if (claim.geography.scope === "unspecified" || claim.timeframe.type === "unspecified") {
      const relevantEvidence = evidence.nodes.filter((n) =>
        n.claimIds.includes(claim.id) && n.relevance > 0.5
      );

      // Check if evidence suggests regional/conditional nature
      const conditionalPatterns = [
        /\bin some\b/i,
        /\bin certain\b/i,
        /\bdepending on\b/i,
        /\bunder certain conditions\b/i,
        /\bworst.?case\b/i,
        /\bbest.?case\b/i,
        /\bvaries by\b/i,
        /\bregion/i,
        /\bcountry/i
      ];

      const hasConditionalEvidence = relevantEvidence.some((n) =>
        conditionalPatterns.some((p) => p.test(n.summary))
      );

      if (hasConditionalEvidence && claim.geography.scope === "unspecified") {
        return createPenalty(
          "context_omission",
          "low",
          `Claim appears to generalize without specifying geographic or conditional context that evidence suggests is relevant.`,
          [claim.id]
        );
      }
    }

    // Check for universal quantifiers without supporting universal evidence
    if (claim.quantifiers.includes("universal")) {
      const relevantEvidence = evidence.nodes.filter((n) =>
        n.claimIds.includes(claim.id) && n.stance === "supports"
      );

      if (relevantEvidence.length < 3) {
        return createPenalty(
          "context_omission",
          "medium",
          `Claim uses universal language ("all", "every", "always") but evidence is limited in scope.`,
          [claim.id]
        );
      }
    }
  }

  return null;
}

function detectModelDependence(
  claims: TypedClaim[],
  evidence: EvidenceGraph
): Penalty | null {
  const stats = evidence.stats;

  // High model dependence if >60% of sources are model-based
  const modelRatio = stats.totalSources > 0
    ? stats.modelBasedCount / stats.totalSources
    : 0;

  if (modelRatio > 0.6) {
    const severity: PenaltySeverity = modelRatio > 0.8 ? "high" : "medium";
    return createPenalty(
      "model_dependence",
      severity,
      `${Math.round(modelRatio * 100)}% of evidence comes from model-based projections rather than empirical observations.`,
      claims.map((c) => c.id)
    );
  }

  // Also check for predictive claims with only model-based evidence
  for (const claim of claims) {
    if (claim.primaryType === "predictive") {
      const claimEvidence = evidence.nodes.filter((n) => n.claimIds.includes(claim.id));
      const modelCount = claimEvidence.filter((n) => n.sourceType === "model_based").length;

      if (claimEvidence.length > 0 && modelCount === claimEvidence.length) {
        return createPenalty(
          "model_dependence",
          "high",
          `Predictive claim relies entirely on model-based projections with no empirical validation.`,
          [claim.id]
        );
      }
    }
  }

  return null;
}

function detectLowExpertConsensus(
  claims: TypedClaim[],
  evidence: EvidenceGraph
): Penalty | null {
  const stats = evidence.stats;

  // Check for low peer-reviewed/institutional coverage
  const authorityRatio = stats.totalSources > 0
    ? (stats.peerReviewedCount + stats.sourceTypeDistribution.institutional_consensus) / stats.totalSources
    : 0;

  if (authorityRatio < 0.2 && stats.totalSources >= 3) {
    return createPenalty(
      "low_expert_consensus",
      "medium",
      `Only ${Math.round(authorityRatio * 100)}% of evidence comes from peer-reviewed or institutional sources.`,
      claims.map((c) => c.id)
    );
  }

  // Check for conflicting expert stances
  const institutionalEvidence = evidence.nodes.filter((n) =>
    n.isInstitutional || n.isPeerReviewed
  );

  if (institutionalEvidence.length >= 2) {
    const supporting = institutionalEvidence.filter((n) => n.stance === "supports").length;
    const refuting = institutionalEvidence.filter((n) => n.stance === "refutes").length;

    if (supporting > 0 && refuting > 0) {
      return createPenalty(
        "low_expert_consensus",
        "high",
        `Expert/institutional sources disagree: ${supporting} support the claim while ${refuting} refute it.`,
        claims.map((c) => c.id)
      );
    }
  }

  return null;
}

function detectCausalOverreach(
  claims: TypedClaim[],
  evidence: EvidenceGraph
): Penalty | null {
  for (const claim of claims) {
    // Check if claim asserts causation
    if (claim.primaryType === "causal" || claim.causalStructure === "causal") {
      const claimEvidence = evidence.nodes.filter((n) =>
        n.claimIds.includes(claim.id) && n.stance === "supports"
      );

      // Check if evidence only shows correlation
      const correlationalPatterns = [
        /\bcorrelat/i,
        /\bassociat/i,
        /\blinked\b/i,
        /\brelated\b/i,
        /\bmay\b.*\bcause/i,
        /\bpossibly\b/i,
        /\bfurther research/i,
        /\bdoes not prove/i
      ];

      const correlationalEvidence = claimEvidence.filter((n) =>
        correlationalPatterns.some((p) => p.test(n.summary))
      );

      if (correlationalEvidence.length > 0 && correlationalEvidence.length >= claimEvidence.length * 0.5) {
        return createPenalty(
          "causal_overreach",
          "medium",
          `Claim asserts causation but ${Math.round((correlationalEvidence.length / claimEvidence.length) * 100)}% of supporting evidence only shows correlation or association.`,
          [claim.id]
        );
      }
    }
  }

  return null;
}

function detectScopeExaggeration(
  claims: TypedClaim[],
  evidence: EvidenceGraph
): Penalty | null {
  for (const claim of claims) {
    // Check for broad scope claims with narrow evidence
    if (
      claim.geography.scope === "global" ||
      claim.quantifiers.includes("universal") ||
      claim.quantifiers.includes("majority")
    ) {
      const claimEvidence = evidence.nodes.filter((n) =>
        n.claimIds.includes(claim.id) && n.stance === "supports"
      );

      // Check if evidence is narrow in scope
      const narrowPatterns = [
        /\bstudy\b/i,
        /\bsurvey\b/i,
        /\bsample\b/i,
        /\bparticipants\b/i,
        /\bonly\b.*\bregion/i,
        /\bone country\b/i,
        /\blimited\b/i
      ];

      const narrowEvidence = claimEvidence.filter((n) =>
        narrowPatterns.some((p) => p.test(n.summary))
      );

      if (narrowEvidence.length > 0 && narrowEvidence.length >= claimEvidence.length * 0.6) {
        return createPenalty(
          "scope_exaggeration",
          "medium",
          `Claim makes broad generalizations but evidence is based on limited samples or specific regions.`,
          [claim.id]
        );
      }
    }
  }

  return null;
}

function detectComparativeDistortion(
  claims: TypedClaim[],
  evidence: EvidenceGraph
): Penalty | null {
  for (const claim of claims) {
    if (claim.primaryType === "comparative") {
      const claimEvidence = evidence.nodes.filter((n) =>
        n.claimIds.includes(claim.id) && n.relevance > 0.5
      );

      // Check for cherry-picking indicators
      const cherryPickPatterns = [
        /\bhowever\b/i,
        /\bbut\b.*\bnot\b/i,
        /\bexcept\b/i,
        /\bdepends on\b/i,
        /\bwhen\b.*\bcontrolling for\b/i,
        /\bafter adjustment\b/i,
        /\bdifferent.*methodology\b/i
      ];

      const nuancedEvidence = claimEvidence.filter((n) =>
        cherryPickPatterns.some((p) => p.test(n.summary))
      );

      if (nuancedEvidence.length > 0) {
        return createPenalty(
          "comparative_distortion",
          "low",
          `Comparative claim may oversimplify: evidence suggests the comparison depends on methodology or context.`,
          [claim.id]
        );
      }
    }
  }

  return null;
}

function detectRhetoricalCertainty(claims: TypedClaim[]): Penalty | null {
  const highCertaintyClaims = claims.filter((claim) => {
    if (claim.certaintyLanguage === "definite") {
      // Check for markers like "will", "proves", "definitely"
      const strongMarkers = ["will", "proves", "prove", "definitely", "certainly", "always", "never", "impossible", "guaranteed"];
      return claim.certaintyMarkers.some((m) => strongMarkers.includes(m.toLowerCase()));
    }
    return false;
  });

  if (highCertaintyClaims.length > 0) {
    const markers = [...new Set(highCertaintyClaims.flatMap((c) => c.certaintyMarkers))].slice(0, 3);
    return createPenalty(
      "rhetorical_certainty",
      "low",
      `Claim uses definitive language ("${markers.join('", "')}") that may overstate certainty.`,
      highCertaintyClaims.map((c) => c.id)
    );
  }

  return null;
}

function detectAmbiguousQuantifiers(claims: TypedClaim[]): Penalty | null {
  const vagueClaims = claims.filter((claim) =>
    claim.quantifiers.includes("vague")
  );

  if (vagueClaims.length > 0) {
    return createPenalty(
      "ambiguous_quantifiers",
      "low",
      `Claim uses ambiguous quantifiers ("most", "significant", "many") without specific figures.`,
      vagueClaims.map((c) => c.id)
    );
  }

  return null;
}

function detectSelectiveCitation(
  claims: TypedClaim[],
  evidence: EvidenceGraph
): Penalty | null {
  const stats = evidence.stats;

  // Check for single-source dominance
  if (stats.singleSourceDominance && stats.dominantHostname) {
    return createPenalty(
      "selective_citation",
      "medium",
      `Over 50% of evidence comes from a single source (${stats.dominantHostname}), suggesting potential selection bias.`,
      claims.map((c) => c.id)
    );
  }

  // Check if evidence only supports and none refutes when claim is contested
  // NOTE: Only apply this if sources come from a NARROW set of hostnames.
  // If multiple INDEPENDENT sources (3+ unique hostnames) all support the claim,
  // that's strong corroboration, NOT selection bias - do NOT penalize.
  if (stats.supportingCount > 0 && stats.refutingCount === 0 && stats.totalSources >= 3) {
    // Count unique hostnames specifically from SUPPORTING sources
    const supportingNodes = evidence.nodes.filter((n) => n.stance === "supports");
    const supportingHostnames = new Set(supportingNodes.map((n) => n.hostname));
    const uniqueSupportingHostnames = supportingHostnames.size;
    
    // If we have 3+ unique hostnames all supporting, this is corroboration, not bias
    if (uniqueSupportingHostnames >= 3) {
      // Strong independent corroboration - do NOT penalize
      return null;
    }
    
    // Only flag if evidence seems one-sided from limited sources
    const mixedEvidence = evidence.nodes.filter((n) => n.stance === "mixed");
    if (mixedEvidence.length === 0 && uniqueSupportingHostnames < 3) {
      // Could be selective citation when sources are limited
      return createPenalty(
        "selective_citation",
        "low",
        `All retrieved evidence supports the claim with no contrary viewpoints found, which may indicate selection bias.`,
        claims.map((c) => c.id)
      );
    }
  }

  return null;
}

function detectOutdatedEvidence(
  claims: TypedClaim[],
  evidence: EvidenceGraph
): Penalty | null {
  const stats = evidence.stats;

  if (stats.oldestEvidenceDate && stats.newestEvidenceDate) {
    const newestDate = new Date(stats.newestEvidenceDate).getTime();
    const now = Date.now();
    const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60 * 1000;
    const fiveYearsAgo = now - 5 * 365 * 24 * 60 * 60 * 1000;

    if (newestDate < fiveYearsAgo) {
      return createPenalty(
        "outdated_evidence",
        "high",
        `The most recent evidence is over 5 years old, which may not reflect current state of knowledge.`,
        claims.map((c) => c.id)
      );
    }

    if (newestDate < twoYearsAgo) {
      return createPenalty(
        "outdated_evidence",
        "medium",
        `The most recent evidence is over 2 years old, which may be outdated for rapidly evolving topics.`,
        claims.map((c) => c.id)
      );
    }
  }

  // Check if claims about current events have no recent evidence
  const presentClaims = claims.filter((c) => c.timeframe.type === "present");
  if (presentClaims.length > 0 && stats.newestEvidenceDate) {
    const newestDate = new Date(stats.newestEvidenceDate).getTime();
    const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;

    if (newestDate < sixMonthsAgo) {
      return createPenalty(
        "outdated_evidence",
        "low",
        `Claim describes current state but most recent evidence is over 6 months old.`,
        presentClaims.map((c) => c.id)
      );
    }
  }

  return null;
}

function detectEvidenceContradiction(
  claims: TypedClaim[],
  evidence: EvidenceGraph
): Penalty | null {
  const stats = evidence.stats;
  
  // Check if we have enough evidence to make a determination
  if (stats.totalSources < 2) {
    return null;
  }

  const totalStancedSources = stats.supportingCount + stats.refutingCount;
  
  // If we don't have clear stances, can't determine contradiction
  if (totalStancedSources === 0) {
    return null;
  }

  const refutingRatio = stats.refutingCount / totalStancedSources;
  
  // CRITICAL: If majority of evidence refutes the claim, this is a major problem
  if (refutingRatio >= 0.75) {
    // 75%+ of evidence refutes the claim
    return createPenalty(
      "evidence_contradiction",
      "high",
      `${stats.refutingCount} out of ${totalStancedSources} sources with clear stances refute the claim, indicating it is likely false.`,
      claims.map((c) => c.id)
    );
  }
  
  if (refutingRatio >= 0.5) {
    // 50-75% of evidence refutes the claim
    return createPenalty(
      "evidence_contradiction",
      "high",
      `${stats.refutingCount} out of ${totalStancedSources} sources refute the claim, while only ${stats.supportingCount} support it.`,
      claims.map((c) => c.id)
    );
  }
  
  if (refutingRatio >= 0.3 && stats.refutingCount >= 2) {
    // Significant minority refutes (30%+)
    return createPenalty(
      "evidence_contradiction",
      "medium",
      `${stats.refutingCount} out of ${totalStancedSources} sources refute the claim, indicating significant contradictory evidence.`,
      claims.map((c) => c.id)
    );
  }

  return null;
}

// ============================================================================
// Main Detection Function
// ============================================================================

export async function detectFailureModes(
  input: FailureModeDetectionInput
): Promise<FailureModeDetectionOutput> {
  const startTime = Date.now();

  const penalties: Penalty[] = [];

  // Run all detectors
  const detectors = [
    () => detectEvidenceContradiction(input.typedClaims, input.evidenceGraph), // Check this FIRST - most critical
    () => detectTemporalMismatch(input.typedClaims, input.evidenceGraph),
    () => detectContextOmission(input.typedClaims, input.evidenceGraph),
    () => detectModelDependence(input.typedClaims, input.evidenceGraph),
    () => detectLowExpertConsensus(input.typedClaims, input.evidenceGraph),
    () => detectCausalOverreach(input.typedClaims, input.evidenceGraph),
    () => detectScopeExaggeration(input.typedClaims, input.evidenceGraph),
    () => detectComparativeDistortion(input.typedClaims, input.evidenceGraph),
    () => detectRhetoricalCertainty(input.typedClaims),
    () => detectAmbiguousQuantifiers(input.typedClaims),
    () => detectSelectiveCitation(input.typedClaims, input.evidenceGraph),
    () => detectOutdatedEvidence(input.typedClaims, input.evidenceGraph)
  ];

  for (const detector of detectors) {
    const penalty = detector();
    if (penalty) {
      penalties.push(penalty);
    }
  }

  const totalPenaltyWeight = penalties.reduce((sum, p) => sum + p.weight, 0);

  const artifact: FailureModeDetectionArtifact = {
    version: EPISTEMIC_PIPELINE_VERSION,
    timestamp: new Date().toISOString(),
    contentHash: computeContentHash({ penalties, totalPenaltyWeight }),
    penalties,
    totalPenaltyWeight
  };

  return {
    artifact,
    durationMs: Date.now() - startTime
  };
}

