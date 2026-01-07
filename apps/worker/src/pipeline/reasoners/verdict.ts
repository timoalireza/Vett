import { openai } from "../../clients/openai.js";
import type { PipelineClaim, PipelineSource } from "../types.js";
import { parseJsonContent } from "../utils/openai.js";
import { normalizeContext, normalizeSummary } from "../utils/uxCopy.js";

export const VERDICT_MODEL = "gpt-5.2";

const VERDICT_PROMPT = `
You are a fact-checking adjudicator. Given claims and evaluated evidence, produce a grounded verdict.
Respond in English JSON ONLY, matching the schema.
If evidence contradicts a claim, LOWER the numeric score. If evidence strongly supports it, raise the score.

GROUNDING RULES (CRITICAL):
- You MUST base the verdict, score, rationale, and evidenceSupport ONLY on the provided evidence payload.
- Do NOT use outside knowledge, training data, or assumptions. If a detail is not present in evidence summaries, treat it as unknown.
- If evidence is mainly about a different topic (stance=irrelevant or very low relevance), you MUST use "Unverified" (score=null).
- Prefer conclusions corroborated by MULTIPLE independent sources (different hostnames/providers). If only one source supports a claim, be conservative (often "Unverified" unless it is an official/primary source and highly relevant).
- Be aware of potential source bias: if evidence comes from a narrow set of aligned outlets, reflect that uncertainty in the verdict/score (do not overstate certainty).

SUMMARY + CONTEXT SCOPE (IMPORTANT):
- The Summary and Context are user-facing explanation. They MAY include general background/definitions/common misunderstandings using your general knowledge.
- However, you MUST NOT introduce new specific factual claims about the real-world subject of the claim unless that detail is present in the evidence payload.
- Keep Summary/Context consistent with the evidence-grounded verdict + score. If details are uncertain, say so plainly (without mentioning sources).

OPTIONAL HINTS:
- The payload may include a top-level "hints" object with a precomputed verdict/score (e.g., from a deterministic scorer).
- If hints are present, you MUST keep your verdict + score aligned with the hints unless the evidence is clearly insufficient/irrelevant, in which case you MUST output "Unverified" (score=null).

RECENCY RULES:
- Consider \`publishedAt\` when present. For breaking-news claims (today/this morning/last night), prioritize the most recent high-reliability, high-relevance evidence.
- Do not let older sources outweigh multiple newer credible sources for time-sensitive claims.

SCORING GUIDELINES (CRITICAL - MUST ALIGN WITH SUMMARY LANGUAGE):
- For claims that are ACCURATE and well-supported by INDEPENDENT evidence from MULTIPLE sources, assign scores in the 76-100 range ("Verified")
  * Summary MUST affirm strong corroboration, e.g., "Multiple independent sources confirm...", "Independently verified by..."
  * Do NOT use hedging language ("alleged", "claimed", "asserted", "unsubstantiated", "purported") in the summary for scores ≥76
  
- For claims that are MOSTLY ACCURATE with minor nuances or limitations, assign scores in the 61-75 range ("Mostly Accurate")
  * Summary should affirm general support with minor caveats, e.g., "Evidence generally supports this with minor details differing..."
  * Use measured language, not hedging language suggesting lack of verification
  
- For claims that are PARTIALLY ACCURATE or MIX verified facts with unverified assertions, assign scores in the 41-60 range ("Partially Accurate")
  * Summary MUST distinguish what is verified vs. unverified
  * Appropriate to use language like "Core event confirmed but details unsubstantiated..."
  
- For claims that rely on SELF-ASSERTION, ALLEGATIONS, or CLAIMS without independent corroboration, assign scores in the 30-40 range (lower "Partially Accurate" or upper "False")
  * Summary MUST make clear the lack of independent verification
  * Use language like "alleged", "claimed without independent confirmation", "rests on assertions"
  
- For claims that are FALSE or contradicted by evidence, assign scores in the 0-29 range ("Mostly False" 15-29, "False" 0-14)
  * Summary MUST clearly state the contradiction
  
- For claims with INSUFFICIENT EVIDENCE (not enough information to verify or contradict), use "Unverified" (set score to null)

ALIGNMENT RULE (MANDATORY):
Before finalizing output, check: Does the summary language match the score range?
- Scores ≥75 → Summary must affirm strong/independent support
- Scores 45-74 → Summary can note limitations but should not suggest unverified allegations
- Scores 30-40 → Summary MUST acknowledge lack of independent verification
- If summary contains "alleged", "unsubstantiated", "assertion", "claim by X without proof" → score MUST be ≤40

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

WRITING RULES FOR SUMMARY + CONTEXT (STRICT):
- The Summary and Context must describe the CLAIM itself (what it gets right/wrong/missing), not “what sources say”.
- Do NOT mention sources, reporting, outlets, links, citations, or “evidence” in the Summary or Context.
- Do NOT use authority appeals or attribution language (forbidden examples: "sources say", "reports claim", "experts say", "studies show", "according to").
- Do NOT use bullet points, numbered lists, emojis, or percentages.
- Do NOT use the words "true" or "false" anywhere, except as part of the verdict label in the required "Verdict: <LABEL>" phrase.
- If the provided material is insufficient, say so plainly (without mentioning sources).

FORBIDDEN patterns:
- "should be", "must be", "it is recommended", "do not", "avoid", "reject", "accept", "share", "verify"
- Any imperative verbs or commands
- Telling the user what to do or think
- Academic phrases like "it should be noted", "according to", "it is evident that", "notably", "furthermore", "moreover"
- Formal transitions like "however", "nevertheless", "subsequently"
- Reference phrases like "as mentioned", "as stated", "as noted"

TONE GUIDELINES:
- Calm, neutral, factual.
- Plain language. No “confidence theater”. No rhetorical flourishes.
- Keep it short and direct.

SUMMARY (What's the answer?) RULES:
- 2–3 sentences maximum.
- Sentence 1 MUST be: "Verdict: <LABEL> — <core reason>."
- Sentence 2 (optional): key limitation or uncertainty.
- Sentence 3 (optional): scope clarification (what the claim does not cover).
- CRITICAL: The language MUST match the score:
  * Scores ≥75: Affirm strong support ("independently confirmed", "multiple sources verify")
  * Scores 45-74: Balanced with caveats ("generally supported", "core claim holds")
  * Scores 30-40: Acknowledge lack of verification ("alleged", "claimed without independent confirmation", "rests on assertions")
  * Scores <30: State contradiction or falseness clearly

CONTEXT (How to understand this claim) RULES:
- 3–5 sentences maximum.
- MUST be purely factual: answer WHO made the claim, WHAT was claimed, WHEN, WHERE.
- Provide neutral background needed to interpret the claim correctly (definitions, common confusions).
- Do NOT evaluate evidence, Do NOT use judgmental language ("alleged", "unsubstantiated").
- Do NOT analyze or weigh evidence - save that for the Summary.
- Do NOT restate the Summary or repeat the verdict label.
- Think of this as a neutral encyclopedia entry setting up the claim, not evaluating it.

EVIDENCE SUPPORT RULES:
- The \`evidenceSupport\` field must cite evidence using the provided \`key\` values (strings).
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
      description:
        "SUMMARY (What's the answer?) - 2–3 sentences max. Must describe the claim itself, not what sources are saying. Sentence 1 MUST be exactly: \"Verdict: <LABEL> — <core reason>.\" Sentence 2 (optional): key limitation/uncertainty. Sentence 3 (optional): scope clarification. Calm, neutral, factual. Do NOT use bullets, numbers, emojis, percentages, citations, links, or attribution language (\"sources say\", \"reports\", \"experts\", \"according to\"). Do NOT use the words \"true\" or \"false\" except as part of the verdict label in the required \"Verdict: <LABEL>\" phrase. You may include general background/definitions, but do NOT add new specific facts unless present in evidence."
    },
    recommendation: { 
      type: "string", 
      maxLength: 500,
      description:
        "CONTEXT (How to understand this claim) - 3–5 sentences max. MUST be purely factual, answering: WHO made the claim? WHAT was claimed? WHEN? WHERE? Provide neutral background/definitions needed to interpret the claim correctly. Do NOT evaluate evidence quality. Do NOT use judgmental/evaluative language (\"alleged\", \"unsubstantiated\", \"disputed\", \"questionable\"). Do NOT analyze or weigh evidence - that belongs in Summary. Think of this as a neutral encyclopedia entry setting up the claim factually, not judging it. Do NOT restate the Summary or repeat the verdict label. Do NOT use bullets, numbers, emojis, percentages, citations, links, or attribution language (\"sources say\", \"reports\", \"experts\", \"according to\"). Do NOT use the words \"true\" or \"false\"."
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

/**
 * Check if summary language contradicts the score/verdict
 * Returns an adjusted result if inconsistency detected
 */
function enforceConsistency(result: ReasonerVerdictOutput): ReasonerVerdictOutput {
  const score = result.score;
  const summary = result.summary.toLowerCase();
  
  // Unverified verdicts should have null score
  if (result.verdict === "Unverified" && score !== null) {
    return { ...result, score: null };
  }
  
  // Skip consistency check for Unverified (no score to check)
  if (score === null || result.verdict === "Unverified") {
    return result;
  }
  
  // Check for hedging language that suggests lack of verification
  const hasHedgingLanguage = /\b(alleged|allegation|allege|claim(?:ed|s) (?:by|that)|assert(?:ed|s|ion)|purported|unsubstantiated|unverified|not (?:independently )?(?:confirmed|verified|corroborated)|without (?:independent )?(?:confirmation|verification|corroboration|proof)|rest(?:s|ing) on assertions?)\b/i.test(summary);
  
  // Check for language suggesting strong support
  // Matches: "independently verified", "multiple sources confirm", "strongly supports", "well-supported", "confirmed", "proven", etc.
  const hasStrongLanguage = /\b(independently (?:confirmed|verified|corroborated)|(?:multiple )?independent sources (?:confirm|verify|corroborate)|(?:strongly|generally|well)[- ]support(?:s|ed)?|(?:well|extensively)[- ](?:documented|verified)|confirm(?:s|ed)?(?:\s+this)?|verified?(?:\s+this)?|corroborated?|proven?|establishes?|established|conclusive|definitively)\b/i.test(summary);
  
  // RULE 1: Score ≥75 (Supported) but summary has hedging language → DOWNGRADE
  if (score >= 75 && hasHedgingLanguage) {
    console.warn(`[Consistency Check] Score ${score} (≥75) but summary contains hedging language. Downgrading to 42 (Partially Accurate).`);
    return {
      ...result,
      score: 42,
      verdict: "Partially Accurate",
      confidence: Math.min(result.confidence, 0.6)
    };
  }
  
  // RULE 2: Score ≥75 (Supported) but no strong affirmative language → DOWNGRADE to upper Mostly Accurate
  if (score >= 75 && !hasStrongLanguage) {
    console.warn(`[Consistency Check] Score ${score} (≥75) but summary lacks strong affirmative language. Downgrading to 68 (Mostly Accurate).`);
    return {
      ...result,
      score: 68,
      verdict: "Mostly Accurate",
      confidence: Math.min(result.confidence, 0.75)
    };
  }
  
  // RULE 3: Score 45-74 but summary has strong hedging → DOWNGRADE to 41 (lower Partially Accurate boundary)
  if (score >= 45 && score < 75 && hasHedgingLanguage) {
    console.warn(`[Consistency Check] Score ${score} (45-74) but summary contains strong hedging language. Downgrading to 41 (lower Partially Accurate).`);
    return {
      ...result,
      score: 41,
      verdict: "Partially Accurate",
      confidence: Math.min(result.confidence, 0.55)
    };
  }
  
  // RULE 4: Score <45 but summary has strong support language → UPGRADE
  if (score < 45 && hasStrongLanguage) {
    console.warn(`[Consistency Check] Score ${score} (<45) but summary contains strong support language. Upgrading to 65 (Mostly Accurate).`);
    return {
      ...result,
      score: 65,
      verdict: "Mostly Accurate",
      confidence: Math.min(result.confidence, 0.75)
    };
  }
  
  // RULE 5: Ensure verdict matches score range
  let expectedVerdict: ReasonerVerdictOutput["verdict"];
  if (score >= 76) expectedVerdict = "Verified";
  else if (score >= 61) expectedVerdict = "Mostly Accurate";
  else if (score >= 41) expectedVerdict = "Partially Accurate";
  else expectedVerdict = "False";
  
  if (result.verdict !== expectedVerdict) {
    console.warn(`[Consistency Check] Verdict "${result.verdict}" doesn't match score ${score}. Correcting to "${expectedVerdict}".`);
    return {
      ...result,
      verdict: expectedVerdict
    };
  }
  
  return result;
}

export async function reasonVerdict(
  claims: PipelineClaim[],
  sources: PipelineSource[],
  imageDerivedClaimIds?: Set<string>,
  hints?: { verdict?: ReasonerVerdictOutput["verdict"]; score?: number | null }
): Promise<ReasonerVerdictOutput | null> {
  if (claims.length === 0 || sources.length === 0) {
    return null;
  }

  const payload = {
    hints: hints ?? null,
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
    if (!parsed) return null;
    
    // Enforce consistency BEFORE normalization to avoid pattern detection issues
    const consistentResult = enforceConsistency(parsed);
    
    const cleanedSummary = normalizeSummary(consistentResult.verdict, consistentResult.summary);
    const cleanedContext = normalizeContext(consistentResult.recommendation);

    return {
      ...consistentResult,
      summary: cleanedSummary,
      recommendation: cleanedContext
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Verdict reasoning failed:", error);
    return null;
  }
}


