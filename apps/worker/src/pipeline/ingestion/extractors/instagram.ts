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
import { scrapeInstagramPost } from "../../../services/apify-service.js";

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
 * 1. Try Apify first (most reliable, requires API key)
 * 2. Fall back to HTML scraping if Apify fails
 */
export async function extractInstagramContent(
  url: string,
  isReel: boolean = false,
  options?: {
    processMedia?: boolean;
  }
): Promise<InstagramExtractionResult | null> {
  // Validate URL
  if (!url || !url.includes("instagram.com")) {
    console.error(`[Instagram] Invalid Instagram URL: ${url}`);
    return null;
  }
  
  console.log(`[Instagram] Extracting content from URL: ${url}`);
  
  // 1. Try Apify Extraction first
  try {
    console.log(`[Instagram] Attempting Apify extraction for: ${url}`);
    const apifyResult = await scrapeInstagramPost(url);
    
    if (apifyResult) {
      const caption = apifyResult.caption || "";
      // Add alt text from images if available and caption is empty
      const altText = apifyResult.alt || "";
      const text = caption || altText || "";
      
      if (text) {
        console.log(`[Instagram] Apify extraction successful: ${text.length} chars`);
        return {
          text: text,
          author: apifyResult.ownerUsername,
          authorUrl: apifyResult.ownerUsername ? `https://instagram.com/${apifyResult.ownerUsername}` : undefined,
          imageUrl: apifyResult.displayUrl || apifyResult.images?.[0],
          videoUrl: apifyResult.videoUrl,
          isReel: isReel || !!apifyResult.videoUrl,
          hashtags: apifyResult.hashtags || collectHashtags(text),
          timestamp: apifyResult.timestamp,
          likeCount: apifyResult.likesCount,
          commentCount: apifyResult.commentsCount
        };
      }
    }
  } catch (error) {
    console.warn(`[Instagram] Apify extraction error:`, error instanceof Error ? error.message : String(error));
    // Fall through to HTML scraping
  }
  
  // 2. Fall back to HTML scraping
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
            // Verify we have post content indicators first (more reliable check)
            const hasPostContent = html.includes("shortcode_media") || 
                                  html.includes("PostPage") || 
                                  html.includes("ReelPage") || 
                                  html.includes("og:description") ||
                                  html.includes('property="og:type" content="instapp:photo"') ||
                                  html.includes('property="og:type" content="instapp:video"');
            
            if (hasPostContent) {
              console.log(`[Instagram] Successfully fetched HTML (${html.length} chars) for ${url}`);
              break; // Success, exit loop
            }
            
            // Only check for login page if we don't have post content indicators
            // Use structural HTML indicators instead of plain text to avoid false positives
            const hasLoginForm = html.includes('<form') && (
              html.includes('name="username"') || 
              html.includes('name="password"') ||
              html.includes('type="password"') ||
              html.includes('id="loginForm"') ||
              html.includes('class="login"') ||
              html.includes('action="/accounts/login/"')
            );
            
            // Check for Instagram's login page specific meta tags or structure
            const isLoginPage = html.includes('<title>Login') && html.includes('Instagram') ||
                               (html.includes('/accounts/login/') && !hasPostContent);
            
            if (hasLoginForm || isLoginPage) {
              console.warn(`[Instagram] Got login page instead of post content for ${url}`);
              lastError = new Error("Instagram login page detected");
              continue;
            }
            
            // If we don't have post content and it's not clearly a login page, warn but continue
            console.warn(`[Instagram] HTML doesn't contain expected post content indicators for ${url}`);
            lastError = new Error("Response doesn't contain post content");
            continue;
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
        const errorMsg = `Failed to fetch Instagram content from ${url}. ${lastError?.message || "The post may be private, require authentication, or Instagram may be blocking access."} Please try uploading a screenshot of the post instead.`;
        console.error(`[Instagram] ${errorMsg}`);
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
        const errorMsg = `No readable content could be extracted from Instagram post ${url}. The post may be private, require authentication, or contain only media without captions. Please try uploading a screenshot of the post instead.`;
        console.warn(`[Instagram] ${errorMsg}. HTML length: ${html.length}`);
        // Log a sample of the HTML for debugging (first 500 chars)
        console.debug(`[Instagram] HTML sample: ${html.substring(0, 500)}`);
        return null;
      }

      // Determine author (prioritize extracted author from sharedData)
      const finalAuthor = authorFromSharedData || username || ogSiteName || undefined;

      const hashtags = collectHashtags(combinedText);

      console.log(`[Instagram] Successfully extracted content from ${url}: ${combinedText.length} chars, author: ${finalAuthor || 'unknown'}`);
      console.log(`[Instagram] Extracted text preview: ${combinedText.substring(0, 200)}...`);

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

