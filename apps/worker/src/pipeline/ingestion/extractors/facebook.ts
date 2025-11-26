import { scrapeFacebookPost } from "../../../services/apify-service.js";

export interface FacebookExtractionResult {
  text: string;
  author?: string;
  imageUrl?: string;
  videoUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  timestamp?: string;
}

/**
 * Facebook content extraction using Apify
 * 
 * Strategy:
 * 1. Try Apify (requires API key)
 * 2. Fall back to generic HTML scraping (handled by link-fetcher generic fallback)
 */
export async function extractFacebookContent(url: string): Promise<FacebookExtractionResult | null> {
  try {
    console.log(`[Facebook] Attempting Apify extraction for: ${url}`);
    const apifyResult = await scrapeFacebookPost(url);
    
    if (apifyResult) {
      // Prefer 'message' (post text) or 'text'
      const text = apifyResult.message || apifyResult.text || "";
      
      if (text) {
        console.log(`[Facebook] Apify extraction successful: ${text.length} chars`);
        
        // Extract media
        let imageUrl = undefined;
        let videoUrl = undefined;
        
        if (apifyResult.media && apifyResult.media.length > 0) {
          // Simple heuristic for media
          const media = apifyResult.media[0];
          if (media.thumbnail) imageUrl = media.thumbnail;
          if (media.url && (media.type === 'video' || url.includes('/video'))) videoUrl = media.url;
          if (!imageUrl && media.url && media.type === 'photo') imageUrl = media.url;
        }

        return {
          text: text,
          author: apifyResult.user?.name || apifyResult.pageName,
          imageUrl: imageUrl || apifyResult.user?.profilePic, // Fallback to profile pic
          videoUrl,
          likesCount: apifyResult.likes,
          commentsCount: apifyResult.comments,
          sharesCount: apifyResult.shares,
          timestamp: apifyResult.date
        };
      }
    }
    return null;
  } catch (error) {
    console.warn(`[Facebook] Apify extraction error:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

