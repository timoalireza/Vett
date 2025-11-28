import { env } from "../../../env.js";

export interface SocialKitTranscriptionResult {
  transcript: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

export interface SocialKitVideoInfo {
  title?: string;
  author?: string;
  description?: string;
  views?: number;
  likes?: number;
}

/**
 * Extract transcription from TikTok video using SocialKit API
 */
export async function extractTikTokTranscription(
  url: string
): Promise<{ transcription: SocialKitTranscriptionResult; videoInfo?: SocialKitVideoInfo } | null> {
  if (!env.SOCIALKIT_API_KEY) {
    console.warn("[SocialKit] API key not configured, skipping TikTok transcription");
    return null;
  }

  try {
    // SocialKit TikTok Transcript API endpoint
    // Documentation: https://docs.socialkit.dev/api-reference/tiktok-transcript-api
    // Uses GET request with query parameters
    const apiUrl = new URL("https://api.socialkit.dev/tiktok/transcript");
    apiUrl.searchParams.set("access_key", env.SOCIALKIT_API_KEY);
    apiUrl.searchParams.set("url", url);
    
    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SocialKit] TikTok transcription failed (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();

    // Parse SocialKit response format
    // Adjust based on actual API response structure
    const transcription: SocialKitTranscriptionResult = {
      transcript: data.transcript || data.text || "",
      language: data.language,
      duration: data.duration,
      segments: data.segments || data.transcript_segments
    };

    const videoInfo: SocialKitVideoInfo = {
      title: data.title,
      author: data.author || data.username,
      description: data.description,
      views: data.views,
      likes: data.likes
    };

    if (!transcription.transcript || transcription.transcript.trim().length === 0) {
      console.warn("[SocialKit] Empty transcript returned for TikTok video");
      return null;
    }

    return { transcription, videoInfo };
  } catch (error) {
    console.error("[SocialKit] TikTok transcription error:", error);
    return null;
  }
}

/**
 * Extract transcription from YouTube Shorts video using SocialKit API
 */
export async function extractYouTubeShortsTranscription(
  url: string
): Promise<{ transcription: SocialKitTranscriptionResult; videoInfo?: SocialKitVideoInfo } | null> {
  if (!env.SOCIALKIT_API_KEY) {
    console.warn("[SocialKit] API key not configured, skipping YouTube Shorts transcription");
    return null;
  }

  try {
    // SocialKit YouTube Transcript API endpoint
    // Documentation: https://docs.socialkit.dev/api-reference/youtube-transcript-api
    // Uses GET request with query parameters
    const apiUrl = new URL("https://api.socialkit.dev/youtube/transcript");
    apiUrl.searchParams.set("access_key", env.SOCIALKIT_API_KEY);
    apiUrl.searchParams.set("url", url);
    
    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SocialKit] YouTube Shorts transcription failed (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();

    // Parse SocialKit response format
    const transcription: SocialKitTranscriptionResult = {
      transcript: data.transcript || data.text || "",
      language: data.language,
      duration: data.duration,
      segments: data.segments || data.transcript_segments
    };

    const videoInfo: SocialKitVideoInfo = {
      title: data.title,
      author: data.author || data.channel_name,
      description: data.description,
      views: data.views,
      likes: data.likes
    };

    if (!transcription.transcript || transcription.transcript.trim().length === 0) {
      console.warn("[SocialKit] Empty transcript returned for YouTube Shorts video");
      return null;
    }

    return { transcription, videoInfo };
  } catch (error) {
    console.error("[SocialKit] YouTube Shorts transcription error:", error);
    return null;
  }
}

/**
 * Format transcription result for ingestion pipeline
 */
export function formatTranscriptionForIngestion(
  transcription: SocialKitTranscriptionResult,
  videoInfo?: SocialKitVideoInfo
): string {
  const segments: string[] = [];

  // Add video metadata if available
  if (videoInfo?.title) {
    segments.push(`Title: ${videoInfo.title}`);
  }
  if (videoInfo?.author) {
    segments.push(`Author: ${videoInfo.author}`);
  }
  if (videoInfo?.description) {
    segments.push(`Description: ${videoInfo.description}`);
  }

  // Add transcript
  if (transcription.segments && transcription.segments.length > 0) {
    // Use segmented transcript if available (more detailed)
    const segmentTexts = transcription.segments.map((seg) => seg.text).join(" ");
    segments.push(`Transcript: ${segmentTexts}`);
  } else {
    // Use full transcript
    segments.push(`Transcript: ${transcription.transcript}`);
  }

  return segments.join("\n\n");
}

