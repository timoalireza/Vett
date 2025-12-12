import { openai } from "../../clients/openai.js";
import type { PipelineClaim, PipelineSource } from "../types.js";
import { parseJsonContent } from "../utils/openai.js";

export const VERDICT_MODEL = "gpt-4o-mini";

const VERDICT_PROMPT = `
You are a fact-checking adjudicator. Given claims and evaluated evidence, produce a grounded verdict.
Respond in English JSON ONLY, matching the schema. Cite evidence using the provided \`key\` values.
If evidence contradicts a claim, LOWER the numeric score. If evidence strongly supports it, raise the score.

SCORING GUIDELINES:
- For claims that are ACCURATE and well-supported by evidence, assign scores in the 76-100 range ("Verified")
- For claims that are MOSTLY ACCURATE with minor nuances or limitations, assign scores in the 61-75 range ("Mostly Accurate")
- For claims that are PARTIALLY ACCURATE with significant limitations or mixed evidence, assign scores in the 41-60 range ("Partially Accurate")
- For claims that are FALSE or contradicted by evidence, assign scores in the 0-40 range ("False")
- For claims with INSUFFICIENT EVIDENCE (not enough information to verify or contradict), use "Unverified" (set score to null)

Map scores to verdicts as follows (STRICTLY follow these ranges):
- 0-40 => "False"
- 41-60 => "Partially Accurate"
- 61-75 => "Mostly Accurate"
- 76-100 => "Verified"
- INSUFFICIENT EVIDENCE => "Unverified" (score must be null, not 0)

IMPORTANT: Use "Unverified" when:
- There are very few or no reliable sources available
- Sources have very low reliability or relevance
- The evidence is too limited or ambiguous to support any conclusion
- You cannot confidently determine if the claim is true, false, or partially accurate
- When using "Unverified", ALWAYS set score to null

IMPORTANT: If a claim is ACCURATE and well-supported by reliable sources, assign a score of 76 or higher to reflect its accuracy ("Verified"). For claims that are mostly accurate with minor limitations, assign scores in the 61-75 range ("Mostly Accurate"). Do not be overly conservative with scores for accurate claims.

Confidence must be 0-1.
Explain rationale succinctly (<=200 chars).

CRITICAL: For claims derived from images (marked with \`is_image_derived: true\`):
- If a claim identifies a specific location, landmark, or person from an image, you MUST verify this identification against evidence
- If evidence does NOT support the identification (e.g., evidence talks about a different location/person), mark the claim as "False" or "Partially Accurate" with LOW score
- Do NOT confirm image-based identifications unless evidence explicitly supports them
- If evidence is about a different subject than the claim, this is a contradiction - lower the score significantly
- Pay special attention to claims with \`is_image_derived: true\` - they require explicit evidence support for any identifications

IMPORTANT: The "recommendation" field is MISNAMED - it must contain ONLY factual context, never advice or directives.

FORBIDDEN patterns:
- "should be", "must be", "it is recommended", "do not", "avoid", "reject", "accept", "share", "verify"
- Any imperative verbs or commands
- Telling the user what to do or think

REQUIRED: Write in a clear, accessible tone - informative but conversational, like explaining something to a friend. Avoid academic jargon or overly formal language. Focus on:
- What actually happened or what the evidence shows
- Historical context or origin of the claim
- Specific details that clarify or complicate the claim
- Why this information is circulating

TONE GUIDELINES:
- Use simple, direct language
- Avoid phrases like "it should be noted", "according to", "it is evident that"
- Write naturally, as if explaining to someone in conversation
- Keep it informative but approachable

Examples:
BAD: "Claim should be accepted as true."
GOOD: "Multiple sources confirm this happened. The claim matches what we know from official records."

BAD: "Do not share this misinformation."
GOOD: "This started as a joke on a satirical site and got mistaken for real news. There's no actual policy like this."

BAD: "It should be noted that the claim references a policy that was proposed but never implemented."
GOOD: "The claim talks about a policy that was suggested but never actually put in place. The real policy works differently."
`;

const JSON_SCHEMA = {
  type: "object",
  properties: {
    verdict: {
      type: "string",
      enum: ["Verified", "Mostly Accurate", "Partially Accurate", "False", "Unverified"]
    },
    score: { 
      type: ["number", "null"],
      minimum: 0,
      maximum: 100,
      description: "Numeric score 0-100 for verdicts with evidence. MUST be null for 'Unverified' verdicts."
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    summary: { 
      type: "string", 
      maxLength: 300,
      description: "A brief, conversational summary of what the evidence shows. Use simple, accessible language - avoid academic or overly formal phrasing."
    },
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
  verdict: "Verified" | "Mostly Accurate" | "Partially Accurate" | "False" | "Unverified";
  score: number | null; // null for "Unverified" verdicts
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

    const firstOutput = response.output?.[0] as any;
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


