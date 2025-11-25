import { openai } from "../../clients/openai.js";
import type { PipelineClaim, PipelineSource } from "../types.js";
import { parseJsonContent } from "../utils/openai.js";

export const VERDICT_MODEL = "gpt-4.1-mini";

const VERDICT_PROMPT = `
You are a fact-checking adjudicator. Given claims and evaluated evidence, produce a grounded verdict.
Respond in English JSON ONLY, matching the schema. Cite evidence using the provided \`key\` values.
If evidence contradicts a claim, LOWER the numeric score. If evidence strongly supports it, raise the score.
Map scores to verdicts as follows:
- 0-25 => "False"
- 26-50 => "Partially True"
- 51-75 => "Mostly Accurate"
- 76-100 => "Verified"
Confidence must be 0-1.
Explain rationale succinctly (<=200 chars).

CRITICAL: For claims derived from images (marked with \`is_image_derived: true\`):
- If a claim identifies a specific location, landmark, or person from an image, you MUST verify this identification against evidence
- If evidence does NOT support the identification (e.g., evidence talks about a different location/person), mark the claim as "False" or "Partially True" with LOW score
- Do NOT confirm image-based identifications unless evidence explicitly supports them
- If evidence is about a different subject than the claim, this is a contradiction - lower the score significantly
- Pay special attention to claims with \`is_image_derived: true\` - they require explicit evidence support for any identifications

IMPORTANT: The "recommendation" field is MISNAMED - it must contain ONLY factual context, never advice or directives.

FORBIDDEN patterns:
- "should be", "must be", "it is recommended", "do not", "avoid", "reject", "accept", "share", "verify"
- Any imperative verbs or commands
- Telling the user what to do or think

REQUIRED: Write like a Wikipedia article explaining the claim's background. Focus on:
- What actually happened or what the evidence shows
- Historical context or origin of the claim
- Specific details that clarify or complicate the claim
- Why this information is circulating

Examples:
BAD: "Claim should be accepted as true."
GOOD: "Multiple independent sources confirm this event occurred on [date]. The claim accurately reflects official records from [institution]."

BAD: "Do not share this misinformation."
GOOD: "This claim originated from a satirical website in [year] and was later misattributed to a real news source. No such policy exists."

BAD: "Verify with official sources."
GOOD: "The claim references a policy that was proposed but never implemented. The actual current policy differs in [specific way]."
`;

const JSON_SCHEMA = {
  type: "object",
  properties: {
    verdict: {
      type: "string",
      enum: ["Verified", "Mostly Accurate", "Partially True", "False"]
    },
    score: { type: "number", minimum: 0, maximum: 100 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    summary: { type: "string", maxLength: 300 },
    recommendation: { 
      type: "string", 
      maxLength: 300,
      description: "Factual background context only. NO advice, commands, or directives. Write like an encyclopedia entry explaining the claim's context, origin, or missing details. FORBIDDEN: 'should', 'must', 'do not', 'reject', 'accept', 'verify', 'share'."
    },
    rationale: { type: "string", maxLength: 200 },
    evidenceSupport: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claimId: { type: "string" },
          supportingSources: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["claimId", "supportingSources"],
        additionalProperties: false
      }
    }
  },
  required: ["verdict", "score", "confidence", "summary", "recommendation", "rationale", "evidenceSupport"],
  additionalProperties: false
} as const;

export type ReasonerVerdictOutput = {
  verdict: "Verified" | "Mostly Accurate" | "Partially True" | "False";
  score: number;
  confidence: number;
  summary: string;
  recommendation: string;
  rationale?: string;
  evidenceSupport: Array<{ claimId: string; supportingSources: string[] }>;
};

export async function reasonVerdict(
  claims: PipelineClaim[],
  sources: PipelineSource[],
  imageDerivedClaimIds?: Set<string>
): Promise<ReasonerVerdictOutput | null> {
  if (claims.length === 0 || sources.length === 0) {
    return null;
  }

  const payload = {
    claims: claims.map((claim) => ({
      id: claim.id,
      text: claim.text,
      verdict_hint: claim.verdict,
      confidence: claim.confidence,
      is_image_derived: imageDerivedClaimIds?.has(claim.id) ?? false
    })),
    evidence: sources.map((source) => ({
      key: source.key,
      provider: source.provider,
      reliability: source.reliability,
      summary: source.summary ?? "",
      url: source.url
    }))
  };

  try {
    const response = await openai.responses.create({
      model: VERDICT_MODEL,
      input: [
        { role: "system", content: VERDICT_PROMPT },
        { role: "user", content: JSON.stringify(payload) }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "verdict_reasoning",
          schema: JSON_SCHEMA,
          strict: true
        }
      }
    });

    const firstOutput = response.output?.[0];
    const firstContent = firstOutput?.content?.[0];
    if (!firstOutput || !firstContent) {
      return null;
    }

    const parsed = await parseJsonContent<ReasonerVerdictOutput>(firstContent, "verdict_reasoning");
    return parsed;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Verdict reasoning failed:", error);
    return null;
  }
}


