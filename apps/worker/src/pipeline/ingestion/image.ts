import { AnalysisAttachmentInput } from "@vett/shared";

import { openai } from "../../clients/openai.js";

const MODEL = "gpt-4o-mini";
const MAX_WORDS = 120;

export interface ImageIngestionSuccess {
  text: string;
  truncated: boolean;
  wordCount: number;
}

export interface ImageIngestionFailure {
  error: string;
}

export type ImageIngestionResult = ImageIngestionSuccess | ImageIngestionFailure;

function sanitizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export async function describeImageAttachment(attachment: AnalysisAttachmentInput): Promise<ImageIngestionResult> {
  if (attachment.kind !== "image") {
    return { error: "Unsupported attachment kind for image describer." };
  }

  if (!attachment.url) {
    return { error: "Image attachment missing URL." };
  }

  try {
    const response = await openai.responses.create({
      model: MODEL,
      input: [
        {
          role: "system",
          content:
            "You are a precise image analysis assistant for fact-checking. Describe ONLY what you can actually see in the image. Do NOT infer, assume, or guess details that are not clearly visible. Be specific and accurate. If you cannot identify something with certainty, say so explicitly. Never make up names, locations, or facts."
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Describe ONLY what is visible in this image. Include: (1) What objects, people, or scenes are clearly visible (2) Any text that appears verbatim (3) Visual characteristics like colors, shapes, settings. DO NOT identify specific locations, landmarks, or people unless they are clearly labeled or unmistakably recognizable. If uncertain about an identification, state 'appears to be' or 'possibly' rather than stating it as fact. Limit to 3 sentences."
            },
            {
              type: "input_image",
              image_url: {
                url: attachment.url
              }
            }
          ]
        }
      ]
    });

    const text = sanitizeText(response.output_text ?? "");

    if (!text) {
      return { error: "Image description returned empty text." };
    }

    const words = text.split(/\s+/).filter(Boolean);
    const truncated = words.length > MAX_WORDS;
    const limitedText = truncated ? words.slice(0, MAX_WORDS).join(" ") : text;

    return {
      text: limitedText,
      truncated,
      wordCount: limitedText.split(/\s+/).filter(Boolean).length
    };
  } catch (error) {
    return {
      error: (error as Error | undefined)?.message ?? "Image description failed."
    };
  }
}




