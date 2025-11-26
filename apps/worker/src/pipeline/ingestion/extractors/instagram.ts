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
import { extractWithInstaloader } from "../../services/instaloader-service.js";

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
 * Uses multiple extraction strategies for better reliability
 * 
 * Strategy:
 * 1. Try Instaloader first (most reliable, requires Python/instaloader)
 * 2. Fall back to HTML scraping if Instaloader fails
 */
export async function extractInstagramContent(
  url: string,
  isReel: boolean = false,
  options?: {
    useInstaloader?: boolean;
    processMedia?: boolean;
  }
): Promise<InstagramExtractionResult | null> {
  // Try Instaloader first if enabled (default: true)
  const useInstaloader = options?.useInstaloader !== false;
  
  if (useInstaloader) {
    try {
      console.log(`[Instagram] Attempting Instaloader extraction for: ${url}`);
      const instaloaderResult = await extractWithInstaloader(url, {
        processMedia: options?.processMedia ?? true
      });
      
      if (instaloaderResult.success && instaloaderResult.text) {
        console.log(`[Instagram] Instaloader extraction successful: ${instaloaderResult.text.length} chars`);
        
        // Combine text with media descriptions if available
        let combinedText = instaloaderResult.text;
        if (instaloaderResult.mediaDescriptions && instaloaderResult.mediaDescriptions.length > 0) {
          const mediaDescriptions = instaloaderResult.mediaDescriptions
            .map((m) => `[${m.type === "image" ? "Image" : "Video"}]: ${m.description}`)
            .join("\n");
          combinedText = `${combinedText}\n\n${mediaDescriptions}`;
        }
        
        return {
          text: combinedText,
          author: instaloaderResult.author,
          authorUrl: instaloaderResult.authorUrl,
          imageUrl: instaloaderResult.imageUrls?.[0],
          videoUrl: instaloaderResult.videoUrls?.[0],
          isReel: instaloaderResult.isReel ?? isReel,
          hashtags: instaloaderResult.hashtags,
          timestamp: instaloaderResult.timestamp,
          likeCount: instaloaderResult.likeCount,
          commentCount: instaloaderResult.commentCount
        };
      } else {
        console.warn(`[Instagram] Instaloader extraction failed: ${instaloaderResult.error}, falling back to HTML scraping`);
      }
    } catch (error) {
      console.warn(`[Instagram] Instaloader extraction error:`, error instanceof Error ? error.message : String(error));
      // Fall through to HTML scraping
    }
  }
  
  // Fall back to HTML scraping
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // Increased timeout

    try {
      // Try multiple user agents to avoid blocking
      const userAgents = [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      ];
      
      let html: string | null = null;
      let lastError: Error | null = null;

      // Try each user agent until one works
      for (const userAgent of userAgents) {
        try {
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              "User-Agent": userAgent,
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              "Accept-Encoding": "gzip, deflate, br",
              "Cache-Control": "no-cache",
              "Pragma": "no-cache",
              Referer: "https://www.instagram.com/",
              "Sec-Fetch-Dest": "document",
              "Sec-Fetch-Mode": "navigate",
              "Sec-Fetch-Site": "none"
            },
            redirect: "follow"
          });

          if (!response.ok) {
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
            continue;
          }

          html = await response.text();
          
          // Check if we got actual HTML content (not a redirect or error page)
          if (html && html.length > 1000 && html.includes("<html")) {
            break; // Success, exit loop
          } else {
            lastError = new Error("Response does not contain valid HTML");
            continue;
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          continue; // Try next user agent
        }
      }

      if (!html) {
        console.error(`[Instagram] Failed to fetch HTML for ${url}:`, lastError?.message);
        return null;
      }

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

      // Extract from window._sharedData (Instagram's embedded data) - Primary method
      const sharedDataMatch = html.match(/window\._sharedData\s*=\s*(\{[\s\S]*?\});/);
      let captionFromSharedData: string | null = null;
      let authorFromSharedData: string | null = null;
      
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
            // Extract author from owner
            if (media.owner?.username) {
              authorFromSharedData = sanitize(media.owner.username);
            }
          }
          
          // Handle Reels structure
          if (entryData?.ReelPage?.[0]?.graphql?.reel) {
            const reel = entryData.ReelPage[0].graphql.reel;
            const edges = reel.edge_media_to_caption?.edges;
            if (edges?.[0]?.node?.text) {
              captionFromSharedData = sanitize(edges[0].node.text);
            }
            // Extract author from owner
            if (reel.owner?.username) {
              authorFromSharedData = sanitize(reel.owner.username);
            }
          }
        } catch (err) {
          console.warn(`[Instagram] Failed to parse _sharedData for ${url}:`, err instanceof Error ? err.message : String(err));
        }
      }

      // Try alternative data structure: window.__additionalDataLoaded
      if (!captionFromSharedData) {
        const additionalDataMatch = html.match(/window\.__additionalDataLoaded\s*\([^,]+,\s*(\{[\s\S]*?\})\)/);
        if (additionalDataMatch) {
          try {
            const additionalData = JSON.parse(additionalDataMatch[1]);
            if (additionalData?.graphql?.shortcode_media) {
              const media = additionalData.graphql.shortcode_media;
              const edges = media.edge_media_to_caption?.edges;
              if (edges?.[0]?.node?.text) {
                captionFromSharedData = sanitize(edges[0].node.text);
              }
              if (media.owner?.username) {
                authorFromSharedData = sanitize(media.owner.username);
              }
            }
          } catch (err) {
            console.warn(`[Instagram] Failed to parse __additionalDataLoaded for ${url}:`, err instanceof Error ? err.message : String(err));
          }
        }
      }

      // Try extracting from article tag content (fallback)
      if (!captionFromSharedData) {
        const article = document.querySelector('article');
        if (article) {
          // Try to find caption in various possible locations
          const captionSelectors = [
            'h1',
            '[role="heading"]',
            'span[dir="auto"]',
            'div[dir="auto"]',
            'p'
          ];
          
          for (const selector of captionSelectors) {
            const elements = article.querySelectorAll(selector);
            for (const el of elements) {
              const text = sanitize(el.textContent);
              if (text && text.length > 20 && text.length < 2000) {
                // Likely a caption if it's reasonable length
                captionFromSharedData = text;
                break;
              }
            }
            if (captionFromSharedData) break;
          }
        }
      }

      // Combine all text sources (prioritize _sharedData as most reliable)
      const textSources = [
        captionFromSharedData,
        jsonLdCaption,
        ogDescription,
        ogTitle
      ].filter((text): text is string => Boolean(text));

      const combinedText = textSources.join(" ").trim() || null;

      if (!combinedText) {
        console.warn(`[Instagram] No text extracted from ${url}. HTML length: ${html.length}`);
        // Log a sample of the HTML for debugging (first 500 chars)
        console.debug(`[Instagram] HTML sample: ${html.substring(0, 500)}`);
        return null;
      }

      // Determine author (prioritize extracted author from sharedData)
      const finalAuthor = authorFromSharedData || username || ogSiteName || undefined;

      const hashtags = collectHashtags(combinedText);

      console.log(`[Instagram] Successfully extracted content from ${url}: ${combinedText.length} chars, author: ${finalAuthor || 'unknown'}`);

      return {
        text: combinedText,
        author: finalAuthor,
        authorUrl: finalAuthor ? `https://instagram.com/${finalAuthor.replace('@', '')}` : undefined,
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

