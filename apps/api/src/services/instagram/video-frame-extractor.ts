import ffmpeg from "fluent-ffmpeg";
import { writeFileSync, unlinkSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { serviceLogger } from "../../utils/service-logger.js";

const FRAME_INTERVAL_SECONDS = 0.5; // Extract frame every 0.5 seconds

/**
 * Extract frames from video file
 * Uses fluent-ffmpeg to extract frames at regular intervals
 * 
 * @param fileBuffer - Video file buffer
 * @param mimeType - MIME type of the video (e.g., "video/mp4")
 * @returns Array of frame buffers (JPEG format)
 */
export async function extractVideoFrames(
  fileBuffer: Buffer,
  mimeType: string
): Promise<Buffer[]> {
  // Create temporary files
  const tempDir = tmpdir();
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const inputFile = join(tempDir, `instagram-video-${timestamp}-${randomId}.${getFileExtension(mimeType)}`);
  const outputPattern = join(tempDir, `instagram-frame-${timestamp}-%03d.jpg`);

  try {
    // Write video buffer to temporary file
    writeFileSync(inputFile, fileBuffer);

    serviceLogger.debug({ 
      inputFile, 
      outputPattern,
      size: fileBuffer.length
    }, "[Instagram] Extracting video frames");

    // Extract frames using fluent-ffmpeg
    // fps=2: extract 2 frames per second (every 0.5 seconds)
    // -q:v 2: high quality JPEG output
    // -frames:v 60: limit to reasonable number of frames (max 60 frames = 30 seconds of video)
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputFile)
        .outputOptions([
          "-vf", "fps=2",
          "-q:v", "2",
          "-frames:v", "60"
        ])
        .output(outputPattern)
        .on("end", () => {
          resolve();
        })
        .on("error", (error) => {
          reject(error);
        })
        .run();
    });

    // Read all extracted frame files
    const frames: Buffer[] = [];
    let frameIndex = 1;
    
    while (true) {
      const frameFile = outputPattern.replace("%03d", frameIndex.toString().padStart(3, "0"));
      
      if (!existsSync(frameFile)) {
        break; // No more frames
      }

      const frameBuffer = readFileSync(frameFile);
      frames.push(frameBuffer);
      
      // Clean up frame file
      unlinkSync(frameFile);
      
      frameIndex++;
    }

    serviceLogger.debug({ 
      frameCount: frames.length 
    }, "[Instagram] Successfully extracted video frames");

    return frames;
  } catch (error: any) {
    serviceLogger.error({ error }, "[Instagram] Failed to extract video frames");
    throw new Error(`Failed to extract video frames: ${error.message || "Unknown error"}`);
  } finally {
    // Clean up input file
    if (existsSync(inputFile)) {
      try {
        unlinkSync(inputFile);
      } catch (error) {
        serviceLogger.warn({ error, inputFile }, "[Instagram] Failed to clean up temporary input file");
      }
    }
  }
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/webm": "webm",
    "video/x-matroska": "mkv"
  };

  return mimeToExt[mimeType] || "mp4";
}

