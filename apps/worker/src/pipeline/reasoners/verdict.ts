import { openai } from "../../clients/openai.js";
import type { PipelineClaim, PipelineSource } from "../types.js";
import { parseJsonContent } from "../utils/openai.js";

export const VERDICT_MODEL = "gpt-5.2";

const VERDICT_PROMPT = `
You are a fact-checking adjudicator. Given claims and evaluated evidence, produce a grounded verdict.
Respond in English JSON ONLY, matching the schema. Cite evidence using the provided \`key\` values.
If evidence contradicts a claim, LOWER the numeric score. If evidence strongly supports it, raise the score.

GROUNDING RULES (CRITICAL):
- You MUST base the verdict, score, summary, and rationale ONLY on the provided evidence payload.
- Do NOT use outside knowledge, training data, or assumptions. If a detail is not present in evidence summaries, treat it as unknown.
- If evidence is mainly about a different topic (stance=irrelevant or very low relevance), you MUST use "Unverified" (score=null).
- Prefer conclusions corroborated by MULTIPLE independent sources (different hostnames/providers). If only one source supports a claim, be conservative (often "Unverified" unless it is an official/primary source and highly relevant).
- Be aware of potential source bias: if evidence comes from a narrow set of aligned outlets, reflect that uncertainty in the verdict/score (do not overstate certainty).

RECENCY RULES:
- Consider \`publishedAt\` when present. For breaking-news claims (today/this morning/last night), prioritize the most recent high-reliability, high-relevance evidence.
- Do not let older sources outweigh multiple newer credible sources for time-sensitive claims.

SCORING GUIDELINES:
- For claims that are ACCURATE and well-supported by evidence, assign scores in the 76-100 range ("Verified")
- For claims that are MOSTLY ACCURATE with minor nuances or limitations, assign scores in the 61-75 range ("Mostly Accurate")
- For claims that are PARTIALLY ACCURATE with significant limitations or mixed evidence, assign scores in the 41-60 range ("Partially Accurate")
- For claims that are FALSE or contradicted by evidence, assign scores in the 0-40 range ("False")
- For claims with INSUFFICIENT EVIDENCE (not enough information to verify or contradict), use "Unverified" (set score to null)

NUMBERS / AMOUNTS / ATTRIBUTION (IMPORTANT):
- Do NOT mark a claim as "False" solely because a number/amount is wrong if the core event is supported by evidence.
- If the core event happened but a numeric detail is exaggerated or off, use:
  - "Mostly Accurate" (61-75) when the claim is right about the who/what/where and the number is only somewhat off.
  - "Partially Accurate" (41-60) when the claim gets the core event right but key specifics are wrong (ex: wrong agency/actor AND wrong amount).
- Use "False" (0-40) when the evidence indicates the core event did not happen, is fabricated, or is about a different subject.
- When a claim says X but evidence supports the same thing at a different magnitude, score by severity:
  - Small mismatch (roughly within ~25%): usually 65-75
  - Moderate mismatch (roughly 25%-100%): usually 55-70
  - Large mismatch (>100%) or multiple key details wrong: usually 41-60

Example: Claim says "Agency A seized $60M of X" but evidence shows "Agency B seized ~$40M of X and Agency A only shared photos" => usually "Partially Accurate" around ~50-60.

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
- Academic phrases like "it should be noted", "according to", "it is evident that", "notably", "furthermore", "moreover"
- Formal transitions like "however", "nevertheless", "subsequently"
- Reference phrases like "as mentioned", "as stated", "as noted"

TONE GUIDELINES - Write like you're texting a friend who asked about this claim:
- Use simple, everyday words - pretend you're explaining this at a coffee shop
- Get straight to the point - no fluff or filler phrases
- Write in complete thoughts, but keep them short and punchy
- Imagine someone asking "So what's the deal with this?" - that's your starting point
- Skip formal language entirely - no "it should be noted" or "according to reports"
- Just tell them what's actually going on in plain English

Focus on:
- What really happened (in plain terms)
- Where this claim came from or why people are talking about it
- Key details that matter to understanding it
- What's missing or unclear (if relevant)

Examples of the RIGHT tone:
BAD (too formal): "Multiple credible reports confirm the veracity of this claim, with documentation from official records substantiating the assertion."
GOOD: "Multiple sources confirm this happened. The claim matches what we know from official records."

BAD (too academic): "It should be noted that public reporting in late-2025 has centered on newly released materials."
GOOD: "Public reporting around late-2025 focused on what appeared in newly released materials and how some items were temporarily removed from a DOJ website after concerns were raised."

BAD (too analytical): "The claim references a policy proposal that underwent legislative review but failed to achieve implementation."
GOOD: "The claim talks about a policy that was suggested but never actually put in place. The real policy works differently."

BAD (instructive): "Users should exercise caution when sharing this information."
GOOD: "This started as a joke on a satirical site and got mistaken for real news."
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
      maxLength: 500,
      description: "SUMMARY (What's the answer?) - 2-3 sentences max. State the verdict clearly and why. Use calm, neutral, factual tone. NO citations by name, NO bullet points, NO percentages, NO emojis, NO 'experts say'. Structure: Sentence 1 = verdict + core reason. Optional sentence 2 = key limitation. Optional sentence 3 = scope clarification."
    },
    recommendation: { 
      type: "string", 
      maxLength: 500,
      description: "CONTEXT (How to understand this claim) - 3-5 sentences max. Explain relevant background to interpret the claim correctly. Clarify common misunderstandings or misleading framings. Note uncertainty or missing data when applicable. Explanatory tone, assume good-faith curiosity. DO NOT restate summary, argue with user, mention Vett/models/analysis, or speculate beyond evidence. NO citations, links, or references."
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
      publishedAt: source.publishedAt ?? null,
      relevance: source.evaluation?.relevance ?? null,
      stance: source.evaluation?.stance ?? null,
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


