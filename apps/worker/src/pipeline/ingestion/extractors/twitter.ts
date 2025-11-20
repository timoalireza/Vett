/**
 * X (Twitter) content extraction
 * 
 * Uses Twitter's oEmbed API which is free and doesn't require authentication.
 * For production, consider Twitter API v2 for better metadata (requires API key).
 */

export interface TwitterExtractionResult {
  text: string;
  author?: string;
  authorUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  timestamp?: string;
  retweetCount?: number;
  likeCount?: number;
}

const TWITTER_OEMBED_BASE = "https://publish.twitter.com/oembed";

/**
 * Extracts content from a Twitter/X post using oEmbed API
 */
export async function extractTwitterContent(url: string): Promise<TwitterExtractionResult | null> {
  try {
    const oembedUrl = `${TWITTER_OEMBED_BASE}?url=${encodeURIComponent(url)}&omit_script=true&dnt=true`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(oembedUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; VettBot/1.0)",
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as {
        html?: string;
        author_name?: string;
        author_url?: string;
        url?: string;
      };

      // Extract text from HTML
      let text = "";
      if (data.html) {
        // Remove HTML tags and decode entities
        text = data.html
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, " ")
          .trim();
      }

      return {
        text: text || "Twitter post content",
        author: data.author_name,
        authorUrl: data.author_url
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if ((error as Error | undefined)?.name === "AbortError") {
      return null;
    }
    return null;
  }
}

/**
 * Fallback: Scrapes Twitter page directly (less reliable, may break)
 */
export async function extractTwitterContentFallback(url: string): Promise<TwitterExtractionResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      
      // Try to extract from JSON-LD or meta tags
      const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
      if (jsonLdMatch) {
        try {
          const jsonLd = JSON.parse(jsonLdMatch[1]);
          if (jsonLd.text || jsonLd.description) {
            return {
              text: jsonLd.text || jsonLd.description,
              author: jsonLd.author?.name,
              authorUrl: jsonLd.author?.url
            };
          }
        } catch {
          // Ignore JSON parse errors
        }
      }

      // Extract from meta tags
      const ogDescriptionMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      if (ogDescriptionMatch) {
        return {
          text: ogDescriptionMatch[1]
        };
      }

      return null;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}

