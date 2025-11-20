---
title: "Worker Analysis Pipeline"
status: "Prototype"
last_updated: "2025-11-13"
---

The worker service orchestrates asynchronous content analysis via BullMQ. Jobs arrive with the structure defined in `packages/shared/src/index.ts` (`AnalysisJobPayload`). The current pipeline is a deterministic stub that exercises the full data flow and persistence layers so we can swap in real AI modules later.

## Pipeline stages

1. **Normalization**
   - Ensure text is available (falls back to `contentUri` or placeholder).
   - Produces `PipelineContext` with a trimmed `normalizedText`.

2. **Topic Classification**
   - Calls OpenAI `gpt-4.1-mini` (requires `OPENAI_API_KEY`) with a JSON-only response schema.
   - Falls back to keyword heuristics if the API call fails or confidence < 0.55.
   - Persists rationale/confidence in the `resultJson` payload for transparency.

3. **Claim Extraction**
   - Uses OpenAI `gpt-4.1-mini` with a strict JSON schema to extract up to 3 verifiable claims.
   - Falls back to sentence heuristics when the LLM cannot comply (metadata records this).
   - Captures extraction confidence and verdict suggestions per claim.

4. **Evidence Retrieval**
   - Calls configured retrievers (Brave Search, Serper.dev, Google Fact Check) per claim.
   - Falls back to synthetic evidence when no API keys are supplied or results are empty.
   - Deduplicates evidence by URL and stores provider/title/summary/reliability.

5. **Evidence Evaluation**
   - Runs OpenAI to score each evidence item’s reliability and relevance; adjusts trust scores accordingly.
   - Blacklists known misinformation domains and whitelists high-trust outlets (WHO, CDC, Reuters, etc.).

6. **LLM Reasoning**
   - Feeds claims + evaluated evidence into GPT to produce the final verdict, confidence, summary, and recommendation.
   - Returns supporting evidence keys for each claim, which feed the explanation steps.

5. **Verdict Synthesis**
   - Aggregates claim confidences + source reliability to compute score, verdict, confidence, summary, recommendation.

6. **Persistence**
   - Runs inside a Drizzle transaction:
     - Updates `analyses` row with score, verdict, bias, summary, recommendation, result JSON blob.
     - Inserts `sources`, `claims`, `analysis_sources`, `explanation_steps`.
   - Errors transition the analysis status to `FAILED` with a placeholder summary.

## Error handling

- Input payload validated via `analysisJobPayloadSchema`.
- Pipeline exceptions are logged and cause the analysis to be marked `FAILED`.
- Queue events (`QueueEvents`) log completion/failure for observability.

## Next milestones

- Replace keyword heuristics with actual classifiers (LLM or zero-shot models).
- Integrate retrieval adapters (Brave, Google Fact Check, PubMed, etc.).
- Produce real explanation chains and confidence scores.
- Add unit tests for each stage and property-based tests for persistence.
- Capture timing/usage metrics for monitoring.

