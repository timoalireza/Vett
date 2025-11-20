import type { AnalysisJobInput } from "@vett/shared";

import { openai } from "../../clients/openai.js";
import type { ClassificationMetadata } from "../types.js";
import { parseJsonContent } from "../utils/openai.js";

const MODEL_NAME = "gpt-4.1-mini";

const TOPIC_KEYWORDS: Record<string, RegExp[]> = {
  politics: [/election/i, /policy/i, /government/i, /senate/i],
  health: [/health/i, /medical/i, /vaccine/i, /disease/i],
  science: [/study/i, /research/i, /scientist/i],
  finance: [/market/i, /stock/i, /economy/i],
  environment: [/climate/i, /environment/i, /carbon/i],
  technology: [/ai/i, /technology/i, /software/i]
};

const PROMPT = `
You are a content classification assistant. Respond strictly in English JSON matching this schema:
{
  "topic": "<politics|health|science|finance|environment|technology|general>",
  "bias": "<Left|Center-left|Center|Center-right|Right|null>",
  "confidence": <number between 0 and 1>,
  "rationale": "<<= 160 characters>"
}

Guidelines:
- Only assign a bias value when the topic is politics; otherwise set it to null.
- Confidence should reflect certainty in the topic label.
- Keep the rationale concise and cite visible cues (e.g., keywords, framing).
- If the input is not in English, translate the relevant parts before reasoning and ensure the JSON output is in English.
`;

type TopicClassificationResult = {
  topic: string;
  bias: "Left" | "Center-left" | "Center" | "Center-right" | "Right" | null;
  meta: ClassificationMetadata;
};

function heuristicClassification(text: string): TopicClassificationResult {
  for (const [topic, patterns] of Object.entries(TOPIC_KEYWORDS)) {
    if (patterns.some((pattern) => pattern.test(text))) {
      const bias = topic === "politics" ? "Center" : null;
      return {
        topic,
        bias,
        meta: {
          model: "heuristic-keywords",
          confidence: 0.45,
          rationale: "Keyword heuristic fallback.",
          fallbackUsed: true
        }
      };
    }
  }

  return {
    topic: "general",
    bias: "Center",
    meta: {
      model: "heuristic-keywords",
      confidence: 0.35,
      rationale: "No strong topical cues detected; defaulting to general.",
      fallbackUsed: true
    }
  };
}

function normalizeTopic(rawTopic: unknown): string {
  if (typeof rawTopic !== "string") return "general";
  const normalized = rawTopic.toLowerCase();
  return ["politics", "health", "science", "finance", "environment", "technology", "general"].includes(normalized)
    ? normalized
    : "general";
}

function normalizeBias(topic: string, rawBias: unknown): TopicClassificationResult["bias"] {
  if (topic !== "politics") return null;
  if (typeof rawBias !== "string") return "Center";
  return ["Left", "Center-left", "Center", "Center-right", "Right"].includes(rawBias)
    ? (rawBias as TopicClassificationResult["bias"])
    : "Center";
}

export async function classifyTopicWithOpenAI(input: AnalysisJobInput): Promise<TopicClassificationResult> {
  const text =
    input.text?.trim() ??
    input.contentUri ??
    "No text provided; user submitted non-text content for analysis.";

  try {
    const response = await openai.responses.create({
      model: MODEL_NAME,
      input: [
        {
          role: "system",
          content: PROMPT
        },
        {
          role: "user",
          content: JSON.stringify({
            mediaType: input.mediaType,
            topicHint: input.topicHint,
            text
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "topic_classification",
          schema: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                enum: ["politics", "health", "science", "finance", "environment", "technology", "general"]
              },
              bias: {
                type: ["string", "null"],
                enum: ["Left", "Center-left", "Center", "Center-right", "Right", null]
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1
              },
              rationale: {
                type: "string",
                maxLength: 160
              }
            },
            required: ["topic", "bias", "confidence", "rationale"],
            additionalProperties: false
          },
          strict: true
        }
      }
    });

    const firstOutput = response.output?.[0];
    const firstContent = firstOutput?.content?.[0];
    if (!firstOutput || !firstContent) {
      return heuristicClassification(text);
    }

    const parsed = await parseJsonContent<{
      topic?: unknown;
      bias?: unknown;
      confidence?: unknown;
      rationale?: unknown;
    }>(firstContent, "topic_classification");

    if (!parsed) {
      return heuristicClassification(text);
    }

    const topic = normalizeTopic(parsed.topic);
    const bias = normalizeBias(topic, parsed.bias);

    const confidence =
      typeof parsed.confidence === "number" && parsed.confidence >= 0 && parsed.confidence <= 1
        ? parsed.confidence
        : 0.6;
    const rationale =
      typeof parsed.rationale === "string" && parsed.rationale.length > 0
        ? parsed.rationale
        : "Model classification provided.";

    return {
      topic,
      bias,
      meta: {
        model: MODEL_NAME,
        confidence,
        rationale,
        fallbackUsed: false
      }
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Topic classification failed:", error);
    return heuristicClassification(text);
  }
}


