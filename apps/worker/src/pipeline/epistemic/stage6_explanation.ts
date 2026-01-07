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
  SCORE_BANDS
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
 * Goal: Provide purely factual background - WHO, WHAT, WHEN, WHERE.
 * 3-5 sentences maximum.
 * 
 * - State what was claimed and by whom (if known from claim structure)
 * - Provide neutral definitions or background concepts
 * - Clarify what type of claim this is (predictive, causal, comparative, etc.)
 * - Note structural features (uses absolute language, makes comparisons, etc.)
 * 
 * Tone: Neutral, encyclopedic. Like setting up a problem statement.
 * DO NOT: Evaluate evidence quality, use judgmental language ("alleged", "unsubstantiated"),
 *         analyze or weigh evidence (save for Summary), restate the verdict/summary
 */
function generateEvidenceSummary(evidence: EvidenceGraph, claims: TypedClaim[], penalties: Penalty[]): string {
  const stats = evidence.stats;
  const parts: string[] = [];

  if (stats.totalSources === 0) {
    return "No reliable sources were available to assess this claim. The topic may be too specific, too recent, or not well-documented.";
  }

  // Describe what kind of claim this is (factual, neutral description)
  const hasPredictiveClaim = claims.some((c) => c.primaryType === "predictive");
  const hasCausalClaim = claims.some((c) => c.primaryType === "causal");
  const hasComparativeClaim = claims.some((c) => c.primaryType === "comparative");
  const hasUniversalQuantifier = claims.some((c) => c.quantifiers.includes("universal"));
  const hasVagueQuantifier = claims.some((c) => c.quantifiers.includes("vague"));

  // Start with neutral claim type description
  if (hasPredictiveClaim) {
    parts.push("This claim makes a prediction about future events or outcomes.");
    parts.push("Predictions typically involve projections based on current data and assumptions.");
  } else if (hasCausalClaim) {
    parts.push("This claim asserts a cause-and-effect relationship between events or factors.");
    parts.push("Causal claims require evidence showing that one thing directly causes another, not just correlation.");
  } else if (hasComparativeClaim) {
    parts.push("This claim makes a comparison between two or more things.");
    parts.push("Comparisons depend on the methodology and criteria used for measurement.");
  }

  // Describe claim structure (neutral, factual)
  if (hasUniversalQuantifier) {
    parts.push("The claim uses absolute terms like 'always,' 'never,' or 'all.'");
  } else if (hasVagueQuantifier) {
    parts.push("The claim uses imprecise quantifiers that lack specific numbers.");
  }

  // Note scope or framing (neutral description, not evaluation)
  const hasContextIssue = penalties.some((p) => 
    p.name === "context_omission" || p.name === "scope_exaggeration"
  );
  if (hasContextIssue && parts.length < 4) {
    parts.push("The claim's scope or applicable conditions are not fully specified.");
  }

  // Provide general background if nothing else to say
  if (parts.length === 0) {
    parts.push("This claim makes a factual assertion about a specific topic.");
  }
  
  // Add a second neutral sentence if we only have one
  if (parts.length === 1) {
    if (claims.length > 1) {
      parts.push("Multiple related assertions are bundled in this claim.");
    } else {
      parts.push("Understanding this claim requires considering its specific context and scope.");
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
 * Goal: Evaluate the claim's accuracy based on evidence.
 * 2-3 sentences maximum.
 * 
 * Structure:
 * - Sentence 1: State what is verified vs. unverified
 * - Sentence 2 (optional): Key limitation or uncertainty
 * - Sentence 3 (optional): Scope clarification
 * 
 * CRITICAL: Language MUST align with score band:
 * - 75+: Affirm strong independent corroboration ("independently confirmed", "multiple sources verify")
 * - 45-74: Balanced ("generally supported", "partially verified")
 * - 30-40: Acknowledge lack of verification ("alleged", "claimed without independent confirmation")
 * - <30: State contradiction clearly
 * 
 * Tone: Calm, neutral, factual. No confidence theater. No exaggeration or minimization.
 * DO NOT: Cite sources by name, use bullet points, use percentages, use emojis, 
 *         introduce new claims, or use "true"/"false" unless part of verdict label
 */
function generateExplanationText(
  scoringResult: ScoringResult,
  evidence: EvidenceGraph,
  topPenalties: Array<{ name: string; weight: number; rationale: string }>,
  _claims: TypedClaim[],
  originalPenalties: Penalty[]
): string {
  const { finalScore } = scoringResult;
  const stats = evidence.stats;
  const parts: string[] = [];
  
  // Get the primary penalty with its specific rationale (highest weight)
  const primaryPenalty = topPenalties.length > 0 ? topPenalties[0] : null;
  
  // Sort originalPenalties by weight to find the true primary penalty for snake_case name checks
  const sortedOriginalPenalties = [...originalPenalties].sort((a, b) => b.weight - a.weight);
  const primaryOriginalPenalty = sortedOriginalPenalties.length > 0 ? sortedOriginalPenalties[0] : null;

  // Sentence 1: Verdict + core reason - MUST align with score band
  if (finalScore >= 75) {
    // Strongly Supported / Supported - MUST affirm strong corroboration
    if (stats.supportingCount > stats.refutingCount * 2 && stats.supportingCount >= 2) {
      parts.push("Multiple independent sources confirm this claim.");
    } else if (stats.supportingCount >= 2) {
      parts.push("Independent sources verify this claim.");
    } else {
      parts.push("Available evidence strongly supports this claim.");
    }
  } else if (finalScore >= 61) {
    // Mostly Accurate (61-75)
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
    // Mixed - balanced language
    if (stats.supportingCount > 0 && stats.refutingCount > 0) {
      parts.push("Evidence is divided on this claim, with sources both supporting and contradicting it.");
    } else {
      parts.push("Available evidence is inconclusive on this claim.");
    }
  } else if (finalScore >= 30) {
    // Weakly Supported - MUST acknowledge lack of independent verification
    const hasLowConsensus = originalPenalties.some((p) => p.name === "low_expert_consensus");
    const hasSelectiveCitation = originalPenalties.some((p) => p.name === "selective_citation");
    
    if (hasLowConsensus || hasSelectiveCitation) {
      parts.push("This claim rests primarily on assertions without broad independent corroboration.");
    } else if (stats.refutingCount >= 2) {
      parts.push("Multiple sources contradict key aspects of this claim.");
    } else {
      parts.push("Key elements of this claim lack independent verification.");
    }
  } else {
    // False
    const hasEvidenceContradiction = primaryOriginalPenalty?.name === "evidence_contradiction";
    if (hasEvidenceContradiction && primaryPenalty && primaryPenalty.rationale) {
      // Extract source counts from rationale if present (e.g., "9 out of 11 sources refute...")
      const refuteMatch = primaryPenalty.rationale.match(/(\d+)\s+out of\s+(\d+)\s+sources.*refute/i);
      if (refuteMatch) {
        const refuting = parseInt(refuteMatch[1], 10);
        const total = parseInt(refuteMatch[2], 10);
        // Use extracted counts to determine strength of language
        const refutingRatio = refuting / total;
        if (refutingRatio >= 0.8 && total >= 5) {
          parts.push("Available evidence overwhelmingly contradicts this claim.");
        } else if (refuting >= 2) {
          // Only use "multiple" when there are actually 2+ refuting sources
          parts.push("Multiple independent sources refute this claim.");
        } else {
          parts.push("Available evidence contradicts this claim.");
        }
      } else {
        parts.push("Available evidence contradicts this claim.");
      }
    } else if (stats.refutingCount > stats.supportingCount * 2 && stats.refutingCount >= 2) {
      // Only use strong language when there are actually 2+ refuting sources
      parts.push("Available evidence contradicts this claim.");
    } else {
      parts.push("No credible evidence supports this claim.");
    }
  }

  // Sentence 2: Add specific limitation from penalties (if not already covered in sentence 1)
  if (topPenalties.length > 0) {
    // Determine which penalty to use for sentence 2
    // If primary penalty is "Evidence contradiction", use secondary penalty instead
    // - For scores < 45: evidence_contradiction is heavily used in sentence 1, so avoid repeating
    // - For scores >= 45: evidence_contradiction is not discussed in sentence 1, but it's not useful for sentence 2 either
    const isPrimaryEvidenceContradiction = primaryOriginalPenalty?.name === "evidence_contradiction";
    
    const penaltyForSentence2 = isPrimaryEvidenceContradiction && topPenalties.length > 1
      ? topPenalties[1]
      : primaryPenalty;
    
    // Add context if the penalty is not evidence_contradiction
    // Check against the transformed name since penaltyForSentence2 comes from topPenalties
    if (penaltyForSentence2 && penaltyForSentence2.name !== "Evidence contradiction") {
      if (penaltyForSentence2.name === "Model dependence") {
        parts.push("The claim involves future projections rather than established facts.");
      } else if (penaltyForSentence2.name === "Temporal mismatch") {
        parts.push("The timeframe referenced in the claim does not match the evidence.");
      } else if (penaltyForSentence2.name === "Missing context") {
        parts.push("Important qualifying context is missing from the claim.");
      } else if (penaltyForSentence2.name === "Causal overreach") {
        parts.push("The evidence shows association but not the causal link stated.");
      } else if (penaltyForSentence2.name === "Scope exaggeration") {
        parts.push("The claim overgeneralizes from more limited evidence.");
      } else if (penaltyForSentence2.name === "Low expert consensus") {
        parts.push("Expert sources show disagreement on this topic.");
      } else if (penaltyForSentence2.name === "Outdated evidence") {
        parts.push("The available evidence may not reflect current knowledge.");
      } else if (penaltyForSentence2.name === "Selective citation") {
        parts.push("The available evidence comes from a limited range of sources.");
      } else if (penaltyForSentence2.name === "Rhetorical certainty") {
        parts.push("The claim uses definitive language that may overstate certainty.");
      } else if (penaltyForSentence2.name === "Ambiguous quantifiers") {
        parts.push("The claim uses vague quantifiers that make verification difficult.");
      } else if (penaltyForSentence2.name === "Comparative distortion") {
        parts.push("The comparison may oversimplify or depend on specific methodologies.");
      }
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
  const explanationText = generateExplanationText(scoringResult, evidenceGraph, topPenalties, input.typedClaims, scoringResult.penaltiesApplied);

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


