import { randomUUID } from "node:crypto";

import { openai } from "../../clients/openai.js";
import type { PipelineClaim, ClaimExtractionMetadata } from "../types.js";
import { parseJsonContent } from "../utils/openai.js";

type ClaimWithoutSources = Omit<PipelineClaim, "sourceKeys">;

const MODEL_NAME = "gpt-5.2";
const MAX_CLAIMS = 3;

const FALLBACK_VERDICT: PipelineClaim["verdict"] = "Opinion";

const JSON_SCHEMA = {
  type: "object",
  properties: {
    claims: {
      type: "array",
      minItems: 0,
      maxItems: MAX_CLAIMS,
      items: {
        type: "object",
        properties: {
          text: { type: "string", minLength: 6, maxLength: 512 },
          verdict: {
            type: "string",
            enum: ["Verified", "Mostly Accurate", "Partially Accurate", "False", "Opinion"]
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1
          },
          extraction_confidence: {
            type: "number",
            minimum: 0,
            maximum: 1
          }
        },
        required: ["text", "verdict", "confidence", "extraction_confidence"],
        additionalProperties: false
      }
    }
  },
  required: ["claims"],
  additionalProperties: false
} as const;

const SYSTEM_PROMPT = `
You are an expert fact-checking assistant. Extract concise factual claims (max ${MAX_CLAIMS}) from the provided content.
Rules:
- A claim should be a verifiable statement, not personal opinion or rhetorical question.
- If no suitable claim is present, return an empty array.
- When unsure, mark the claim verdict as "Opinion".
- Confidence reflects belief in how objective/verifiable the claim is.
- extraction_confidence reflects your certainty that you correctly extracted the claim.
- Keep each claim text under 200 characters.
- Output all information in English, translating the input where necessary.
`;

type ClaimExtractionOutput = {
  claims: ClaimWithoutSources[];
  meta: ClaimExtractionMetadata;
};

function fallbackClaims(text: string): ClaimExtractionOutput {
  const sentences = text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, MAX_CLAIMS);

  const claims =
    sentences.length > 0
      ? sentences.map((sentence, index) => ({
          id: randomUUID(),
          text: sentence,
          extractionConfidence: Number((0.55 + index * 0.1).toFixed(2)),
          verdict: (index === 0 ? "Mostly Accurate" : FALLBACK_VERDICT) as PipelineClaim["verdict"],
          confidence: Number((0.55 + index * 0.08).toFixed(2))
        }))
      : [
          {
            id: randomUUID(),
            text: "No concrete factual claims detected.",
            extractionConfidence: 0.4,
            verdict: "Opinion" as PipelineClaim["verdict"],
            confidence: 0.4
          }
        ];

  return {
    claims,
    meta: {
      model: "heuristic-sentences",
      usedFallback: true,
      totalClaims: claims.length,
      warnings: ["LLM extraction unavailable; using heuristic sentences."]
    }
  };
}

function normaliseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && value >= 0 && value <= 1) {
    return Number(value.toFixed(2));
  }
  return fallback;
}

export async function extractClaimsWithOpenAI(text: string): Promise<ClaimExtractionOutput> {
  const trimmed = text.trim();
  if (!trimmed) {
    return fallbackClaims("No textual content provided.");
  }

  try {
    const response = await openai.responses.create({
      model: MODEL_NAME,
      input: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: trimmed
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "claim_extraction",
          schema: JSON_SCHEMA,
          strict: true
        }
      }
    });

    const firstOutput = response.output?.[0] as any;
    const firstContent = firstOutput?.content?.[0];

    if (!firstOutput || !firstContent) {
      return fallbackClaims(trimmed);
    }

    const parsed = await parseJsonContent<{
      claims: Array<{
        text?: unknown;
        verdict?: unknown;
        confidence?: unknown;
        extraction_confidence?: unknown;
        notes?: unknown;
      }>;
      warnings?: unknown;
    }>(firstContent, "claim_extraction");

    if (!parsed) {
      return fallbackClaims(trimmed);
    }

    const claims: ClaimWithoutSources[] = parsed.claims
      .map((claimCandidate) => {
        if (typeof claimCandidate.text !== "string" || claimCandidate.text.trim().length < 6) {
          return null;
        }
        const verdict =
          typeof claimCandidate.verdict === "string" &&
          ["Verified", "Mostly Accurate", "Partially Accurate", "False", "Opinion"].includes(claimCandidate.verdict)
            ? (claimCandidate.verdict as PipelineClaim["verdict"])
            : FALLBACK_VERDICT;

        return {
          id: randomUUID(),
          text: claimCandidate.text.trim(),
          extractionConfidence: normaliseNumber(claimCandidate.extraction_confidence, 0.7),
          verdict,
          confidence: normaliseNumber(claimCandidate.confidence, verdict === "Opinion" ? 0.5 : 0.65)
        };
      })
      .filter((claim): claim is NonNullable<typeof claim> => claim !== null)
      .slice(0, MAX_CLAIMS) as ClaimWithoutSources[];

    if (claims.length === 0) {
      return fallbackClaims(trimmed);
    }

    const warnings =
      Array.isArray(parsed.warnings) && parsed.warnings.every((item) => typeof item === "string")
        ? (parsed.warnings as string[])
        : undefined;

    return {
      claims,
      meta: {
        model: MODEL_NAME,
        usedFallback: false,
        totalClaims: claims.length,
        warnings
      }
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Claim extraction failed:", error);
    return fallbackClaims(trimmed);
  }
}


