/**
 * Stage 2: Claim Typing
 * 
 * Classifies claims into epistemic types for appropriate evaluation.
 * Types constrain which penalties can be applied later.
 */

import { openai } from "../../clients/openai.js";
import { parseJsonContent } from "../utils/openai.js";
import {
  StructuredClaim,
  TypedClaim,
  ClaimTypingArtifact,
  ClaimType,
  computeContentHash,
  EPISTEMIC_PIPELINE_VERSION
} from "./types.js";

const MODEL_NAME = "gpt-4.1-mini";

const CLAIM_TYPING_PROMPT = `You are an epistemic claim classifier. Classify each claim into one or more of these types:

1. **empirical_observational**: Claims about observable facts that can be verified through direct observation or measurement
   - Example: "The unemployment rate is 4.2%"

2. **predictive**: Claims about future states or outcomes based on models/projections
   - Example: "Sea levels will rise 3 feet by 2100"

3. **comparative**: Claims comparing two or more things
   - Example: "Country A has higher GDP than Country B"

4. **causal**: Claims asserting that one thing causes another
   - Example: "Smoking causes lung cancer"

5. **normative**: Claims about what should be, value judgments, or opinions
   - Example: "The government should invest more in education"

For each claim, provide:
- All applicable types (a claim can have multiple)
- The primary type (most dominant)
- Whether it's normative (normative claims are flagged but not scored)
- Confidence in your classification (0-1)
- Brief rationale for classification

Respond in JSON only.`;

const JSON_SCHEMA = {
  type: "object",
  properties: {
    classifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim_id: { type: "string" },
          types: {
            type: "array",
            items: {
              type: "string",
              enum: ["empirical_observational", "predictive", "comparative", "causal", "normative"]
            },
            minItems: 1
          },
          primary_type: {
            type: "string",
            enum: ["empirical_observational", "predictive", "comparative", "causal", "normative"]
          },
          is_normative: { type: "boolean" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          rationale: { type: "string" }
        },
        required: ["claim_id", "types", "primary_type", "is_normative", "confidence", "rationale"],
        additionalProperties: false
      }
    }
  },
  required: ["classifications"],
  additionalProperties: false
} as const;

interface ClassificationRaw {
  claim_id: string;
  types: ClaimType[];
  primary_type: ClaimType;
  is_normative: boolean;
  confidence: number;
  rationale: string;
}

export interface ClaimTypingInput {
  parsedClaims: StructuredClaim[];
}

export interface ClaimTypingOutput {
  artifact: ClaimTypingArtifact;
  durationMs: number;
}

export async function typeClaimsForEpistemic(
  input: ClaimTypingInput
): Promise<ClaimTypingOutput> {
  const startTime = Date.now();

  if (input.parsedClaims.length === 0) {
    return {
      artifact: {
        version: EPISTEMIC_PIPELINE_VERSION,
        model: MODEL_NAME,
        timestamp: new Date().toISOString(),
        contentHash: computeContentHash([]),
        typedClaims: []
      },
      durationMs: Date.now() - startTime
    };
  }

  const claimsInput = input.parsedClaims
    .map((c) => `ID: ${c.id}\nClaim: "${c.originalText}"\nSubject: ${c.subject}\nPredicate: ${c.predicate}\nCausal Structure: ${c.causalStructure}`)
    .join("\n\n---\n\n");

  try {
    const response = await openai.responses.create({
      model: MODEL_NAME,
      input: [
        { role: "system", content: CLAIM_TYPING_PROMPT },
        { role: "user", content: claimsInput }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "claim_typing",
          schema: JSON_SCHEMA,
          strict: true
        }
      }
    });

    const firstOutput = response.output?.[0] as any;
    const firstContent = firstOutput?.content?.[0];

    if (!firstOutput || !firstContent) {
      return fallbackTyping(input, startTime);
    }

    const parsed = await parseJsonContent<{ classifications: ClassificationRaw[] }>(
      firstContent,
      "claim_typing"
    );

    if (!parsed || !parsed.classifications) {
      return fallbackTyping(input, startTime);
    }

    // Match classifications back to structured claims
    const classificationMap = new Map(
      parsed.classifications.map((c) => [c.claim_id, c])
    );

    const typedClaims: TypedClaim[] = input.parsedClaims.map((claim) => {
      const classification = classificationMap.get(claim.id);

      if (classification) {
        return {
          ...claim,
          types: classification.types,
          primaryType: classification.primary_type,
          isNormative: classification.is_normative,
          typingConfidence: classification.confidence,
          typingRationale: classification.rationale
        };
      }

      // Fallback for unmatched claims
      return inferTypeFromStructure(claim);
    });

    const artifact: ClaimTypingArtifact = {
      version: EPISTEMIC_PIPELINE_VERSION,
      model: MODEL_NAME,
      timestamp: new Date().toISOString(),
      contentHash: computeContentHash(typedClaims),
      typedClaims
    };

    return {
      artifact,
      durationMs: Date.now() - startTime
    };
  } catch (error) {
    console.error("[Stage2_ClaimTyping] LLM typing failed:", error);
    return fallbackTyping(input, startTime);
  }
}

function inferTypeFromStructure(claim: StructuredClaim): TypedClaim {
  const text = claim.originalText.toLowerCase();
  const types: ClaimType[] = [];
  let primaryType: ClaimType = "empirical_observational";
  let isNormative = false;

  // Check for normative indicators
  const normativePatterns = [
    /\bshould\b/,
    /\bmust\b/,
    /\bought\s+to\b/,
    /\bneed[s]?\s+to\b/,
    /\bbetter\s+to\b/,
    /\bwrong\s+to\b/,
    /\bimportant\s+that\b/,
    /\bbelieve\s+that\b/,
    /\bthink\s+that\b/,
    /\bin\s+my\s+opinion\b/
  ];

  for (const pattern of normativePatterns) {
    if (pattern.test(text)) {
      types.push("normative");
      isNormative = true;
      primaryType = "normative";
      break;
    }
  }

  // Check for predictive (future-oriented)
  if (claim.timeframe.type === "future" || /\bwill\b|\bby \d{4}\b|\bprojected\b|\bforecast\b/.test(text)) {
    types.push("predictive");
    if (!isNormative) primaryType = "predictive";
  }

  // Check for causal
  if (claim.causalStructure === "causal" || /\bcause[sd]?\b|\bresult[sd]?\s+in\b|\blead[sd]?\s+to\b/.test(text)) {
    types.push("causal");
    if (!isNormative && primaryType !== "predictive") primaryType = "causal";
  }

  // Check for comparative
  if (/\bmore\s+than\b|\bless\s+than\b|\bhigher\b|\blower\b|\bcompared\s+to\b|\bvs\.?\b/.test(text)) {
    types.push("comparative");
    if (!isNormative && primaryType !== "predictive" && primaryType !== "causal") {
      primaryType = "comparative";
    }
  }

  // Default to empirical observational if nothing else
  if (types.length === 0 || (!isNormative && !types.includes("empirical_observational"))) {
    types.push("empirical_observational");
    if (!isNormative && primaryType === "empirical_observational") {
      primaryType = "empirical_observational";
    }
  }

  return {
    ...claim,
    types: types.length > 0 ? types : ["empirical_observational"],
    primaryType,
    isNormative,
    typingConfidence: 0.6, // Lower confidence for heuristic
    typingRationale: "Classified using heuristic patterns (LLM fallback)"
  };
}

function fallbackTyping(input: ClaimTypingInput, startTime: number): ClaimTypingOutput {
  const typedClaims = input.parsedClaims.map(inferTypeFromStructure);

  const artifact: ClaimTypingArtifact = {
    version: EPISTEMIC_PIPELINE_VERSION,
    model: "heuristic-fallback",
    timestamp: new Date().toISOString(),
    contentHash: computeContentHash(typedClaims),
    typedClaims
  };

  return {
    artifact,
    durationMs: Date.now() - startTime
  };
}

