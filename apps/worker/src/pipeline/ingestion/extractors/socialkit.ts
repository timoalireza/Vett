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
    
    // Log full response for debugging (truncated for security)
    console.log("[SocialKit] TikTok API response keys:", Object.keys(data));
    if (data.transcript) {
      console.log(`[SocialKit] Transcript length: ${data.transcript.length} chars`);
    } else if (data.text) {
      console.log(`[SocialKit] Text length: ${data.text.length} chars`);
    } else if (data.segments && Array.isArray(data.segments)) {
      console.log(`[SocialKit] Segments count: ${data.segments.length}`);
      if (data.segments.length > 0) {
        console.log(`[SocialKit] First segment sample:`, JSON.stringify(data.segments[0]).substring(0, 200));
      }
    } else {
      console.warn("[SocialKit] No transcript/text/segments found in response. Full response structure:", JSON.stringify(data).substring(0, 500));
    }

    // Parse SocialKit response format
    // Try multiple possible response structures
    let transcriptText = "";
    
    // Check for transcript in various possible fields
    if (data.transcript && typeof data.transcript === "string") {
      transcriptText = data.transcript;
    } else if (data.text && typeof data.text === "string") {
      transcriptText = data.text;
    } else if (data.data?.transcript) {
      transcriptText = data.data.transcript;
    } else if (data.result?.transcript) {
      transcriptText = data.result.transcript;
    } else if (Array.isArray(data.segments) && data.segments.length > 0) {
      // Build transcript from segments if no direct transcript field
      transcriptText = data.segments
        .map((seg: any) => seg.text || seg.transcript || "")
        .filter(Boolean)
        .join(" ");
    } else if (Array.isArray(data.transcript_segments) && data.transcript_segments.length > 0) {
      transcriptText = data.transcript_segments
        .map((seg: any) => seg.text || seg.transcript || "")
        .filter(Boolean)
        .join(" ");
    }

    const transcription: SocialKitTranscriptionResult = {
      transcript: transcriptText,
      language: data.language || data.data?.language,
      duration: data.duration || data.data?.duration,
      segments: data.segments || data.transcript_segments || data.data?.segments
    };

    const videoInfo: SocialKitVideoInfo = {
      title: data.title || data.data?.title,
      author: data.author || data.username || data.data?.author || data.data?.username,
      description: data.description || data.data?.description,
      views: data.views || data.data?.views,
      likes: data.likes || data.data?.likes
    };

    if (!transcription.transcript || transcription.transcript.trim().length === 0) {
      console.warn("[SocialKit] Empty transcript returned for TikTok video. Response structure:", {
        hasTranscript: !!data.transcript,
        hasText: !!data.text,
        hasSegments: !!data.segments,
        hasData: !!data.data,
        responseKeys: Object.keys(data)
      });
      return null;
    }
    
    console.log(`[SocialKit] Successfully extracted TikTok transcription: ${transcription.transcript.length} chars, ${transcription.transcript.split(/\s+/).length} words`);

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
    
    // Log full response for debugging
    console.log("[SocialKit] YouTube API response keys:", Object.keys(data));
    if (data.transcript) {
      console.log(`[SocialKit] Transcript length: ${data.transcript.length} chars`);
    } else if (data.text) {
      console.log(`[SocialKit] Text length: ${data.text.length} chars`);
    } else if (data.segments && Array.isArray(data.segments)) {
      console.log(`[SocialKit] Segments count: ${data.segments.length}`);
    }

    // Parse SocialKit response format - try multiple possible structures
    let transcriptText = "";
    
    if (data.transcript && typeof data.transcript === "string") {
      transcriptText = data.transcript;
    } else if (data.text && typeof data.text === "string") {
      transcriptText = data.text;
    } else if (data.data?.transcript) {
      transcriptText = data.data.transcript;
    } else if (data.result?.transcript) {
      transcriptText = data.result.transcript;
    } else if (Array.isArray(data.segments) && data.segments.length > 0) {
      transcriptText = data.segments
        .map((seg: any) => seg.text || seg.transcript || "")
        .filter(Boolean)
        .join(" ");
    } else if (Array.isArray(data.transcript_segments) && data.transcript_segments.length > 0) {
      transcriptText = data.transcript_segments
        .map((seg: any) => seg.text || seg.transcript || "")
        .filter(Boolean)
        .join(" ");
    }

    const transcription: SocialKitTranscriptionResult = {
      transcript: transcriptText,
      language: data.language || data.data?.language,
      duration: data.duration || data.data?.duration,
      segments: data.segments || data.transcript_segments || data.data?.segments
    };

    const videoInfo: SocialKitVideoInfo = {
      title: data.title || data.data?.title,
      author: data.author || data.channel_name || data.data?.author || data.data?.channel_name,
      description: data.description || data.data?.description,
      views: data.views || data.data?.views,
      likes: data.likes || data.data?.likes
    };

    if (!transcription.transcript || transcription.transcript.trim().length === 0) {
      console.warn("[SocialKit] Empty transcript returned for YouTube Shorts video. Response structure:", {
        hasTranscript: !!data.transcript,
        hasText: !!data.text,
        hasSegments: !!data.segments,
        hasData: !!data.data,
        responseKeys: Object.keys(data)
      });
      return null;
    }
    
    console.log(`[SocialKit] Successfully extracted YouTube Shorts transcription: ${transcription.transcript.length} chars, ${transcription.transcript.split(/\s+/).length} words`);

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

  // Add transcript - prioritize segments if available, fallback to full transcript
  if (transcription.segments && transcription.segments.length > 0) {
    // Use segmented transcript if available (more detailed)
    const segmentTexts = transcription.segments
      .map((seg: any) => seg.text || seg.transcript || "")
      .filter(Boolean)
      .join(" ");
    if (segmentTexts) {
      segments.push(`Transcript: ${segmentTexts}`);
    }
  }
  
  // Always add full transcript if available (even if we also have segments, as it might be more complete)
  if (transcription.transcript && transcription.transcript.trim().length > 0) {
    segments.push(`Transcript: ${transcription.transcript}`);
  }
  
  // If no transcript at all, add a note (though this shouldn't happen if validation worked)
  if (segments.length === 0 || (!transcription.transcript && (!transcription.segments || transcription.segments.length === 0))) {
    segments.push("Transcript: [No transcription available for this video]");
  }

  return segments.join("\n\n");
}

