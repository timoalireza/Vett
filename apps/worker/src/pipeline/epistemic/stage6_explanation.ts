/**
 * Stage 6: Explanation Generator
 * 
 * Generates human-readable explanations that include:
 * - Final score + band
 * - Top 3 penalties applied (with weights)
 * - What would need to change for the score to increase
 * - Explicit statement of uncertainty
 * 
 * Tone: neutral, non-judgmental, precise.
 */

import {
  TypedClaim,
  EvidenceGraph,
  Penalty,
  ScoringResult,
  ExplanationOutput,
  SCORE_BANDS,
  PENALTY_RANGES
} from "./types.js";

export interface ExplanationInput {
  typedClaims: TypedClaim[];
  evidenceGraph: EvidenceGraph;
  scoringResult: ScoringResult;
}

export interface ExplanationGeneratorOutput {
  explanation: ExplanationOutput;
  durationMs: number;
}

// Human-readable penalty names
const PENALTY_DESCRIPTIONS: Record<string, string> = {
  temporal_mismatch: "Temporal mismatch",
  context_omission: "Missing context",
  model_dependence: "Model dependence",
  low_expert_consensus: "Low expert consensus",
  causal_overreach: "Causal overreach",
  scope_exaggeration: "Scope exaggeration",
  comparative_distortion: "Comparative distortion",
  rhetorical_certainty: "Rhetorical certainty",
  ambiguous_quantifiers: "Ambiguous quantifiers",
  selective_citation: "Selective citation",
  outdated_evidence: "Outdated evidence"
};

// What would help for each penalty type
const IMPROVEMENT_SUGGESTIONS: Record<string, string> = {
  temporal_mismatch: "Evidence covering the relevant time period would improve the score.",
  context_omission: "Specifying the conditions or scope would improve clarity and the score.",
  model_dependence: "Empirical validation of model predictions would strengthen the claim.",
  low_expert_consensus: "More peer-reviewed or institutional sources would increase confidence.",
  causal_overreach: "Evidence demonstrating causation (not just correlation) would support the claim.",
  scope_exaggeration: "Evidence from broader samples or multiple regions would validate the scope.",
  comparative_distortion: "Standardized comparison methodology would improve reliability.",
  rhetorical_certainty: "More measured language aligned with evidence certainty would be appropriate.",
  ambiguous_quantifiers: "Specific figures instead of vague quantifiers would add precision.",
  selective_citation: "A broader range of independent sources would reduce bias concerns.",
  outdated_evidence: "More recent evidence would better reflect current knowledge."
};

function generateEvidenceSummary(evidence: EvidenceGraph): string {
  const stats = evidence.stats;

  if (stats.totalSources === 0) {
    return "No external evidence was found to evaluate this claim.";
  }

  const parts: string[] = [];

  // Source count and diversity
  parts.push(`Evaluated ${stats.totalSources} source${stats.totalSources !== 1 ? "s" : ""}`);
  
  if (stats.uniqueHostnames > 1) {
    parts[0] += ` from ${stats.uniqueHostnames} independent outlets`;
  }

  // Quality indicators
  const qualityParts: string[] = [];
  if (stats.peerReviewedCount > 0) {
    qualityParts.push(`${stats.peerReviewedCount} peer-reviewed`);
  }
  if (stats.sourceTypeDistribution.institutional_consensus > 0) {
    qualityParts.push(`${stats.sourceTypeDistribution.institutional_consensus} institutional`);
  }
  if (qualityParts.length > 0) {
    parts.push(`including ${qualityParts.join(" and ")} source${qualityParts.length > 1 || parseInt(qualityParts[0]) > 1 ? "s" : ""}`);
  }

  // Stance summary
  const stanceParts: string[] = [];
  if (stats.supportingCount > 0) {
    stanceParts.push(`${stats.supportingCount} supporting`);
  }
  if (stats.refutingCount > 0) {
    stanceParts.push(`${stats.refutingCount} refuting`);
  }
  if (stanceParts.length > 0) {
    parts.push(`(${stanceParts.join(", ")} the claim)`);
  }

  // Average reliability
  if (stats.averageReliability > 0) {
    const reliabilityLevel = stats.averageReliability >= 0.8 ? "high" :
      stats.averageReliability >= 0.6 ? "moderate" : "limited";
    parts.push(`with ${reliabilityLevel} overall reliability`);
  }

  return parts.join(". ") + ".";
}

function generateUncertaintyStatement(
  scoringResult: ScoringResult,
  evidence: EvidenceGraph
): string {
  const score = scoringResult.finalScore;
  const stats = evidence.stats;

  // Build uncertainty statement based on score and evidence quality
  const uncertaintyParts: string[] = [];

  // Score-based uncertainty
  if (score >= 90) {
    uncertaintyParts.push("This assessment has high confidence based on strong, consistent evidence.");
  } else if (score >= 75) {
    uncertaintyParts.push("This assessment has good confidence, though minor uncertainties remain.");
  } else if (score >= 60) {
    uncertaintyParts.push("This assessment has moderate confidence with notable caveats.");
  } else if (score >= 45) {
    uncertaintyParts.push("This assessment has limited confidence due to mixed or contested evidence.");
  } else if (score >= 30) {
    uncertaintyParts.push("This assessment has low confidence; significant issues were identified.");
  } else {
    uncertaintyParts.push("This assessment indicates significant problems with the claim as stated.");
  }

  // Evidence-based qualifiers
  if (stats.totalSources < 3) {
    uncertaintyParts.push("Limited available evidence increases uncertainty.");
  }
  if (stats.singleSourceDominance) {
    uncertaintyParts.push("Source concentration may affect assessment reliability.");
  }
  if (stats.modelBasedCount > stats.totalSources * 0.5) {
    uncertaintyParts.push("Heavy reliance on projections rather than empirical data.");
  }

  return uncertaintyParts.join(" ");
}

function generateImprovementSuggestions(penalties: Penalty[]): string[] {
  // Get top 3 penalties by weight and generate suggestions
  const sortedPenalties = [...penalties].sort((a, b) => b.weight - a.weight);
  const topPenalties = sortedPenalties.slice(0, 3);

  const suggestions: string[] = [];
  const seenSuggestions = new Set<string>();

  for (const penalty of topPenalties) {
    const suggestion = IMPROVEMENT_SUGGESTIONS[penalty.name];
    if (suggestion && !seenSuggestions.has(suggestion)) {
      suggestions.push(suggestion);
      seenSuggestions.add(suggestion);
    }
  }

  // Add generic suggestion if no specific ones
  if (suggestions.length === 0) {
    suggestions.push("Additional high-quality evidence would improve confidence in this assessment.");
  }

  return suggestions;
}

function generateExplanationText(
  scoringResult: ScoringResult,
  evidence: EvidenceGraph,
  topPenalties: Array<{ name: string; weight: number; rationale: string }>
): string {
  const { finalScore, scoreBandLabel } = scoringResult;
  const stats = evidence.stats;

  const parts: string[] = [];

  // Opening statement about the score
  parts.push(`This claim received a score of ${finalScore} out of 100, placing it in the "${scoreBandLabel}" band.`);

  // Evidence overview
  if (stats.totalSources > 0) {
    const sourceQuality = stats.averageReliability >= 0.75 ? "reliable" :
      stats.averageReliability >= 0.5 ? "moderately reliable" : "mixed reliability";
    parts.push(`The assessment is based on ${stats.totalSources} ${sourceQuality} source${stats.totalSources !== 1 ? "s" : ""}.`);
  } else {
    parts.push("No external sources were found to verify this claim.");
  }

  // Penalty summary
  if (topPenalties.length > 0) {
    const penaltyNames = topPenalties.map((p) => PENALTY_DESCRIPTIONS[p.name] || p.name);
    if (penaltyNames.length === 1) {
      parts.push(`The primary issue identified was ${penaltyNames[0].toLowerCase()}.`);
    } else {
      const lastPenalty = penaltyNames.pop();
      parts.push(`Key issues identified include ${penaltyNames.join(", ").toLowerCase()}, and ${lastPenalty!.toLowerCase()}.`);
    }
  }

  // Safeguard notes
  if (scoringResult.floorApplied) {
    parts.push("A minimum score was applied due to credible supporting evidence.");
  }
  if (scoringResult.ceilingApplied) {
    parts.push("A maximum score cap was applied due to reliance on projections.");
  }

  return parts.join(" ");
}

export function generateEpistemicExplanation(
  input: ExplanationInput
): ExplanationGeneratorOutput {
  const startTime = Date.now();

  const { scoringResult, evidenceGraph } = input;

  // Get top 3 penalties
  const sortedPenalties = [...scoringResult.penaltiesApplied].sort((a, b) => b.weight - a.weight);
  const topPenalties = sortedPenalties.slice(0, 3).map((p) => ({
    name: PENALTY_DESCRIPTIONS[p.name] || p.name,
    weight: p.weight,
    rationale: p.rationale
  }));

  // Generate each component
  const evidenceSummary = generateEvidenceSummary(evidenceGraph);
  const uncertaintyStatement = generateUncertaintyStatement(scoringResult, evidenceGraph);
  const improvementSuggestions = generateImprovementSuggestions(scoringResult.penaltiesApplied);
  const explanationText = generateExplanationText(scoringResult, evidenceGraph, topPenalties);

  // Get band description
  const bandKey = scoringResult.scoreBand;
  const bandDescription = SCORE_BANDS[bandKey]?.description ?? "Unknown band";

  const explanation: ExplanationOutput = {
    finalScore: scoringResult.finalScore,
    scoreBand: scoringResult.scoreBandLabel,
    scoreBandDescription: bandDescription,
    topPenalties,
    improvementSuggestions,
    uncertaintyStatement,
    evidenceSummary,
    explanationText
  };

  return {
    explanation,
    durationMs: Date.now() - startTime
  };
}

