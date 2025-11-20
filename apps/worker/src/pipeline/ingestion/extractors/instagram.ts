/**
 * Instagram content extraction (enhanced for Reels and Posts)
 * 
 * Note: Instagram requires authentication for API access.
 * This uses HTML scraping which works for public content.
 * 
 * For production, consider:
 * - Instagram Basic Display API (requires OAuth)
 * - Instagram Graph API (requires Facebook App)
 * - Third-party APIs like RapidAPI Instagram scraper
 */

import { parseHTML } from "linkedom";

export interface InstagramExtractionResult {
  text: string;
  author?: string;
  authorUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  isReel?: boolean;
  hashtags?: string[];
  timestamp?: string;
  likeCount?: number;
  commentCount?: number;
}

function sanitize(text: string | null | undefined): string | null {
  if (!text) return null;
  return text.replace(/\s+/g, " ").replace(/\u200e/g, "").trim();
}

function collectHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const regex = /#[\p{L}\p{N}_]+/gu;
  const matches = text.match(regex);
  if (!matches) return [];
  return Array.from(new Set(matches.map((tag) => tag.toLowerCase())));
}

/**
 * Enhanced Instagram extraction with better Reels support
 */
export async function extractInstagramContent(
  url: string,
  isReel: boolean = false
): Promise<InstagramExtractionResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9"
        }
      });

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      const { document } = parseHTML(html);

      // Extract from meta tags
      const ogDescription = sanitize(
        document.querySelector('meta[property="og:description"]')?.getAttribute("content")
      );
      const ogTitle = sanitize(document.querySelector('meta[property="og:title"]')?.getAttribute("content"));
      const ogImage = sanitize(document.querySelector('meta[property="og:image"]')?.getAttribute("content"));
      const ogVideo = sanitize(document.querySelector('meta[property="og:video"]')?.getAttribute("content"));
      const ogVideoUrl = sanitize(document.querySelector('meta[property="og:video:url"]')?.getAttribute("content"));

      // Extract author from meta or URL
      const ogSiteName = sanitize(document.querySelector('meta[property="og:site_name"]')?.getAttribute("content"));
      const urlMatch = url.match(/instagram\.com\/([^\/]+)/);
      const username = urlMatch?.[1];

      // Try to extract from JSON-LD (already handled in link-fetcher, but we'll enhance)
      let jsonLdCaption: string | null = null;
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent || "{}");
          if (data.caption) {
            jsonLdCaption = sanitize(data.caption);
          } else if (data.description) {
            jsonLdCaption = sanitize(data.description);
          }
          if (jsonLdCaption) break;
        } catch {
          // Ignore parse errors
        }
      }

      // Extract from window._sharedData (Instagram's embedded data)
      const sharedDataMatch = html.match(/window\._sharedData\s*=\s*(\{[\s\S]*?\});/);
      let captionFromSharedData: string | null = null;
      if (sharedDataMatch) {
        try {
          const sharedData = JSON.parse(sharedDataMatch[1]);
          const entryData = sharedData.entry_data;
          
          // Handle PostPage structure
          if (entryData?.PostPage?.[0]?.graphql?.shortcode_media) {
            const media = entryData.PostPage[0].graphql.shortcode_media;
            const edges = media.edge_media_to_caption?.edges;
            if (edges?.[0]?.node?.text) {
              captionFromSharedData = sanitize(edges[0].node.text);
            }
          }
          
          // Handle Reels structure
          if (entryData?.ReelPage?.[0]?.graphql?.reel) {
            const reel = entryData.ReelPage[0].graphql.reel;
            const edges = reel.edge_media_to_caption?.edges;
            if (edges?.[0]?.node?.text) {
              captionFromSharedData = sanitize(edges[0].node.text);
            }
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Combine all text sources
      const textSources = [
        captionFromSharedData,
        jsonLdCaption,
        ogDescription,
        ogTitle
      ].filter((text): text is string => Boolean(text));

      const combinedText = textSources.join(" ").trim() || null;

      if (!combinedText) {
        return null;
      }

      const hashtags = collectHashtags(combinedText);

      return {
        text: combinedText,
        author: username || ogSiteName || undefined,
        authorUrl: username ? `https://instagram.com/${username}` : undefined,
        imageUrl: ogImage || undefined,
        videoUrl: ogVideo || ogVideoUrl || undefined,
        isReel: isReel,
        hashtags: hashtags.length > 0 ? hashtags : undefined
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

