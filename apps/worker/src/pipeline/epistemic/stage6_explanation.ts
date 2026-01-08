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
  KeyReason,
  KeyReasonSentiment
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
 * Determine claim category for contextual reason generation.
 * Different claim types need different explanations.
 */
function getClaimCategory(claims: TypedClaim[], evidence: EvidenceGraph): "factual_event" | "science_health" | "prediction" | "opinion" | "general" {
  // Check source types for context
  const stats = evidence.stats;
  const sourceTypes = stats.sourceTypeDistribution || {};
  const hasNewsReports = (sourceTypes.news_report || 0) >= 2;
  const hasPeerReviewed = stats.peerReviewedCount >= 1;
  const hasInstitutional = (sourceTypes.institutional_consensus || 0) >= 1;
  
  // Check claim types
  const hasPredictive = claims.some(c => c.primaryType === "predictive");
  const hasCausal = claims.some(c => c.primaryType === "causal");
  const hasNormative = claims.some(c => c.isNormative);
  const isEmpiricalObservational = claims.some(c => c.primaryType === "empirical_observational");
  
  // Check timeframe - past events are factual
  const isPastEvent = claims.some(c => c.timeframe?.type === "past");
  
  if (hasPredictive) return "prediction";
  if (hasNormative) return "opinion";
  if (isPastEvent && hasNewsReports && !hasPeerReviewed) return "factual_event";
  if (hasPeerReviewed || hasInstitutional || hasCausal) return "science_health";
  if (isEmpiricalObservational && isPastEvent) return "factual_event";
  
  return "general";
}

/**
 * Check if a penalty is relevant for the given claim category.
 * Some penalties don't make sense for certain claim types.
 */
function isPenaltyRelevant(penaltyName: string, claimCategory: string, claims: TypedClaim[]): boolean {
  // Penalties that don't apply to factual event claims (celebrity news, historical events)
  const notForFactualEvents = [
    "Ambiguous quantifiers",  // Factual events usually don't have quantifiers
    "Model dependence",       // Not relevant for past events
    "Low expert consensus",   // Celebrity/news claims don't need expert consensus
    "Rhetorical certainty",   // Factual events are either true or false
  ];
  
  // Penalties that don't apply to predictions
  const notForPredictions = [
    "Outdated evidence",      // Future claims can't have outdated evidence about themselves
  ];
  
  // Check if claim actually has quantifiers before including ambiguous_quantifiers penalty
  const hasQuantifiers = claims.some(c => 
    c.quantifiers.length > 0 && 
    !c.quantifiers.every(q => q === "none" || q === "precise")
  );
  
  if (penaltyName === "Ambiguous quantifiers" && !hasQuantifiers) {
    return false;
  }
  
  if (claimCategory === "factual_event" && notForFactualEvents.includes(penaltyName)) {
    return false;
  }
  
  if (claimCategory === "prediction" && notForPredictions.includes(penaltyName)) {
    return false;
  }
  
  return true;
}

/**
 * Generate 3-5 concise key reasons summarizing main factors influencing the verdict.
 * 
 * Rules:
 * - Each reason includes text and sentiment (positive/negative/neutral)
 * - Reasons are contextually relevant to the claim type
 * - Use simple, conversational language
 * - No irrelevant penalties for the claim category
 */
function generateKeyReasons(
  scoringResult: ScoringResult,
  evidence: EvidenceGraph,
  topPenalties: Array<{ name: string; weight: number; rationale: string }>,
  claims: TypedClaim[]
): KeyReason[] {
  const reasons: KeyReason[] = [];
  const stats = evidence.stats;
  const { finalScore } = scoringResult;
  
  // Determine claim category for contextual reasoning
  const claimCategory = getClaimCategory(claims, evidence);

  // Reason 1: Evidence alignment (always relevant)
  if (stats.totalSources === 0) {
    reasons.push({ 
      text: "We couldn't find reliable sources to check this claim.", 
      sentiment: "NEGATIVE" 
    });
  } else if (stats.supportingCount > stats.refutingCount && stats.supportingCount >= 2) {
    if (finalScore >= 75) {
      reasons.push({ 
        text: `${stats.supportingCount} different sources back up this claim.`, 
        sentiment: "POSITIVE" 
      });
    } else {
      reasons.push({ 
        text: `${stats.supportingCount} source${stats.supportingCount > 1 ? "s" : ""} partly support${stats.supportingCount === 1 ? "s" : ""} this, but with some caveats.`, 
        sentiment: "NEUTRAL" 
      });
    }
  } else if (stats.refutingCount > stats.supportingCount && stats.refutingCount >= 1) {
    reasons.push({ 
      text: `${stats.refutingCount} source${stats.refutingCount > 1 ? "s" : ""} disagree${stats.refutingCount === 1 ? "s" : ""} with key parts of this claim.`, 
      sentiment: "NEGATIVE" 
    });
  } else if (stats.supportingCount > 0 && stats.refutingCount > 0) {
    reasons.push({ 
      text: "Sources are split — some agree, some disagree.", 
      sentiment: "NEUTRAL" 
    });
  } else if (stats.totalSources > 0) {
    reasons.push({ 
      text: `We found ${stats.totalSources} source${stats.totalSources > 1 ? "s" : ""} with related info, but nothing that directly confirms or denies this.`, 
      sentiment: "NEUTRAL" 
    });
  }

  // Reason 2: Source quality/diversity (contextual based on claim type)
  if (claimCategory === "science_health" && stats.peerReviewedCount >= 1 && finalScore >= 60) {
    reasons.push({ 
      text: `Backed by ${stats.peerReviewedCount} scientific/research source${stats.peerReviewedCount > 1 ? "s" : ""}.`, 
      sentiment: "POSITIVE" 
    });
  } else if (claimCategory === "factual_event" && stats.uniqueHostnames >= 3) {
    reasons.push({ 
      text: `Multiple news outlets reported on this independently.`, 
      sentiment: "POSITIVE" 
    });
  } else if (stats.singleSourceDominance && stats.dominantHostname) {
    reasons.push({ 
      text: `Most info comes from one place (${stats.dominantHostname}), so it's harder to double-check.`, 
      sentiment: "NEGATIVE" 
    });
  } else if (stats.uniqueHostnames >= 3) {
    reasons.push({ 
      text: `Info comes from ${stats.uniqueHostnames} different sources, which adds credibility.`, 
      sentiment: "POSITIVE" 
    });
  }

  // Reason 3-5: Based on top penalties (only include relevant ones)
  for (const penalty of topPenalties.slice(0, 3)) {
    if (reasons.length >= 5) break;
    
    // Skip irrelevant penalties for this claim type
    if (!isPenaltyRelevant(penalty.name, claimCategory, claims)) {
      continue;
    }
    
    const reason = convertPenaltyToReason(penalty.name, penalty.rationale, claims, claimCategory);
    if (reason && !reasons.some(r => r.text === reason.text)) {
      reasons.push(reason);
    }
  }

  // Add claim-type-specific observations if we need more reasons
  if (reasons.length < 3) {
    if (claimCategory === "factual_event" && finalScore >= 75) {
      reasons.push({ 
        text: "This event has been widely reported and documented.", 
        sentiment: "POSITIVE" 
      });
    } else if (claimCategory === "prediction") {
      reasons.push({ 
        text: "This is a prediction about the future, which can't be fully verified yet.", 
        sentiment: "NEUTRAL" 
      });
    } else if (claimCategory === "science_health") {
      const hasCausal = claims.some(c => c.primaryType === "causal");
      if (hasCausal && finalScore < 75) {
        reasons.push({ 
          text: "The claim says one thing causes another, but the evidence doesn't fully support that.", 
          sentiment: "NEGATIVE" 
        });
      }
    }
  }

  // Ensure we have at least 3 reasons with appropriate fallbacks
  if (reasons.length < 3 && stats.totalSources > 0) {
    if (stats.averageReliability >= 0.7) {
      reasons.push({ 
        text: "The sources we checked are well-known and generally reliable.", 
        sentiment: "POSITIVE" 
      });
    } else if (stats.averageReliability < 0.5) {
      reasons.push({ 
        text: "The available sources aren't well-established, so take this with a grain of salt.", 
        sentiment: "NEGATIVE" 
      });
    }
  }

  // Final fallback based on score
  if (reasons.length < 3) {
    if (finalScore >= 75) {
      reasons.push({ 
        text: "The evidence lines up well with what's being claimed.", 
        sentiment: "POSITIVE" 
      });
    } else if (finalScore >= 45) {
      reasons.push({ 
        text: "We found some supporting info, but there are gaps.", 
        sentiment: "NEUTRAL" 
      });
    } else {
      reasons.push({ 
        text: "The evidence we found doesn't really support this claim.", 
        sentiment: "NEGATIVE" 
      });
    }
  }

  // Return 3-5 unique reasons
  return reasons.slice(0, 5);
}

/**
 * Convert a penalty name to a user-friendly reason with sentiment.
 * All penalties are negative by nature (they reduce the score).
 */
function convertPenaltyToReason(
  penaltyName: string,
  _rationale: string,
  claims: TypedClaim[],
  claimCategory: string
): KeyReason | null {
  // All penalties indicate issues, so sentiment is negative
  const sentiment: KeyReasonSentiment = "NEGATIVE";
  
  switch (penaltyName) {
    case "Evidence contradiction":
      return { text: "The evidence we found actually contradicts this claim.", sentiment };
    case "Model dependence":
      return { text: "This is based on predictions/estimates, not hard facts.", sentiment };
    case "Temporal mismatch":
      return { text: "The dates or timeframes don't quite match up with the evidence.", sentiment };
    case "Missing context":
      // Make this more specific based on claim type
      if (claimCategory === "factual_event") {
        return { text: "Some details about this event are missing or unclear.", sentiment };
      }
      return { text: "There's important context missing that could change the meaning.", sentiment };
    case "Causal overreach":
      return { text: "Just because two things happen together doesn't mean one causes the other.", sentiment };
    case "Scope exaggeration":
      return { text: "The claim makes broader statements than the evidence actually supports.", sentiment };
    case "Low expert consensus":
      // Only relevant for science/health claims
      if (claimCategory === "science_health") {
        return { text: "Experts don't all agree on this topic.", sentiment };
      }
      return null;
    case "Outdated evidence":
      return { text: "Some of the information might be outdated.", sentiment };
    case "Selective citation":
      return { text: "The evidence comes from a limited set of sources.", sentiment };
    case "Rhetorical certainty":
      const hasDefiniteMarkers = claims.some(c => c.certaintyLanguage === "definite");
      return { 
        text: hasDefiniteMarkers 
          ? "The claim sounds more certain than the evidence allows."
          : "The claim is stated more confidently than the evidence supports.",
        sentiment 
      };
    case "Ambiguous quantifiers":
      return { text: "Vague words like \"many\" or \"most\" make this hard to verify.", sentiment };
    case "Comparative distortion":
      return { text: "The comparison might be oversimplified or misleading.", sentiment };
    default:
      return null;
  }
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

  // Sentence 1: Verdict + core reason - MUST align with SCORE_BANDS thresholds (90, 75, 60, 45, 30, 15, 0)
  if (finalScore >= 90) {
    // STRONGLY_SUPPORTED (90-100) - MUST affirm strong corroboration
    if (stats.supportingCount > stats.refutingCount * 2 && stats.supportingCount >= 2) {
      parts.push("Multiple independent sources confirm this claim.");
    } else if (stats.supportingCount >= 2) {
      parts.push("Independent sources verify this claim.");
    } else {
      parts.push("Available evidence strongly supports this claim.");
    }
  } else if (finalScore >= 75) {
    // SUPPORTED (75-89) - Strong support with minor caveats
    if (stats.supportingCount > stats.refutingCount * 2 && stats.supportingCount >= 2) {
      parts.push("Multiple sources support this claim.");
    } else {
      parts.push("Available evidence generally supports this claim.");
    }
  } else if (finalScore >= 60) {
    // PLAUSIBLE (60-74) - Plausible but conditional
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
    // MIXED (45-59) - Mixed or contested
    if (stats.supportingCount > 0 && stats.refutingCount > 0) {
      parts.push("Evidence is divided on this claim, with sources both supporting and contradicting it.");
    } else {
      parts.push("Available evidence is inconclusive on this claim.");
    }
  } else if (finalScore >= 30) {
    // WEAKLY_SUPPORTED (30-44) - MUST acknowledge lack of independent verification
    // Check if PRIMARY penalty is about lack of verification (not just any penalty in the list)
    const isPrimaryLowConsensus = primaryOriginalPenalty?.name === "low_expert_consensus";
    const isPrimarySelectiveCitation = primaryOriginalPenalty?.name === "selective_citation";
    
    if (isPrimaryLowConsensus || isPrimarySelectiveCitation) {
      parts.push("This claim rests primarily on assertions without broad independent corroboration.");
    } else if (stats.refutingCount >= 2) {
      parts.push("Multiple sources contradict key aspects of this claim.");
    } else {
      parts.push("Key elements of this claim lack independent verification.");
    }
  } else if (finalScore >= 15) {
    // MOSTLY_FALSE (15-29) - Mostly false
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
    } else if (stats.refutingCount >= 2) {
      parts.push("Multiple sources contradict this claim.");
    } else {
      parts.push("Available evidence contradicts this claim.");
    }
  } else {
    // FALSE (0-14) - False or deceptive
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
          parts.push("Available evidence overwhelmingly refutes this claim.");
        } else if (refuting >= 2) {
          parts.push("Multiple independent sources refute this claim.");
        } else {
          parts.push("Available evidence refutes this claim.");
        }
      } else {
        parts.push("Available evidence refutes this claim.");
      }
    } else if (stats.refutingCount >= 2) {
      parts.push("Multiple sources refute this claim.");
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
  const keyReasons = generateKeyReasons(scoringResult, evidenceGraph, topPenalties, input.typedClaims);

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
    explanationText,
    keyReasons
  };

  return {
    explanation,
    durationMs: Date.now() - startTime
  };
}


