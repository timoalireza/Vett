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
            "You are a fact-checking assistant. Provide a concise English description of the image, call out notable people, text, symbols or documents, and list two factual observations that could assist verification. Limit the response to 3 sentences."
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Describe the key visual details that would help a fact-checker assess the claim context. Mention any visible text verbatim if possible."
            },
            {
              type: "input_image",
              image_url: attachment.url
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




