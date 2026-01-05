---
title: "Worker Analysis Pipeline"
status: "Production"
last_updated: "2026-01-05"
---

The worker service orchestrates asynchronous content analysis via BullMQ. Jobs arrive with the structure defined in `packages/shared/src/index.ts` (`AnalysisJobPayload`). 

The pipeline now includes a **graded epistemic evaluator** that produces deterministic, penalty-ledger scoring with mandatory score bands.

## Core Philosophy

This system behaves as a **graded epistemic evaluator**, not a binary fact-checker.

**Goals:**
- Penalize rhetorical certainty
- Reward precision
- Make uncertainty visible
- Scale across domains (science, economics, geopolitics)

**Anti-Goals (STRICT):**
- Do NOT guess intent
- Do NOT "steelman" the claim
- Do NOT assume best-case interpretations
- Do NOT collapse uncertainty into binary verdicts
- Do NOT inflate scores for popular or authoritative claims

> **Score the claim as written, not the version someone meant.**

## Score Bands (MANDATORY)

| Band | Score Range | Description |
|------|-------------|-------------|
| Strongly Supported | 90–100 | High consensus, stable evidence |
| Supported | 75–89 | Supported with minor caveats |
| Plausible | 60–74 | Plausible but conditional |
| Mixed | 45–59 | Mixed or contested |
| Weakly Supported | 30–44 | Weakly supported or misleading |
| Mostly False | 15–29 | Mostly false |
| False | 0–14 | False or deceptive |

## Scoring Mechanism

### Step 1: Initialize
All claims start at **100**.

### Step 2: Apply Penalty Weights (CUMULATIVE)

#### Temporal & Context Penalties
| Penalty | Range |
|---------|-------|
| Temporal mismatch | −10 to −20 |
| Context omission | −5 to −15 |

#### Evidence Quality
| Penalty | Range |
|---------|-------|
| Model dependence | −10 to −25 |
| Low expert consensus | −10 to −20 |

#### Reasoning Errors
| Penalty | Range |
|---------|-------|
| Causal overreach | −10 to −20 |
| Scope exaggeration | −5 to −15 |
| Comparative distortion | −5 to −15 |

#### Language & Framing
| Penalty | Range |
|---------|-------|
| Rhetorical certainty | −5 to −10 |
| Ambiguous quantifiers | −5 to −10 |

#### Data Integrity
| Penalty | Range |
|---------|-------|
| Selective citation | −10 to −20 |
| Outdated evidence | −10 to −20 |

### Step 3: Apply Safeguards
- **Floor rule**: If claim has credible peer-reviewed grounding → score ≥ 20
- **Ceiling rule**: If claim relies primarily on models → score ≤ 75
- **Clamp**: Final score clamped to 0–100

## Pipeline Stages

The analysis pipeline consists of **6 explicit, modular stages**:

```
┌─────────────────────────────────────────────────────────────┐
│                     Analysis Pipeline                        │
├─────────────────────────────────────────────────────────────┤
│  1. Claim Parsing                                           │
│     └─ Extract: subject, predicate, timeframe, geography,  │
│        causal structure, quantifiers, certainty language    │
├─────────────────────────────────────────────────────────────┤
│  2. Claim Typing                                            │
│     └─ Classify: empirical, predictive, comparative,        │
│        causal, normative (flagged but not scored)          │
├─────────────────────────────────────────────────────────────┤
│  3. Evidence Retrieval                                      │
│     └─ Tag sources: empirical, model-based, meta-analysis,  │
│        institutional-consensus; detect single-source bias   │
├─────────────────────────────────────────────────────────────┤
│  4. Failure Mode Detection                                  │
│     └─ Detect and emit named penalties with severity        │
├─────────────────────────────────────────────────────────────┤
│  5. Scoring                                                 │
│     └─ Apply penalties mechanically, enforce safeguards     │
├─────────────────────────────────────────────────────────────┤
│  6. Explanation Generation                                  │
│     └─ Human-readable output: score, band, penalties,       │
│        improvement suggestions, uncertainty statement       │
└─────────────────────────────────────────────────────────────┘
```

### Stage 1: Claim Parsing

**Location:** `apps/worker/src/pipeline/epistemic/stage1_claimParsing.ts`

Extracts structured components from natural language claims:
- Subject and predicate
- Timeframe (past/present/future/unspecified)
- Geography scope (global/regional/national/local)
- Causal vs correlational language
- Quantifiers (universal/existential/majority/vague/precise)
- Certainty markers ("will", "proves", "might")

Output persisted to `resultJson.epistemic.artifacts.claimParsing`.

### Stage 2: Claim Typing

**Location:** `apps/worker/src/pipeline/epistemic/stage2_claimTyping.ts`

Classifies each claim into types:
- **Empirical observational**: Observable facts
- **Predictive**: Future projections
- **Comparative**: Comparing entities
- **Causal**: Asserting causation
- **Normative**: Value judgments (flagged, not scored)

Output persisted to `resultJson.epistemic.artifacts.claimTyping`.

### Stage 3: Evidence Retrieval

**Location:** `apps/worker/src/pipeline/epistemic/stage3_evidenceRetrieval.ts`

Wraps existing retrievers and builds an evidence graph:
- Tags each source as: empirical / model-based / meta-analysis / institutional-consensus
- Detects single-source dominance (>50% from one hostname)
- Computes graph statistics (reliability, peer-reviewed count, etc.)

Output persisted to `resultJson.epistemic.artifacts.evidenceGraph`.

### Stage 4: Failure Mode Detection

**Location:** `apps/worker/src/pipeline/epistemic/stage4_failureModes.ts`

Runs deterministic checks that emit named penalties:
- Each penalty has: name, weight, severity, rationale, affected claims
- Weight calculated from severity within defined ranges

Output persisted to `resultJson.epistemic.artifacts.failureModeDetection`.

### Stage 5: Scoring

**Location:** `apps/worker/src/pipeline/epistemic/stage5_scoring.ts`

Mechanical scoring:
1. Start at 100
2. Subtract all penalty weights
3. Apply floor rule (≥20 if peer-reviewed support)
4. Apply ceiling rule (≤75 if model-dependent)
5. Clamp to 0–100
6. Map to score band

Output persisted to `resultJson.epistemic.artifacts.scoring`.

### Stage 6: Explanation Generation

**Location:** `apps/worker/src/pipeline/epistemic/stage6_explanation.ts`

Generates human-readable explanation:
- Final score and band
- Top 3 penalties with weights and rationales
- Improvement suggestions
- Uncertainty statement
- Evidence summary

Tone: **neutral, non-judgmental, precise**.

## Determinism & Audit Strategy

### Artifact Freezing
Each stage output is stored in `resultJson.epistemic.artifacts.*` with content hashes.

### Re-evaluation Stability
If claim text + evidence graph hash unchanged, scoring reuses frozen artifacts and yields identical `finalScore`/penalties unless evidence changes.

### Audit Log
Every pipeline run produces an audit log with:
- Stage-by-stage timing
- Input/output content hashes
- Success/failure status

## Output Schema

The epistemic pipeline returns a structured payload:

```typescript
interface EpistemicResult {
  version: string;
  finalScore: number;              // 0-100
  scoreBand: string;               // e.g., "Strongly Supported"
  scoreBandDescription: string;
  
  penaltiesApplied: Array<{
    name: string;
    weight: number;
    rationale: string;
    severity: "low" | "medium" | "high";
  }>;
  
  evidenceSummary: string;
  confidenceInterval?: { low: number; high: number };
  explanationText: string;
  
  artifacts: EpistemicArtifacts;   // Full stage outputs
  pipelineVersion: string;
  processedAt: string;
  totalProcessingTimeMs: number;
}
```

## API Integration

The epistemic result is exposed via GraphQL:

```graphql
type AnalysisSummary {
  # ... existing fields ...
  epistemic: EpistemicResult
}

type EpistemicResult {
  version: String!
  finalScore: Int!
  scoreBand: String!
  scoreBandDescription: String!
  penaltiesApplied: [EpistemicPenalty!]!
  evidenceSummary: String!
  confidenceInterval: EpistemicConfidenceInterval
  explanationText: String!
  pipelineVersion: String!
  processedAt: String!
  totalProcessingTimeMs: Int!
}
```

## Mobile UI Integration

The mobile app renders epistemic results:
- **Score Ring**: Uses `scoreBand` for color gradient
- **Result Header**: Shows "Assessment" label with band name
- **Claim Items**: Display per-claim band and top penalty
- **Overview**: Shows explanation text, penalty list, evidence summary

## Legacy Compatibility

For backward compatibility:
- `analyses.score` stores `finalScore`
- `analyses.verdict` mapped from band (Strongly Supported → Verified, etc.)
- Old clients continue to work with legacy fields

## Error Handling

- Input payload validated via `analysisJobPayloadSchema`
- Each stage has try/catch with fallback
- Pipeline exceptions logged and analysis marked `FAILED`
- Queue events (`QueueEvents`) log completion/failure

## Performance

Timing breakdown logged for each run:
- Ingestion
- Classification & Extraction
- Evidence Retrieval & Evaluation
- Epistemic Pipeline
- Legacy Reasoning (deprecated)
- Total

## Next Milestones

- [ ] Improve penalty detection with domain-specific rules
- [ ] Add A/B testing for scoring calibration
- [ ] Implement feedback loop from user corrections
- [ ] Add support for multi-claim composite scoring
