import { openai } from "../../clients/openai.js";
import type { EvidenceResult } from "../retrievers/types.js";
import { parseJsonContent } from "../utils/openai.js";
import { recordEvidenceReliability } from "../retrievers/trust.js";

const MODEL_NAME = process.env.EVIDENCE_EVALUATOR_MODEL ?? "gpt-4o-mini";
const MAX_EVIDENCE_PER_REQUEST = 5;
const EVIDENCE_EVALUATION_TIMEOUT_MS = Number(process.env.EVIDENCE_EVALUATION_TIMEOUT_MS ?? 3_500);
const CACHE_TTL_MS = Number(process.env.EVIDENCE_EVALUATION_CACHE_TTL_MS ?? 10 * 60 * 1000);

type CacheEntry = { expiresAt: number; results: EvidenceResult[] };
const evaluationCache = new Map<string, CacheEntry>();

function cacheKey(claimText: string, evidence: EvidenceResult[]): string {
  return JSON.stringify({
    claim: claimText.trim().toLowerCase(),
    evidence: evidence.map((e) => ({
      url: e.url,
      provider: e.provider,
      title: e.title,
      summary: (e.summary ?? "").slice(0, 500)
    }))
  });
}

function getCachedEvaluation(claimText: string, evidence: EvidenceResult[]): EvidenceResult[] | null {
  const key = cacheKey(claimText, evidence);
  const entry = evaluationCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    evaluationCache.delete(key);
    return null;
  }
  // return a fresh copy so callers can mutate safely
  return entry.results.map((r) => ({ ...r, evaluation: r.evaluation ? { ...r.evaluation } : undefined }));
}

function setCachedEvaluation(claimText: string, evidence: EvidenceResult[], results: EvidenceResult[]): void {
  const key = cacheKey(claimText, evidence);
  evaluationCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    results: results.map((r) => ({ ...r, evaluation: r.evaluation ? { ...r.evaluation } : undefined }))
  });
}

function pruneEvaluationCache(): void {
  const now = Date.now();
  for (const [key, entry] of evaluationCache.entries()) {
    if (entry.expiresAt <= now) {
      evaluationCache.delete(key);
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

const EVIDENCE_PROMPT = `
You are assisting in fact-checking. Evaluate each evidence item relative to the provided claim.
For every evidence entry respond in English JSON matching the schema. Score reliability and relevance between 0 and 1.
Reliability considers the trustworthiness of the source itself; relevance reflects how directly it supports or refutes the claim.
Return concise assessments (<=140 chars).
If the evidence is in another language, translate the assessment to English.
Also provide a stance label:
- supports: clearly supports the claim
- refutes: clearly contradicts the core claim (the main event/statement is wrong)
- mixed: includes both supporting and refuting info
- unclear: related but not definitive
- irrelevant: not about the claim

DETAIL SENSITIVITY (IMPORTANT):
- If the evidence supports the core event but contradicts a specific detail (numbers/amounts, dates, locations, who did it),
  label stance as "mixed" (NOT "refutes") and keep relevance relatively high.
- Use "refutes" mainly when the evidence indicates the core event did not happen, is fabricated, or is about a different event entirely.
- If the only disagreement is the exact number/amount, this is usually "mixed" (not "refutes").
`;

const JSON_SCHEMA = {
  type: "object",
  properties: {
    evaluations: {
      type: "array",
      minItems: 1,
      maxItems: MAX_EVIDENCE_PER_REQUEST,
      items: {
        type: "object",
        properties: {
          index: { type: "integer", minimum: 0 },
          reliability: { type: "number", minimum: 0, maximum: 1 },
          relevance: { type: "number", minimum: 0, maximum: 1 },
          stance: { type: "string", enum: ["supports", "refutes", "mixed", "unclear", "irrelevant"] },
          assessment: { type: "string", maxLength: 140 }
        },
        required: ["index", "reliability", "relevance", "stance", "assessment"],
        additionalProperties: false
      }
    }
  },
  required: ["evaluations"],
  additionalProperties: false
} as const;

function clampScore(value: number | undefined, fallback = 0.6): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

export async function evaluateEvidenceForClaim(
  claimText: string,
  evidence: EvidenceResult[]
): Promise<EvidenceResult[]> {
  if (evidence.length === 0) {
    return evidence;
  }

  pruneEvaluationCache();
  const cached = getCachedEvaluation(claimText, evidence);
  if (cached) {
    return cached;
  }

  // OPTIMIZATION: Process batches in parallel if multiple batches exist
  const batches: EvidenceResult[][] = [];
  for (let i = 0; i < evidence.length; i += MAX_EVIDENCE_PER_REQUEST) {
    batches.push(evidence.slice(i, i + MAX_EVIDENCE_PER_REQUEST));
  }

  // Process all batches in parallel for faster evaluation
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
    try {
      const response = await withTimeout(
        openai.responses.create({
          model: MODEL_NAME,
          input: [
            {
              role: "system",
              content: EVIDENCE_PROMPT
            },
            {
              role: "user",
              content: JSON.stringify({
                claim: claimText,
                evidence: batch.map((item, index) => ({
                  index,
                  provider: item.provider,
                  title: item.title,
                  url: item.url,
                  summary: item.summary ?? ""
                }))
              })
            }
          ],
          text: {
            format: {
              type: "json_schema",
              name: "evidence_evaluation",
              schema: JSON_SCHEMA,
              strict: true
            }
          }
        }),
        EVIDENCE_EVALUATION_TIMEOUT_MS,
        "Evidence evaluation"
      );

      const firstOutput = response.output?.[0] as any;
      const firstContent = firstOutput?.content?.[0];
      if (!firstOutput || !firstContent) {
        return batch;
      }

      const parsed = await parseJsonContent<{
        evaluations?: Array<{
          index?: number;
          reliability?: number;
          relevance?: number;
          stance?: "supports" | "refutes" | "mixed" | "unclear" | "irrelevant";
          assessment?: string;
        }>;
      }>(firstContent, "evidence_evaluation");
      if (!parsed) {
        return batch;
      }

      const evaluations = parsed.evaluations ?? [];

      batch.forEach((item, idx) => {
        const evaluation = evaluations.find((entry) => entry.index === idx);
        if (evaluation) {
          item.evaluation = {
            reliability: clampScore(evaluation.reliability, item.reliability),
            relevance: clampScore(evaluation.relevance, 0.6),
            stance:
              evaluation.stance === "supports" ||
              evaluation.stance === "refutes" ||
              evaluation.stance === "mixed" ||
              evaluation.stance === "unclear" ||
              evaluation.stance === "irrelevant"
                ? evaluation.stance
                : "unclear",
            assessment:
              typeof evaluation.assessment === "string" && evaluation.assessment.length > 0
                ? evaluation.assessment
                : "No assessment provided."
          };
          const baseReliability = typeof item.reliability === "number" ? item.reliability : 0.6;
          const blendedReliability = (item.evaluation.reliability + baseReliability) / 2;
          item.reliability = Number(blendedReliability.toFixed(2));
          recordEvidenceReliability(item.url, item.evaluation.reliability);
        }
      });

      return batch;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Evidence evaluation failed:", error);
      return batch;
    }
    })
  );

  const evaluated = batchResults.flat();
  setCachedEvaluation(claimText, evidence, evaluated);
  return evaluated;
}


