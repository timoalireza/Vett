/**
 * Stage 1: Claim Parsing
 * 
 * Parses natural language claims into structured components for analysis.
 * Uses LLM with JSON schema (temp=0) for consistency.
 * Output is persisted for deterministic re-evaluation.
 */

import { randomUUID } from "node:crypto";
import { openai } from "../../clients/openai.js";
import { parseJsonContent } from "../utils/openai.js";
import {
  StructuredClaim,
  ClaimParsingArtifact,
  CertaintyLanguage,
  QuantifierType,
  computeContentHash,
  EPISTEMIC_PIPELINE_VERSION
} from "./types.js";

const MODEL_NAME = "gpt-4.1-mini";

const CLAIM_PARSING_PROMPT = `You are an epistemic claim parser. Your job is to decompose natural language claims into structured components for fact-checking analysis.

For each claim, extract:
1. **Subject**: The main entity/topic being discussed
2. **Predicate**: What is being asserted about the subject
3. **Timeframe**: When does this apply? (past/present/future/unspecified)
4. **Geography**: Where does this apply? (global/regional/national/local/unspecified)
5. **Causal Structure**: Is this claiming causation, correlation, or just describing?
6. **Quantifiers**: What scope words are used? (all/some/most/few/specific numbers)
7. **Certainty Language**: How certain is the language? (definite/probable/possible/uncertain)
8. **Certainty Markers**: Specific words indicating certainty level (e.g., "will", "proves", "might")

Be precise. Extract exactly what is stated, not what is implied.
Do NOT interpret or expand the claim beyond what is explicitly stated.
Respond in JSON only.`;

const JSON_SCHEMA = {
  type: "object",
  properties: {
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original_text: { type: "string" },
          subject: { type: "string" },
          predicate: { type: "string" },
          timeframe_type: {
            type: "string",
            enum: ["past", "present", "future", "unspecified"]
          },
          timeframe_explicit: { type: ["string", "null"] },
          geography_scope: {
            type: "string",
            enum: ["global", "regional", "national", "local", "unspecified"]
          },
          geography_explicit: { type: ["string", "null"] },
          causal_structure: {
            type: "string",
            enum: ["causal", "correlational", "descriptive", "unclear"]
          },
          quantifiers: {
            type: "array",
            items: {
              type: "string",
              enum: ["universal", "existential", "majority", "minority", "vague", "precise", "none"]
            }
          },
          certainty_language: {
            type: "string",
            enum: ["definite", "probable", "possible", "uncertain", "none"]
          },
          certainty_markers: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: [
          "original_text",
          "subject",
          "predicate",
          "timeframe_type",
          "geography_scope",
          "causal_structure",
          "quantifiers",
          "certainty_language",
          "certainty_markers"
        ],
        additionalProperties: false
      }
    }
  },
  required: ["claims"],
  additionalProperties: false
} as const;

interface ParsedClaimRaw {
  original_text: string;
  subject: string;
  predicate: string;
  timeframe_type: "past" | "present" | "future" | "unspecified";
  timeframe_explicit?: string | null;
  geography_scope: "global" | "regional" | "national" | "local" | "unspecified";
  geography_explicit?: string | null;
  causal_structure: "causal" | "correlational" | "descriptive" | "unclear";
  quantifiers: QuantifierType[];
  certainty_language: CertaintyLanguage;
  certainty_markers: string[];
}

function transformToStructuredClaim(raw: ParsedClaimRaw, existingId?: string): StructuredClaim {
  return {
    id: existingId ?? randomUUID(),
    originalText: raw.original_text,
    subject: raw.subject,
    predicate: raw.predicate,
    timeframe: {
      type: raw.timeframe_type,
      explicit: raw.timeframe_explicit ?? undefined
    },
    geography: {
      scope: raw.geography_scope,
      explicit: raw.geography_explicit ?? undefined
    },
    causalStructure: raw.causal_structure,
    quantifiers: raw.quantifiers.length > 0 ? raw.quantifiers : ["none"],
    certaintyLanguage: raw.certainty_language,
    certaintyMarkers: raw.certainty_markers
  };
}

export interface ClaimParsingInput {
  claimTexts: Array<{ id: string; text: string }>;
}

export interface ClaimParsingOutput {
  artifact: ClaimParsingArtifact;
  durationMs: number;
}

export async function parseClaimsForEpistemic(
  input: ClaimParsingInput
): Promise<ClaimParsingOutput> {
  const startTime = Date.now();
  
  if (input.claimTexts.length === 0) {
    return {
      artifact: {
        version: EPISTEMIC_PIPELINE_VERSION,
        model: MODEL_NAME,
        timestamp: new Date().toISOString(),
        contentHash: computeContentHash([]),
        claims: []
      },
      durationMs: Date.now() - startTime
    };
  }

  const claimsInput = input.claimTexts.map((c, i) => `Claim ${i + 1}: "${c.text}"`).join("\n\n");

  try {
    const response = await openai.responses.create({
      model: MODEL_NAME,
      input: [
        { role: "system", content: CLAIM_PARSING_PROMPT },
        { role: "user", content: claimsInput }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "claim_parsing",
          schema: JSON_SCHEMA,
          strict: true
        }
      }
    });

    const firstOutput = response.output?.[0] as any;
    const firstContent = firstOutput?.content?.[0];

    if (!firstOutput || !firstContent) {
      return fallbackParsing(input, startTime);
    }

    const parsed = await parseJsonContent<{ claims: ParsedClaimRaw[] }>(
      firstContent,
      "claim_parsing"
    );

    if (!parsed || !parsed.claims) {
      return fallbackParsing(input, startTime);
    }

    // Match parsed claims back to input claims by order
    const structuredClaims: StructuredClaim[] = parsed.claims.map((raw, index) => {
      const originalInput = input.claimTexts[index];
      return transformToStructuredClaim(raw, originalInput?.id);
    });

    const artifact: ClaimParsingArtifact = {
      version: EPISTEMIC_PIPELINE_VERSION,
      model: MODEL_NAME,
      timestamp: new Date().toISOString(),
      contentHash: computeContentHash(structuredClaims),
      claims: structuredClaims
    };

    return {
      artifact,
      durationMs: Date.now() - startTime
    };
  } catch (error) {
    console.error("[Stage1_ClaimParsing] LLM parsing failed:", error);
    return fallbackParsing(input, startTime);
  }
}

function fallbackParsing(input: ClaimParsingInput, startTime: number): ClaimParsingOutput {
  // Heuristic-based fallback when LLM fails
  const structuredClaims: StructuredClaim[] = input.claimTexts.map((claim) => {
    const text = claim.text.toLowerCase();
    
    // Detect certainty markers
    const certaintyMarkers: string[] = [];
    const definiteWords = ["will", "proves", "definitely", "certainly", "always", "never", "is", "are"];
    const probableWords = ["likely", "probably", "should", "expected", "tends"];
    const possibleWords = ["may", "might", "could", "possibly", "perhaps"];
    const uncertainWords = ["unclear", "uncertain", "unknown", "disputed"];

    let certaintyLanguage: CertaintyLanguage = "none";
    
    for (const word of definiteWords) {
      if (text.includes(word)) {
        certaintyMarkers.push(word);
        certaintyLanguage = "definite";
      }
    }
    for (const word of probableWords) {
      if (text.includes(word)) {
        certaintyMarkers.push(word);
        if (certaintyLanguage === "none" || certaintyLanguage === "definite") {
          certaintyLanguage = "probable";
        }
      }
    }
    for (const word of possibleWords) {
      if (text.includes(word)) {
        certaintyMarkers.push(word);
        certaintyLanguage = "possible";
      }
    }
    for (const word of uncertainWords) {
      if (text.includes(word)) {
        certaintyMarkers.push(word);
        certaintyLanguage = "uncertain";
      }
    }

    // Detect quantifiers
    const quantifiers: QuantifierType[] = [];
    if (/\ball\b|\bevery\b|\balways\b/.test(text)) quantifiers.push("universal");
    if (/\bsome\b|\ba few\b|\bexists?\b/.test(text)) quantifiers.push("existential");
    if (/\bmost\b|\bmajority\b/.test(text)) quantifiers.push("majority");
    if (/\bfew\b|\brarely\b|\bminority\b/.test(text)) quantifiers.push("minority");
    if (/\bsignificant\b|\bmany\b|\bsubstantial\b/.test(text)) quantifiers.push("vague");
    if (/\d+%|\d+ percent|\b\d+\b/.test(text)) quantifiers.push("precise");
    if (quantifiers.length === 0) quantifiers.push("none");

    // Detect timeframe
    let timeframeType: "past" | "present" | "future" | "unspecified" = "unspecified";
    if (/\bwill\b|\bwould\b|\bfuture\b|\bsoon\b|\bby \d{4}\b/.test(text)) {
      timeframeType = "future";
    } else if (/\bwas\b|\bwere\b|\blast\b|\bprevious\b|\bhistorically\b/.test(text)) {
      timeframeType = "past";
    } else if (/\bis\b|\bare\b|\bcurrently\b|\bnow\b|\btoday\b/.test(text)) {
      timeframeType = "present";
    }

    // Detect causal structure
    let causalStructure: "causal" | "correlational" | "descriptive" | "unclear" = "descriptive";
    if (/\bcause[sd]?\b|\bresult[sd]?\s+in\b|\blead[sd]?\s+to\b|\bbecause\b/.test(text)) {
      causalStructure = "causal";
    } else if (/\bcorrelate[sd]?\b|\bassociate[sd]?\b|\blinked\s+to\b|\brelated\s+to\b/.test(text)) {
      causalStructure = "correlational";
    }

    // Simple subject/predicate split
    const sentences = claim.text.split(/[.!?]/);
    const firstSentence = sentences[0]?.trim() || claim.text;
    const words = firstSentence.split(/\s+/);
    const subjectWords = words.slice(0, Math.min(3, Math.ceil(words.length / 3)));
    const predicateWords = words.slice(subjectWords.length);

    return {
      id: claim.id,
      originalText: claim.text,
      subject: subjectWords.join(" ") || "Unknown subject",
      predicate: predicateWords.join(" ") || "Unknown predicate",
      timeframe: {
        type: timeframeType
      },
      geography: {
        scope: "unspecified" as const
      },
      causalStructure,
      quantifiers,
      certaintyLanguage,
      certaintyMarkers: [...new Set(certaintyMarkers)]
    };
  });

  const artifact: ClaimParsingArtifact = {
    version: EPISTEMIC_PIPELINE_VERSION,
    model: "heuristic-fallback",
    timestamp: new Date().toISOString(),
    contentHash: computeContentHash(structuredClaims),
    claims: structuredClaims
  };

  return {
    artifact,
    durationMs: Date.now() - startTime
  };
}

