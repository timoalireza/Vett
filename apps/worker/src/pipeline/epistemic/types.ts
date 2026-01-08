/**
 * Epistemic Claim Analysis Pipeline Types
 * 
 * This module defines the core types for the graded epistemic evaluator.
 * The system produces a stable 0-100 confidence score with mandatory score bands,
 * auditable penalty ledgers, and deterministic re-evaluation.
 */

// ============================================================================
// Score Bands (MANDATORY - DO NOT ALTER)
// ============================================================================

export const SCORE_BANDS = {
  STRONGLY_SUPPORTED: { min: 90, max: 100, label: "Strongly Supported", description: "High consensus, stable evidence" },
  SUPPORTED: { min: 75, max: 89, label: "Supported", description: "Supported with minor caveats" },
  PLAUSIBLE: { min: 60, max: 74, label: "Plausible", description: "Plausible but conditional" },
  MIXED: { min: 45, max: 59, label: "Mixed", description: "Mixed or contested" },
  WEAKLY_SUPPORTED: { min: 30, max: 44, label: "Weakly Supported", description: "Weakly supported or misleading" },
  MOSTLY_FALSE: { min: 15, max: 29, label: "Mostly False", description: "Mostly false" },
  FALSE: { min: 0, max: 14, label: "False", description: "False or deceptive" }
} as const;

export type ScoreBandKey = keyof typeof SCORE_BANDS;
export type ScoreBand = typeof SCORE_BANDS[ScoreBandKey];

// ============================================================================
// Claim Types
// ============================================================================

export type ClaimType = 
  | "empirical_observational"
  | "predictive"
  | "comparative"
  | "causal"
  | "normative";

export type CertaintyLanguage = "definite" | "probable" | "possible" | "uncertain" | "none";

export type QuantifierType = 
  | "universal"      // "all", "every", "always"
  | "existential"    // "some", "a few", "exists"
  | "majority"       // "most", "majority"
  | "minority"       // "few", "rarely"
  | "vague"          // "significant", "many", "substantial"
  | "precise"        // specific numbers/percentages
  | "none";

// ============================================================================
// Stage 1: Claim Parsing Output
// ============================================================================

export interface StructuredClaim {
  id: string;
  originalText: string;
  subject: string;
  predicate: string;
  timeframe: {
    type: "past" | "present" | "future" | "unspecified";
    explicit?: string;  // e.g., "2024", "last year"
  };
  geography: {
    scope: "global" | "regional" | "national" | "local" | "unspecified";
    explicit?: string;  // e.g., "United States", "California"
  };
  causalStructure: "causal" | "correlational" | "descriptive" | "unclear";
  quantifiers: QuantifierType[];
  certaintyLanguage: CertaintyLanguage;
  certaintyMarkers: string[];  // actual words like "will", "proves", "might"
}

export interface ClaimParsingArtifact {
  version: string;
  model: string;
  timestamp: string;
  contentHash: string;
  claims: StructuredClaim[];
}

// ============================================================================
// Stage 2: Claim Typing Output
// ============================================================================

export interface TypedClaim extends StructuredClaim {
  types: ClaimType[];
  primaryType: ClaimType;
  isNormative: boolean;  // Flag for normative claims (not scored)
  typingConfidence: number;
  typingRationale: string;
}

export interface ClaimTypingArtifact {
  version: string;
  model: string;
  timestamp: string;
  contentHash: string;
  typedClaims: TypedClaim[];
}

// ============================================================================
// Stage 3: Evidence Retrieval Output
// ============================================================================

export type EvidenceSourceType = 
  | "empirical"
  | "model_based"
  | "meta_analysis"
  | "institutional_consensus"
  | "news_report"
  | "opinion"
  | "unknown";

export interface EvidenceNode {
  id: string;
  url: string;
  hostname: string;
  provider: string;
  title: string;
  summary: string;
  publishedAt?: string;
  
  // Classification
  sourceType: EvidenceSourceType;
  isPeerReviewed: boolean;
  isInstitutional: boolean;
  
  // Quality metrics
  reliability: number;
  relevance: number;
  stance: "supports" | "refutes" | "mixed" | "unclear" | "irrelevant";
  
  // Linkage
  claimIds: string[];  // Which claims this evidence relates to
}

export interface EvidenceGraphStats {
  totalSources: number;
  uniqueHostnames: number;
  hostnameDistribution: Record<string, number>;
  singleSourceDominance: boolean;  // >50% from one hostname
  dominantHostname?: string;
  sourceTypeDistribution: Record<EvidenceSourceType, number>;
  averageReliability: number;
  peerReviewedCount: number;
  modelBasedCount: number;
  supportingCount: number;
  refutingCount: number;
  oldestEvidenceDate?: string;
  newestEvidenceDate?: string;
}

export interface EvidenceGraph {
  nodes: EvidenceNode[];
  stats: EvidenceGraphStats;
  retrievalTimestamp: string;
}

export interface EvidenceRetrievalArtifact {
  version: string;
  timestamp: string;
  contentHash: string;
  evidenceGraph: EvidenceGraph;
}

// ============================================================================
// Stage 4: Failure Mode Detection Output
// ============================================================================

export type PenaltyName =
  // Temporal & Context Penalties
  | "temporal_mismatch"
  | "context_omission"
  // Evidence Quality
  | "model_dependence"
  | "low_expert_consensus"
  // Reasoning Errors
  | "causal_overreach"
  | "scope_exaggeration"
  | "comparative_distortion"
  // Language & Framing
  | "rhetorical_certainty"
  | "ambiguous_quantifiers"
  // Data Integrity
  | "selective_citation"
  | "outdated_evidence"
  | "evidence_contradiction";

export type PenaltySeverity = "low" | "medium" | "high";

export interface Penalty {
  name: PenaltyName;
  weight: number;  // Actual deduction applied
  severity: PenaltySeverity;
  rationale: string;
  affectedClaimIds: string[];
  detectionMethod: "rule_based" | "llm_assisted";
}

export const PENALTY_RANGES: Record<PenaltyName, { min: number; max: number }> = {
  // Temporal & Context Penalties
  temporal_mismatch: { min: 10, max: 20 },
  context_omission: { min: 5, max: 15 },
  // Evidence Quality
  model_dependence: { min: 10, max: 25 },
  low_expert_consensus: { min: 10, max: 20 },
  // Reasoning Errors
  causal_overreach: { min: 10, max: 20 },
  scope_exaggeration: { min: 5, max: 15 },
  comparative_distortion: { min: 5, max: 15 },
  // Language & Framing
  rhetorical_certainty: { min: 5, max: 10 },
  ambiguous_quantifiers: { min: 5, max: 10 },
  // Data Integrity
  selective_citation: { min: 10, max: 20 },
  outdated_evidence: { min: 10, max: 20 },
  evidence_contradiction: { min: 30, max: 70 } // CRITICAL: When evidence refutes claim
};

export interface FailureModeDetectionArtifact {
  version: string;
  timestamp: string;
  contentHash: string;
  penalties: Penalty[];
  totalPenaltyWeight: number;
}

// ============================================================================
// Stage 5: Scoring Output
// ============================================================================

export interface ScoringResult {
  initialScore: 100;
  penaltiesApplied: Penalty[];
  totalPenalties: number;
  rawScore: number;  // After penalties, before safeguards
  
  // Safeguards applied
  floorApplied: boolean;
  floorReason?: string;
  ceilingApplied: boolean;
  ceilingReason?: string;
  
  finalScore: number;  // After safeguards, clamped 0-100
  scoreBand: ScoreBandKey;
  scoreBandLabel: string;
}

export interface ScoringArtifact {
  version: string;
  timestamp: string;
  contentHash: string;
  result: ScoringResult;
}

// ============================================================================
// Stage 6: Explanation Output
// ============================================================================

export type KeyReasonSentiment = "positive" | "negative" | "neutral";

export interface KeyReason {
  text: string;
  sentiment: KeyReasonSentiment;
}

export interface ExplanationOutput {
  finalScore: number;
  scoreBand: string;
  scoreBandDescription: string;
  
  topPenalties: Array<{
    name: string;
    weight: number;
    rationale: string;
  }>;
  
  improvementSuggestions: string[];  // What would need to change
  uncertaintyStatement: string;
  evidenceSummary: string;
  explanationText: string;  // Full human-readable explanation
  keyReasons: KeyReason[];  // 3-5 concise bullet points summarizing main factors
}

// ============================================================================
// Complete Epistemic Result
// ============================================================================

export interface EpistemicArtifacts {
  claimParsing: ClaimParsingArtifact;
  claimTyping: ClaimTypingArtifact;
  evidenceRetrieval: EvidenceRetrievalArtifact;
  failureModeDetection: FailureModeDetectionArtifact;
  scoring: ScoringArtifact;
}

export interface EpistemicResult {
  version: string;
  finalScore: number;
  scoreBand: string;
  scoreBandDescription: string;
  
  penaltiesApplied: Array<{
    name: string;
    weight: number;
    rationale: string;
    severity: PenaltySeverity;
  }>;
  
  evidenceSummary: string;
  confidenceInterval?: {
    low: number;
    high: number;
  };
  explanationText: string;
  keyReasons: KeyReason[];  // 3-5 concise bullet points summarizing main factors
  
  // For determinism/audit
  artifacts: EpistemicArtifacts;
  
  // Metadata
  pipelineVersion: string;
  processedAt: string;
  totalProcessingTimeMs: number;
}

// ============================================================================
// Audit Log
// ============================================================================

export interface StageLog {
  stage: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  inputHash: string;
  outputHash: string;
  success: boolean;
  error?: string;
}

export interface EpistemicAuditLog {
  analysisId: string;
  pipelineVersion: string;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  stages: StageLog[];
  finalScore: number;
  scoreBand: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getScoreBand(score: number): { key: ScoreBandKey; band: ScoreBand } {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  
  if (clampedScore >= 90) return { key: "STRONGLY_SUPPORTED", band: SCORE_BANDS.STRONGLY_SUPPORTED };
  if (clampedScore >= 75) return { key: "SUPPORTED", band: SCORE_BANDS.SUPPORTED };
  if (clampedScore >= 60) return { key: "PLAUSIBLE", band: SCORE_BANDS.PLAUSIBLE };
  if (clampedScore >= 45) return { key: "MIXED", band: SCORE_BANDS.MIXED };
  if (clampedScore >= 30) return { key: "WEAKLY_SUPPORTED", band: SCORE_BANDS.WEAKLY_SUPPORTED };
  if (clampedScore >= 15) return { key: "MOSTLY_FALSE", band: SCORE_BANDS.MOSTLY_FALSE };
  return { key: "FALSE", band: SCORE_BANDS.FALSE };
}

export function computeContentHash(content: unknown): string {
  const str = typeof content === "string" ? content : JSON.stringify(content);
  // Simple hash for determinism checking
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export const EPISTEMIC_PIPELINE_VERSION = "1.0.0";

