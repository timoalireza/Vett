import { env } from "../../env.js";
import { serviceLogger } from "../../utils/service-logger.js";

const INSTAGRAM_API_BASE = "https://graph.facebook.com/v18.0";

interface InstagramAttachment {
  type: string;
  payload?: {
    url?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface MediaFetchResult {
  buffer: Buffer;
  mimeType: string;
}

/**
 * Fetch media from Instagram attachment
 * Downloads media from Instagram CDN URLs or attachment payload URLs
 */
export async function fetchMediaFromAttachment(
  attachment: InstagramAttachment
): Promise<MediaFetchResult> {
  const mediaUrl = attachment.payload?.url;
  
  if (!mediaUrl || typeof mediaUrl !== "string") {
    throw new Error("No media URL found in attachment payload");
  }

  serviceLogger.debug({ url: mediaUrl }, "[Instagram] Fetching media from URL");

  try {
    // Build request headers
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
    };

    // If we have an access token and the URL is from Instagram Graph API, add it
    if (env.INSTAGRAM_PAGE_ACCESS_TOKEN && mediaUrl.includes("graph.facebook.com")) {
      // URL might already have access_token, or we might need to add it
      const urlObj = new URL(mediaUrl);
      if (!urlObj.searchParams.has("access_token")) {
        urlObj.searchParams.set("access_token", env.INSTAGRAM_PAGE_ACCESS_TOKEN);
        mediaUrl = urlObj.toString();
      }
    }

    const response = await fetch(finalMediaUrl, {
      method: "GET",
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch media: HTTP ${response.status} ${response.statusText}`);
    }

    // Get MIME type from response headers
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const mimeType = contentType.split(";")[0].trim();

    // Download media as buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    serviceLogger.debug({ 
      url: finalMediaUrl, 
      mimeType, 
      size: buffer.length 
    }, "[Instagram] Successfully fetched media");

    return {
      buffer,
      mimeType
    };
  } catch (error: any) {
    serviceLogger.error({ error, url: finalMediaUrl }, "[Instagram] Failed to fetch media");
    throw new Error(`Failed to download media: ${error.message || "Unknown error"}`);
  }
}

