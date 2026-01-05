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
  outdated_evidence: "Outdated evidence",
  evidence_contradiction: "Evidence contradiction"
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
  outdated_evidence: "More recent evidence would better reflect current knowledge.",
  evidence_contradiction: "Revising the claim to align with available evidence would be necessary."
};

/**
 * CONTEXT (How to understand this claim)
 * 
 * Goal: Place the claim in its proper factual and conceptual frame.
 * 3-5 sentences maximum.
 * 
 * - Explain relevant background needed to interpret the claim correctly
 * - Clarify common misunderstandings or misleading framings  
 * - Distinguish between related but different claims if relevant
 * - Explicitly note uncertainty, disagreement, or missing data when applicable
 * 
 * Tone: Explanatory, not corrective. Assume good-faith curiosity.
 * DO NOT: Restate the summary, argue with user, mention pipeline/models, over-educate
 */
function generateEvidenceSummary(evidence: EvidenceGraph, claims: TypedClaim[]): string {
  const stats = evidence.stats;
  const parts: string[] = [];

  if (stats.totalSources === 0) {
    return "Insufficient evidence was available to verify or refute this claim.";
  }

  // Note uncertainty or disagreement when applicable
  const hasDisagreement = stats.supportingCount > 0 && stats.refutingCount > 0;
  const hasLowReliability = stats.averageReliability < 0.5;
  const hasLimitedSources = stats.totalSources < 3;

  if (hasDisagreement) {
    parts.push("Available evidence shows disagreement on this claim.");
  }

  if (hasLowReliability) {
    parts.push("The reliability of available sources is limited.");
  } else if (hasLimitedSources) {
    parts.push("The evidence base for this claim is narrow.");
  }

  // Clarify scope or common misunderstandings based on claim type
  const hasPredictiveClaim = claims.some((c) => c.primaryType === "predictive");
  const hasCausalClaim = claims.some((c) => c.primaryType === "causal");
  const hasUniversalQuantifier = claims.some((c) => c.quantifiers.includes("universal"));
  
  if (hasPredictiveClaim && stats.modelBasedCount > stats.totalSources * 0.5) {
    parts.push("This claim involves future projections based primarily on models rather than observed outcomes.");
  }
  
  if (hasCausalClaim) {
    const hasCorrelationEvidence = evidence.nodes.some((n) => 
      /correlat|associat|linked|related/i.test(n.summary)
    );
    if (hasCorrelationEvidence) {
      parts.push("Evidence shows correlation but establishing causation requires additional support.");
    }
  }

  if (hasUniversalQuantifier && stats.totalSources < 5) {
    parts.push("The claim uses absolute language but evidence coverage is limited in scope.");
  }

  // If nothing specific to note, provide neutral context
  if (parts.length === 0) {
    if (stats.refutingCount > stats.supportingCount) {
      parts.push("Available evidence predominantly contradicts the claim as stated.");
    } else if (stats.supportingCount > stats.refutingCount) {
      parts.push("Available evidence generally supports the claim.");
    } else {
      parts.push("Evidence for this claim is mixed or inconclusive.");
    }
  }

  // Limit to 3-5 sentences
  return parts.slice(0, 5).join(" ");
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

/**
 * SUMMARY (What's the answer?)
 * 
 * Goal: Give the user a fast, neutral understanding of the verdict.
 * 2-3 sentences maximum.
 * 
 * Structure:
 * - Sentence 1: Verdict + core reason
 * - Sentence 2 (optional): Key limitation or uncertainty
 * - Sentence 3 (optional): Scope clarification
 * 
 * Tone: Calm, neutral, factual. No confidence theater. No exaggeration or minimization.
 * DO NOT: Cite sources by name, use bullet points, use percentages, use emojis, 
 *         introduce new claims, or use "true"/"false" unless part of verdict label
 */
function generateExplanationText(
  scoringResult: ScoringResult,
  evidence: EvidenceGraph,
  topPenalties: Array<{ name: string; weight: number; rationale: string }>,
  claims: TypedClaim[]
): string {
  const { finalScore, scoreBandLabel } = scoringResult;
  const stats = evidence.stats;
  const parts: string[] = [];

  // Sentence 1: Verdict + core reason
  if (finalScore >= 75) {
    // Strongly Supported / Supported
    if (stats.supportingCount > stats.refutingCount * 2) {
      parts.push("Available evidence supports this claim.");
    } else {
      parts.push("The claim is generally consistent with available evidence.");
    }
  } else if (finalScore >= 60) {
    // Plausible
    parts.push("Evidence partially supports this claim but with notable limitations.");
  } else if (finalScore >= 45) {
    // Mixed
    if (stats.supportingCount > 0 && stats.refutingCount > 0) {
      parts.push("Available evidence is mixed on this claim.");
    } else {
      parts.push("Evidence for this claim is inconclusive.");
    }
  } else if (finalScore >= 30) {
    // Weakly Supported / Mostly False
    parts.push("Available evidence contradicts significant aspects of this claim.");
  } else {
    // False
    if (stats.refutingCount > stats.supportingCount * 2) {
      parts.push("Available evidence contradicts this claim.");
    } else {
      parts.push("This claim lacks credible supporting evidence.");
    }
  }

  // Sentence 2: Key limitation or uncertainty (if applicable)
  if (topPenalties.length > 0) {
    const primaryPenalty = topPenalties[0];
    
    // Translate penalty into user-facing limitation
    if (primaryPenalty.name === "Evidence contradiction") {
      // Already covered in sentence 1, skip
    } else if (primaryPenalty.name === "Model dependence") {
      parts.push("The claim relies heavily on projections rather than observed data.");
    } else if (primaryPenalty.name === "Temporal mismatch") {
      parts.push("Evidence does not align with the timeframe specified in the claim.");
    } else if (primaryPenalty.name === "Missing context") {
      parts.push("The claim omits important context that affects its accuracy.");
    } else if (primaryPenalty.name === "Causal overreach") {
      parts.push("Evidence shows correlation but does not establish the causal relationship claimed.");
    } else if (primaryPenalty.name === "Scope exaggeration") {
      parts.push("Evidence does not support the broad scope implied by the claim.");
    } else if (primaryPenalty.name === "Low expert consensus") {
      parts.push("Expert sources disagree on this claim.");
    } else if (primaryPenalty.name === "Outdated evidence") {
      parts.push("Available evidence may be outdated for the current state of knowledge.");
    } else if (primaryPenalty.name === "Selective citation") {
      parts.push("Evidence sources are concentrated or potentially selective.");
    }
  }

  // Sentence 3: Scope clarification (if needed)
  if (stats.totalSources === 0) {
    parts.push("Insufficient evidence was available for verification.");
  } else if (stats.totalSources < 3) {
    parts.push("The evidence base is limited.");
  }

  // Limit to 2-3 sentences
  return parts.slice(0, 3).join(" ");
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
  const evidenceSummary = generateEvidenceSummary(evidenceGraph, input.typedClaims);
  const uncertaintyStatement = generateUncertaintyStatement(scoringResult, evidenceGraph);
  const improvementSuggestions = generateImprovementSuggestions(scoringResult.penaltiesApplied);
  const explanationText = generateExplanationText(scoringResult, evidenceGraph, topPenalties, input.typedClaims);

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

