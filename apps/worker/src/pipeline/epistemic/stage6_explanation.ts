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
function generateEvidenceSummary(evidence: EvidenceGraph, claims: TypedClaim[], penalties: Penalty[]): string {
  const stats = evidence.stats;
  const parts: string[] = [];

  if (stats.totalSources === 0) {
    return "No reliable sources were available to assess this claim. The topic may be too specific, too recent, or not well-documented.";
  }

  // Provide context about what kind of claim this is
  const hasPredictiveClaim = claims.some((c) => c.primaryType === "predictive");
  const hasCausalClaim = claims.some((c) => c.primaryType === "causal");
  const hasComparativeClaim = claims.some((c) => c.primaryType === "comparative");
  const hasUniversalQuantifier = claims.some((c) => c.quantifiers.includes("universal"));
  const hasVagueQuantifier = claims.some((c) => c.quantifiers.includes("vague"));

  // Start with claim type context if relevant
  if (hasPredictiveClaim) {
    parts.push("This claim makes a prediction about future events or outcomes.");
    if (stats.modelBasedCount > stats.totalSources * 0.5) {
      parts.push("Predictions of this kind typically rely on models and assumptions that may not hold.");
    }
  } else if (hasCausalClaim) {
    const hasCorrelationEvidence = evidence.nodes.some((n) => 
      /correlat|associat|linked|related/i.test(n.summary)
    );
    if (hasCorrelationEvidence) {
      parts.push("This claim asserts a cause-and-effect relationship.");
      parts.push("Correlation between two things does not necessarily mean one causes the other.");
    } else {
      parts.push("This claim involves a causal relationship between events or factors.");
    }
  } else if (hasComparativeClaim) {
    parts.push("This claim makes a comparison between two or more things.");
    const hasMethodologyIssue = penalties.some((p) => p.name === "comparative_distortion");
    if (hasMethodologyIssue) {
      parts.push("Comparisons can be sensitive to how measurements are made or what is being compared.");
    }
  }

  // Note uncertainty or disagreement
  const hasDisagreement = stats.supportingCount > 0 && stats.refutingCount > 0;
  const totalStancedSources = stats.supportingCount + stats.refutingCount;
  const hasStrongDisagreement = totalStancedSources >= 3 && stats.refutingCount >= totalStancedSources * 0.75;
  
  if (hasStrongDisagreement) {
    parts.push("The available evidence largely contradicts the specific details or framing of this claim.");
  } else if (hasDisagreement) {
    parts.push("Sources disagree on aspects of this claim, suggesting it may be contested or context-dependent.");
  }

  // Clarify issues with claim framing
  if (hasUniversalQuantifier) {
    parts.push("Claims using absolute terms like 'always,' 'never,' or 'all' are difficult to verify comprehensively.");
  } else if (hasVagueQuantifier) {
    parts.push("The claim uses imprecise language that makes verification difficult.");
  }

  // Note missing context if relevant
  const hasContextIssue = penalties.some((p) => 
    p.name === "context_omission" || p.name === "scope_exaggeration"
  );
  if (hasContextIssue && parts.length < 4) {
    parts.push("The claim may be accurate in specific circumstances but not as broadly as stated.");
  }

  // Note data limitations
  if (stats.totalSources < 3 && parts.length < 3) {
    parts.push("Limited documentation exists on this specific claim.");
  } else if (stats.averageReliability < 0.5 && parts.length < 3) {
    parts.push("The available sources have mixed reliability.");
  }

  // If we haven't provided enough context yet, add clarifying info
  if (parts.length < 3 && stats.newestEvidenceDate) {
    const newestDate = new Date(stats.newestEvidenceDate);
    const now = new Date();
    const oneYearAgo = now.getTime() - 365 * 24 * 60 * 60 * 1000;
    
    if (newestDate.getTime() < oneYearAgo) {
      parts.push("The most recent evidence is over a year old and may not reflect current information.");
    }
  }

  // If nothing specific to note, provide neutral evidence-based context
  if (parts.length === 0) {
    if (stats.refutingCount > stats.supportingCount) {
      parts.push("Available evidence predominantly contradicts the claim as stated.");
    } else if (stats.supportingCount > stats.refutingCount) {
      parts.push("Available evidence generally supports the claim.");
    } else {
      parts.push("Evidence for this claim is mixed or inconclusive.");
    }
  }

  // Limit to 3-5 sentences and clean up
  const result = parts.slice(0, 5).join(" ").replace(/\s+/g, " ").trim();
  
  // Final fallback only if we truly have nothing (shouldn't happen with logic above)
  if (result.length < 20) {
    return "This claim covers a topic with limited available documentation.";
  }
  
  return result;
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
  const { finalScore } = scoringResult;
  const stats = evidence.stats;
  const parts: string[] = [];
  
  // Get the primary penalty with its specific rationale
  const primaryPenalty = topPenalties.length > 0 ? topPenalties[0] : null;

  // Sentence 1: Verdict + core reason (be specific using penalty rationale when available)
  if (finalScore >= 75) {
    // Strongly Supported / Supported
    const ratio = stats.supportingCount / Math.max(1, stats.supportingCount + stats.refutingCount);
    if (ratio > 0.75) {
      parts.push("Multiple independent sources support this claim.");
    } else {
      parts.push("Available evidence generally supports this claim.");
    }
  } else if (finalScore >= 60) {
    // Plausible
    if (primaryPenalty && primaryPenalty.rationale) {
      // Extract the key issue from rationale
      const rationale = primaryPenalty.rationale.toLowerCase();
      if (rationale.includes("specific") || rationale.includes("details")) {
        parts.push("The core claim is supported but lacks specificity in key details.");
      } else if (rationale.includes("scope") || rationale.includes("broad")) {
        parts.push("Evidence supports a narrower version of this claim.");
      } else {
        parts.push("Evidence partially supports this claim with some limitations.");
      }
    } else {
      parts.push("Evidence partially supports this claim with some limitations.");
    }
  } else if (finalScore >= 45) {
    // Mixed
    if (stats.supportingCount > 0 && stats.refutingCount > 0) {
      parts.push("Evidence is divided on this claim, with sources both supporting and contradicting it.");
    } else {
      parts.push("Available evidence is inconclusive on this claim.");
    }
  } else if (finalScore >= 30) {
    // Weakly Supported / Mostly False
    if (primaryPenalty && primaryPenalty.name === "Evidence contradiction" && primaryPenalty.rationale) {
      // Use the specific contradiction information
      parts.push(`Multiple sources contradict this claim. ${primaryPenalty.rationale}`);
    } else {
      parts.push("Available evidence contradicts key aspects of this claim.");
    }
  } else {
    // False
    if (primaryPenalty && primaryPenalty.name === "Evidence contradiction" && primaryPenalty.rationale) {
      // Extract source counts from rationale if present (e.g., "9 out of 11 sources refute...")
      const refuteMatch = primaryPenalty.rationale.match(/(\d+)\s+out of\s+(\d+)\s+sources.*refute/i);
      if (refuteMatch) {
        const refuting = parseInt(refuteMatch[1], 10);
        const total = parseInt(refuteMatch[2], 10);
        // Use extracted counts to determine strength of language
        const refutingRatio = refuting / total;
        if (refutingRatio >= 0.8 && total >= 5) {
          parts.push("Available evidence overwhelmingly contradicts this claim.");
        } else {
          parts.push("Multiple independent sources refute this claim.");
        }
      } else {
        parts.push("Available evidence contradicts this claim.");
      }
    } else if (stats.refutingCount > stats.supportingCount * 2) {
      parts.push("Available evidence contradicts this claim.");
    } else {
      parts.push("No credible evidence supports this claim.");
    }
  }

  // Sentence 2: Add specific limitation from secondary penalty or provide context
  if (topPenalties.length > 1) {
    const secondaryPenalty = topPenalties[1];
    if (secondaryPenalty.name === "Model dependence") {
      parts.push("The claim involves future projections rather than established facts.");
    } else if (secondaryPenalty.name === "Temporal mismatch") {
      parts.push("The timeframe referenced in the claim does not match the evidence.");
    } else if (secondaryPenalty.name === "Missing context") {
      parts.push("Important qualifying context is missing from the claim.");
    } else if (secondaryPenalty.name === "Causal overreach") {
      parts.push("The evidence shows association but not the causal link stated.");
    } else if (secondaryPenalty.name === "Scope exaggeration") {
      parts.push("The claim overgeneralizes from more limited evidence.");
    } else if (secondaryPenalty.name === "Low expert consensus") {
      parts.push("Expert sources show disagreement on this topic.");
    } else if (secondaryPenalty.name === "Outdated evidence") {
      parts.push("The available evidence may not reflect current knowledge.");
    }
  }

  // Sentence 3: Scope clarification (only if truly needed)
  if (stats.totalSources === 0) {
    parts.push("No reliable sources were found to verify this claim.");
  } else if (stats.totalSources < 3 && finalScore < 60) {
    parts.push("The evidence base for assessment is limited.");
  }

  // Limit to 2-3 sentences and clean up
  return parts.slice(0, 3).join(" ").replace(/\s+/g, " ").trim();
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
  const evidenceSummary = generateEvidenceSummary(evidenceGraph, input.typedClaims, scoringResult.penaltiesApplied);
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


