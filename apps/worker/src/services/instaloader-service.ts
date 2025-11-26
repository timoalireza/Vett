/**
 * Instaloader Service
 * 
 * Integrates Instaloader (Python) for extracting Instagram media and metadata.
 * Processes downloaded media through OpenAI Vision API for analysis.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, unlink, rmdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openai } from "../clients/openai.js";
import { env } from "../env.js";

const execFileAsync = promisify(execFile);

export interface InstaloaderResult {
  success: boolean;
  text?: string;
  author?: string;
  authorUrl?: string;
  hashtags?: string[];
  isReel?: boolean;
  isVideo?: boolean;
  likeCount?: number;
  commentCount?: number;
  timestamp?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  mediaFiles?: Array<{
    type: "image" | "video";
    url: string;
    local_path: string;
    filename: string;
  }>;
  shortcode?: string;
  postUrl?: string;
  error?: string;
  mediaDescriptions?: Array<{
    type: "image" | "video";
    url: string;
    description: string;
  }>;
}

const MODEL = "gpt-4o-mini";
const MAX_WORDS_PER_MEDIA = 150;

/**
 * Process media file through OpenAI Vision API
 */
async function describeMedia(
  mediaPath: string,
  mediaType: "image" | "video",
  mediaUrl: string
): Promise<{ description: string; error?: string }> {
  try {
    if (mediaType === "image") {
      // Read image file and convert to base64
      const imageBuffer = await readFile(mediaPath);
      const base64Image = imageBuffer.toString("base64");
      
      // Determine MIME type from file extension
      const mimeType = mediaPath.endsWith(".jpg") || mediaPath.endsWith(".jpeg")
        ? "image/jpeg"
        : mediaPath.endsWith(".png")
        ? "image/png"
        : "image/jpeg";
      
      const imageDataUrl = `data:${mimeType};base64,${base64Image}`;
      
      // Use OpenAI Vision API (matching the format used in image.ts)
      const response = await openai.responses.create({
        model: MODEL,
        input: [
          {
            role: "system",
            content:
              "You are a precise image analysis assistant for fact-checking. Describe ONLY what you can actually see in the image. Include: (1) What objects, people, or scenes are clearly visible (2) Any text that appears verbatim (3) Visual characteristics like colors, shapes, settings. DO NOT identify specific locations, landmarks, or people unless they are clearly labeled or unmistakably recognizable. If uncertain about an identification, state 'appears to be' or 'possibly' rather than stating it as fact. Be concise but thorough."
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Describe what is visible in this image from an Instagram post. Include any text, people, objects, or scenes. Be factual and only describe what you can clearly see."
              },
              {
                type: "input_image",
                image_url: imageDataUrl
              }
            ]
          }
        ]
      });

      const description = response.output_text?.trim() || "";
      const words = description.split(/\s+/).filter(Boolean);
      const truncated = words.length > MAX_WORDS_PER_MEDIA;
      const finalDescription = truncated
        ? words.slice(0, MAX_WORDS_PER_MEDIA).join(" ") + "..."
        : description;

      return { description: finalDescription };
    } else {
      // For videos, we can only describe the thumbnail or provide a generic description
      // OpenAI Vision API doesn't support video analysis directly
      return {
        description: `Video content from Instagram post. Video URL: ${mediaUrl}. Note: Video content analysis requires video processing capabilities.`,
        error: "Video analysis not fully supported - only thumbnail available"
      };
    }
  } catch (error) {
    return {
      description: "",
      error: (error as Error | undefined)?.message ?? "Media description failed"
    };
  }
}

/**
 * Extract Instagram content using Instaloader Python script
 */
export async function extractWithInstaloader(
  url: string,
  options?: {
    username?: string;
    password?: string;
    processMedia?: boolean;
  }
): Promise<InstaloaderResult> {
  const scriptPath = join(process.cwd(), "apps/worker/scripts/instaloader_extract.py");
  
  // Check if script exists
  if (!existsSync(scriptPath)) {
    return {
      success: false,
      error: "Instaloader script not found. Please ensure instaloader_extract.py exists."
    };
  }

  try {
    // Prepare arguments
    const args = [scriptPath, url];
    if (options?.username || env.INSTAGRAM_USERNAME) {
      args.push("--username", options?.username || env.INSTAGRAM_USERNAME || "");
    }
    if (options?.password || env.INSTAGRAM_PASSWORD) {
      args.push("--password", options?.password || env.INSTAGRAM_PASSWORD || "");
    }

    // Execute Python script
    const { stdout, stderr } = await execFileAsync("python3", args, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 60000 // 60 second timeout
    });

    if (stderr && !stderr.includes("Warning:")) {
      console.warn(`[Instaloader] stderr: ${stderr}`);
    }

    const result: InstaloaderResult = JSON.parse(stdout);

    if (!result.success) {
      return result;
    }

    // Process media files through OpenAI Vision API if requested
    if (options?.processMedia !== false && result.mediaFiles && result.mediaFiles.length > 0) {
      const mediaDescriptions = await Promise.all(
        result.mediaFiles.map(async (media) => {
          const description = await describeMedia(
            media.local_path,
            media.type,
            media.url
          );
          
          return {
            type: media.type,
            url: media.url,
            description: description.description || description.error || "No description available"
          };
        })
      );

      result.mediaDescriptions = mediaDescriptions;

      // Clean up downloaded media files
      for (const media of result.mediaFiles) {
        try {
          if (existsSync(media.local_path)) {
            await unlink(media.local_path);
          }
        } catch (error) {
          console.warn(`[Instaloader] Failed to delete media file ${media.local_path}:`, error);
        }
      }

      // Try to remove temp directory if empty
      try {
        const tempDir = result.mediaFiles[0]?.local_path.split("/").slice(0, -1).join("/");
        if (tempDir && tempDir.includes("instaloader_")) {
          await rmdir(tempDir).catch(() => {
            // Ignore errors - directory might not be empty
          });
        }
      } catch {
        // Ignore cleanup errors
      }
    }

    return result;
  } catch (error) {
    const errorMessage = (error as Error | undefined)?.message ?? "Unknown error";
    
    // Check if Python/instaloader is available
    if (errorMessage.includes("ENOENT") || errorMessage.includes("python3")) {
      return {
        success: false,
        error: "Python 3 or Instaloader not found. Please install: pip install instaloader"
      };
    }

    return {
      success: false,
      error: `Instaloader extraction failed: ${errorMessage}`
    };
  }
}

