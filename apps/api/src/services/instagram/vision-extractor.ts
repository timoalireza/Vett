import { openai } from "../../clients/openai.js";
import { serviceLogger } from "../../utils/service-logger.js";
import { extractVideoFrames } from "./video-frame-extractor.js";

export interface VisionOutput {
  rawText: string;       // OCR text extracted
  description: string;   // What is visually happening
  metadata?: {
    frameCount?: number; // For videos, number of frames processed
    [key: string]: unknown;
  };
}

/**
 * Convert Buffer to ArrayBuffer safely
 */
function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  // Buffer extends Uint8Array, so we can access the underlying ArrayBuffer
  if (buffer.buffer) {
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
  }
  // Fallback: create new ArrayBuffer and copy data
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  buffer.copy(view);
  return arrayBuffer;
}

const VISION_MODEL = "gpt-4o";
const MAX_VIDEO_FRAMES = 10; // Limit frames processed to avoid token limits

/**
 * Extract vision data from media (OCR + visual description)
 * Uses GPT-4o Vision API for multimodal understanding
 */
export async function extractVisionData(
  mediaBytes: ArrayBuffer,
  mimeType: string
): Promise<VisionOutput> {
  const isVideo = mimeType.startsWith("video/");
  const isImage = mimeType.startsWith("image/");

  if (!isImage && !isVideo) {
    throw new Error(`Unsupported media type: ${mimeType}`);
  }

  try {
    if (isVideo) {
      return await extractVisionFromVideo(mediaBytes, mimeType);
    } else {
      return await extractVisionFromImage(mediaBytes, mimeType);
    }
  } catch (error: any) {
    serviceLogger.error({ error, mimeType }, "[Instagram] Vision extraction failed");
    throw error;
  }
}

/**
 * Extract vision data from image
 */
async function extractVisionFromImage(
  imageBytes: ArrayBuffer,
  mimeType: string
): Promise<VisionOutput> {
  serviceLogger.debug({ mimeType, size: imageBytes.byteLength }, "[Instagram] Extracting vision from image");

  try {
    // Convert ArrayBuffer to base64
    const base64Image = Buffer.from(imageBytes).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all visible text (OCR) and describe the factual content of this media. Focus on any text overlays, captions, or factual claims visible in the image. Return a structured response with: 1) All visible text extracted verbatim, 2) A description of what is visually happening and any factual claims being made."
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content returned from vision API");
    }

    // Parse the response to extract OCR text and description
    // The model should return structured text, but we'll parse it
    const parsed = parseVisionResponse(content);

    serviceLogger.debug({ 
      rawTextLength: parsed.rawText.length,
      descriptionLength: parsed.description.length
    }, "[Instagram] Successfully extracted vision from image");

    return parsed;
  } catch (error: any) {
    serviceLogger.error({ error }, "[Instagram] Failed to extract vision from image");
    throw new Error(`Vision extraction failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Extract vision data from video
 * Extracts frames and processes each frame
 */
async function extractVisionFromVideo(
  videoBytes: ArrayBuffer,
  mimeType: string
): Promise<VisionOutput> {
  serviceLogger.debug({ mimeType, size: videoBytes.byteLength }, "[Instagram] Extracting vision from video");

  try {
    // Convert ArrayBuffer to Buffer for frame extraction
    const videoBuffer = Buffer.from(videoBytes);

    // Extract frames
    const frames = await extractVideoFrames(videoBuffer, mimeType);
    
    if (frames.length === 0) {
      throw new Error("No frames extracted from video");
    }

    // Limit number of frames to process (to avoid token limits)
    const framesToProcess = frames.slice(0, MAX_VIDEO_FRAMES);
    
    serviceLogger.debug({ 
      totalFrames: frames.length,
      processingFrames: framesToProcess.length 
    }, "[Instagram] Processing video frames");

    // Process each frame
    const frameResults: Array<{ rawText: string; description: string }> = [];
    
    for (let i = 0; i < framesToProcess.length; i++) {
      try {
        // Convert Buffer to ArrayBuffer
        const frameArrayBuffer = bufferToArrayBuffer(framesToProcess[i]);
        const frameResult = await extractVisionFromImage(frameArrayBuffer, "image/jpeg");
        frameResults.push({
          rawText: frameResult.rawText,
          description: frameResult.description
        });
      } catch (error: any) {
        serviceLogger.warn({ frameIndex: i, error }, "[Instagram] Failed to process video frame, skipping");
        // Continue with other frames
      }
    }

    if (frameResults.length === 0) {
      throw new Error("Failed to extract vision from any video frames");
    }

    // Merge results from all frames
    const mergedRawText = frameResults
      .map((r) => r.rawText)
      .filter(Boolean)
      .join("\n\n");
    
    const mergedDescription = frameResults
      .map((r, i) => `Frame ${i + 1}: ${r.description}`)
      .join("\n\n");

    serviceLogger.debug({ 
      processedFrames: frameResults.length,
      mergedTextLength: mergedRawText.length
    }, "[Instagram] Successfully extracted vision from video");

    return {
      rawText: mergedRawText,
      description: mergedDescription,
      metadata: {
        frameCount: frameResults.length
      }
    };
  } catch (error: any) {
    serviceLogger.error({ error }, "[Instagram] Failed to extract vision from video");
    throw new Error(`Video vision extraction failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Parse vision API response to extract OCR text and description
 * The model returns structured text, we parse it to extract components
 */
function parseVisionResponse(content: string): VisionOutput {
  // Try to find structured sections
  const ocrMatch = content.match(/(?:OCR|Visible Text|Text Extracted)[:\s]*\n?([^\n]+(?:\n[^\n]+)*)/i);
  const descriptionMatch = content.match(/(?:Description|Visual Description|Content)[:\s]*\n?([^\n]+(?:\n[^\n]+)*)/i);

  let rawText = "";
  let description = "";

  if (ocrMatch) {
    rawText = ocrMatch[1].trim();
  } else {
    // If no structured format, try to extract text-like content
    // Look for quoted text or text that looks like OCR
    const quotedText = content.match(/"([^"]+)"/g);
    if (quotedText) {
      rawText = quotedText.map((q) => q.replace(/"/g, "")).join("\n");
    }
  }

  if (descriptionMatch) {
    description = descriptionMatch[1].trim();
  } else {
    // If no structured format, use the full content as description
    description = content.trim();
  }

  // Fallback: if we couldn't parse structured format, use content as both
  if (!rawText && !description) {
    rawText = content;
    description = content;
  }

  return {
    rawText: rawText || content,
    description: description || content
  };
}

