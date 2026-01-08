import { openai } from "../../clients/openai.js";
import { serviceLogger } from "../../utils/service-logger.js";
import type { VisionOutput } from "./vision-extractor.js";

const CLAIM_EXTRACTION_MODEL = "gpt-4o";

const SYSTEM_PROMPT = `You are extracting factual claims from user-submitted content.

Your task is to identify verifiable factual statements that can be fact-checked.

Rules:
- Extract ONLY factual claims (statements that can be verified)
- Ignore opinions, questions, or rhetorical statements
- Return claims as a JSON array of strings
- Each claim should be a concise, verifiable statement
- If no factual claims are found, return an empty array
- Focus on claims that can be fact-checked against sources

Return format: JSON array of strings, e.g., ["Claim 1", "Claim 2"]`;

/**
 * Extract factual claims from vision output and optional caption
 * Uses GPT-4o to extract verifiable claims from multimodal content
 */
export async function extractClaims(
  vision: VisionOutput,
  caption?: string
): Promise<string[]> {
  try {
    // Build input text combining OCR, description, and caption
    const inputParts: string[] = [];

    if (vision.rawText) {
      inputParts.push(`OCR Text:\n${vision.rawText}`);
    }

    if (vision.description) {
      inputParts.push(`Visual Description:\n${vision.description}`);
    }

    if (caption) {
      inputParts.push(`Caption:\n${caption}`);
    }

    const inputText = inputParts.join("\n\n---\n\n");

    if (!inputText.trim()) {
      serviceLogger.warn("[Instagram] No input content for claim extraction");
      return [];
    }

    serviceLogger.debug({ 
      inputLength: inputText.length,
      hasCaption: !!caption 
    }, "[Instagram] Extracting claims from multimodal content");

    const response = await openai.chat.completions.create({
      model: CLAIM_EXTRACTION_MODEL,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `Input:\n${inputText}\n\nExtract the factual claims from the above content. Return a JSON object with a "claims" array containing claim strings. Example: {"claims": ["Claim 1", "Claim 2"]}`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      serviceLogger.warn("[Instagram] No content returned from claim extraction");
      return [];
    }

    // Parse JSON response
    let parsed: { claims?: string[] } | string[];
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      serviceLogger.warn({ content }, "[Instagram] Failed to parse claim extraction JSON, trying to extract array directly");
      // Try to extract array from text if JSON parsing fails
      const arrayMatch = content.match(/\[.*\]/s);
      if (arrayMatch) {
        try {
          parsed = JSON.parse(arrayMatch[0]);
        } catch {
          serviceLogger.warn("[Instagram] Failed to parse extracted array");
          return [];
        }
      } else {
        return [];
      }
    }

    // Handle different response formats
    let claims: string[] = [];
    if (Array.isArray(parsed)) {
      claims = parsed;
    } else if (parsed && typeof parsed === "object" && "claims" in parsed && Array.isArray(parsed.claims)) {
      claims = parsed.claims;
    } else {
      serviceLogger.warn({ parsed }, "[Instagram] Unexpected claim extraction response format");
      return [];
    }

    // Filter and validate claims
    const validClaims = claims
      .filter((claim): claim is string => typeof claim === "string" && claim.trim().length > 0)
      .map((claim) => claim.trim())
      .filter((claim) => claim.length >= 10); // Minimum claim length

    serviceLogger.debug({ 
      extractedCount: claims.length,
      validCount: validClaims.length 
    }, "[Instagram] Successfully extracted claims");

    return validClaims;
  } catch (error: any) {
    serviceLogger.error({ error }, "[Instagram] Failed to extract claims");
    // Return empty array on failure (graceful degradation)
    return [];
  }
}

