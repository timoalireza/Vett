import { openai } from "../../clients/openai.js";
import type { EvidenceResult } from "../retrievers/types.js";
import { parseJsonContent } from "../utils/openai.js";
import { recordEvidenceReliability } from "../retrievers/trust.js";

const MODEL_NAME = "gpt-5.2";
const MAX_EVIDENCE_PER_REQUEST = 3;

const EVIDENCE_PROMPT = `
You are assisting in fact-checking. Evaluate each evidence item relative to the provided claim.
For every evidence entry respond in English JSON matching the schema. Score reliability and relevance between 0 and 1.
Reliability considers the trustworthiness of the source itself; relevance reflects how directly it supports or refutes the claim.
Return concise assessments (<=140 chars).
If the evidence is in another language, translate the assessment to English.
Also provide a stance label:
- supports: clearly supports the claim
- refutes: clearly contradicts the claim
- mixed: includes both supporting and refuting info
- unclear: related but not definitive
- irrelevant: not about the claim
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

  // OPTIMIZATION: Process batches in parallel if multiple batches exist
  const batches: EvidenceResult[][] = [];
  for (let i = 0; i < evidence.length; i += MAX_EVIDENCE_PER_REQUEST) {
    batches.push(evidence.slice(i, i + MAX_EVIDENCE_PER_REQUEST));
  }

  // Process all batches in parallel for faster evaluation
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
    try {
      const response = await openai.responses.create({
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
      });

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

  return batchResults.flat();
}


