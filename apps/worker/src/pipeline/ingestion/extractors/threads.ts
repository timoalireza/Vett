/**
 * Threads (Meta) content extraction
 * 
 * Note: Threads doesn't have a public oEmbed API yet.
 * This uses HTML scraping which may be fragile.
 * 
 * For production, consider:
 * - Meta Graph API (requires app registration and OAuth)
 * - Third-party APIs like RapidAPI Threads scraper
 */

import { parseHTML } from "linkedom";

export interface ThreadsExtractionResult {
  text: string;
  author?: string;
  authorUrl?: string;
  imageUrl?: string;
  timestamp?: string;
  likeCount?: number;
  replyCount?: number;
}

function sanitize(text: string | null | undefined): string | null {
  if (!text) return null;
  return text.replace(/\s+/g, " ").replace(/\u200e/g, "").trim();
}

/**
 * Extracts content from a Threads post
 */
export async function extractThreadsContent(url: string): Promise<ThreadsExtractionResult | null> {
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

      // Extract from meta tags (most reliable)
      const ogDescription = sanitize(
        document.querySelector('meta[property="og:description"]')?.getAttribute("content")
      );
      const ogTitle = sanitize(document.querySelector('meta[property="og:title"]')?.getAttribute("content"));
      const ogImage = sanitize(document.querySelector('meta[property="og:image"]')?.getAttribute("content"));
      const ogAuthor = sanitize(document.querySelector('meta[property="og:site_name"]')?.getAttribute("content"));

      // Try to extract from JSON-LD
      let jsonLdText: string | null = null;
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent || "{}");
          if (data.articleBody) {
            jsonLdText = sanitize(data.articleBody);
          } else if (data.text) {
            jsonLdText = sanitize(data.text);
          }
          if (jsonLdText) break;
        } catch {
          // Ignore parse errors
        }
      }

      // Try to extract from page structure (may vary)
      const articleText = sanitize(
        document.querySelector('article')?.textContent ||
        document.querySelector('[data-testid="post-text"]')?.textContent ||
        document.querySelector('.post-text')?.textContent
      );

      const text = jsonLdText || ogDescription || articleText || ogTitle || null;

      if (!text) {
        return null;
      }

      return {
        text,
        author: ogAuthor || undefined,
        imageUrl: ogImage || undefined
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

