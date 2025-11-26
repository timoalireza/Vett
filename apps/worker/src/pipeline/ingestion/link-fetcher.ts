import { AnalysisAttachmentInput } from "@vett/shared";
import { parseHTML } from "linkedom";
import { detectPlatform } from "./platforms.js";
import { extractTwitterContent, extractTwitterContentFallback } from "./extractors/twitter.js";
import { extractInstagramContent } from "./extractors/instagram.js";
import { extractThreadsContent } from "./extractors/threads.js";
import { assessExtractionQuality } from "./quality.js";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_CONTENT_LENGTH = 20_000; // characters kept from fetched article
const MIN_WORDS_THRESHOLD = 12;

export interface LinkIngestionSuccess {
  text: string;
  truncated: boolean;
  wordCount: number;
  imageUrl?: string;
  warnings?: string[];
  quality?: {
    level: "excellent" | "good" | "fair" | "poor" | "insufficient";
    score: number;
    reasons?: string[];
    recommendation?: "screenshot" | "api_key" | "none";
    message?: string;
  };
}

export interface LinkIngestionFailure {
  error: string;
}

type LinkIngestionResult = LinkIngestionSuccess | LinkIngestionFailure;

function isHtmlContent(contentType: string | null): boolean {
  if (!contentType) return false;
  return /text\/html/i.test(contentType) || /application\/xhtml\+xml/i.test(contentType);
}

function isPlainText(contentType: string | null): boolean {
  if (!contentType) return false;
  return /text\/plain/i.test(contentType);
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

function truncateContent(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_CONTENT_LENGTH) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, MAX_CONTENT_LENGTH), truncated: true };
}

function isLowInformation(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS_THRESHOLD) return true;
  const uniqueWords = new Set(words);
  const diversity = uniqueWords.size / words.length;
  if (diversity < 0.45) return true;
  if (/^(li\s*){5,}$/i.test(text)) return true;
  if (/^\W+$/.test(text)) return true;
  return false;
}

function parseJsonLd(document: any): {
  caption?: string;
  description?: string;
  authorName?: string;
  keywords?: string[];
  comments?: string[];
} {
  const result: {
    caption?: string;
    description?: string;
    authorName?: string;
    keywords?: string[];
    comments?: string[];
  } = {};
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

  const comments: string[] = [];
  const keywordsSet = new Set<string>();

  for (const script of scripts) {
    const raw = script.textContent;
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        if (typeof node !== "object" || node === null) continue;
        if (!result.caption && typeof node.caption === "string") {
          result.caption = sanitize(node.caption) ?? result.caption;
        }
        if (!result.description && typeof node.description === "string") {
          result.description = sanitize(node.description) ?? result.description;
        }
        if (!result.description && typeof node.articleBody === "string") {
          result.description = sanitize(node.articleBody) ?? result.description;
        }
        if (!result.authorName) {
          const author = (node.author ??
            node.creator ??
            node.accountablePerson) as { name?: string } | undefined;
          if (author && typeof author === "object" && typeof author.name === "string") {
            result.authorName = sanitize(author.name) ?? result.authorName;
          }
        }
        if (typeof node.keywords === "string") {
          node.keywords
            .split(",")
            .map((entry: string) => entry.trim())
            .filter(Boolean)
            .forEach((entry: string) => keywordsSet.add(entry.toLowerCase()));
        } else if (Array.isArray(node.keywords)) {
          node.keywords
            .map((entry) => (typeof entry === "string" ? entry.trim() : null))
            .filter((entry): entry is string => Boolean(entry))
            .forEach((entry) => keywordsSet.add(entry.toLowerCase()));
        }

        const nodeComments = node.comment;
        if (Array.isArray(nodeComments)) {
          nodeComments.forEach((comment) => {
            if (comment && typeof comment.text === "string") {
              comments.push(comment.text);
            }
          });
        } else if (nodeComments && typeof nodeComments === "object" && typeof nodeComments.text === "string") {
          comments.push(nodeComments.text);
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  if (keywordsSet.size > 0) {
    result.keywords = Array.from(keywordsSet);
  }

  if (comments.length > 0) {
    result.comments = comments
      .map((comment) => sanitize(comment))
      .filter((entry): entry is string => Boolean(entry));
  }

  return result;
}

function extractSharedData(rawHtml: string): {
  captionFromScripts?: string;
  commentsFromScripts: string[];
  hashtagsFromScripts: string[];
} {
  const result = {
    captionFromScripts: undefined as string | undefined,
    commentsFromScripts: [] as string[],
    hashtagsFromScripts: [] as string[]
  };

  const sharedDataRegex = /window\._sharedData\s*=\s*(\{[\s\S]*?\});/;
  const additionalDataRegex = /window\.__additionalDataLoaded\s*\(\s*[^,]+,\s*(\{[\s\S]*?\})\s*\)/g;

  const datasets: any[] = [];

  const sharedMatch = sharedDataRegex.exec(rawHtml);
  if (sharedMatch) {
    try {
      const cleaned = sharedMatch[1].replace(/;$/, "");
      datasets.push(JSON.parse(cleaned));
    } catch {
      // ignore parsing errors
    }
  }

  let additionalMatch: RegExpExecArray | null;
  while ((additionalMatch = additionalDataRegex.exec(rawHtml)) !== null) {
    try {
      datasets.push(JSON.parse(additionalMatch[1]));
    } catch {
      // ignore
    }
  }

  const captions: string[] = [];
  const comments: string[] = [];
  const hashtagSet = new Set<string>();

  const collectFromCaption = (text: string | undefined | null) => {
    const sanitized = sanitize(text);
    if (sanitized) {
      captions.push(sanitized);
      collectHashtags(sanitized).forEach((tag) => hashtagSet.add(tag));
    }
  };

  const traverseMediaNode = (node: any) => {
    if (!node || typeof node !== "object") return;
    const media = node.shortcode_media ?? node.media ?? node.graphql?.shortcode_media ?? node;
    if (media && typeof media === "object") {
      if (media.edge_media_to_caption?.edges?.length) {
        media.edge_media_to_caption.edges.forEach((edge: any) =>
          collectFromCaption(edge?.node?.text ?? edge?.node?.caption)
        );
      }
      if (media.edge_media_to_parent_comment?.edges?.length) {
        media.edge_media_to_parent_comment.edges.forEach((edge: any) => {
          const text = sanitize(edge?.node?.text);
          if (text) {
            comments.push(text);
            collectHashtags(text).forEach((tag) => hashtagSet.add(tag));
          }
        });
      }
      if (media.edge_media_preview_comment?.edges?.length) {
        media.edge_media_preview_comment.edges.forEach((edge: any) => {
          const text = sanitize(edge?.node?.text);
          if (text) {
            comments.push(text);
            collectHashtags(text).forEach((tag) => hashtagSet.add(tag));
          }
        });
      }
      if (Array.isArray(media.accessibility_caption)) {
        media.accessibility_caption
          .map((entry) => sanitize(entry))
          .filter((entry): entry is string => Boolean(entry))
          .forEach((entry) => captions.push(entry));
      } else if (typeof media.accessibility_caption === "string") {
        const text = sanitize(media.accessibility_caption);
        if (text) captions.push(text);
      }
    }
  };

  datasets.forEach((dataset) => {
    if (!dataset || typeof dataset !== "object") {
      return;
    }

    const entryData = dataset.entry_data ?? dataset?.entryData;
    if (entryData && entryData.PostPage && Array.isArray(entryData.PostPage)) {
      entryData.PostPage.forEach((page: any) => traverseMediaNode(page?.graphql));
    }

    if (dataset.require_login?.graphql?.shortcode_media) {
      traverseMediaNode(dataset.require_login.graphql);
    }

    if (dataset.graphql?.shortcode_media) {
      traverseMediaNode(dataset.graphql);
    }
  });

  if (captions.length > 0) {
    result.captionFromScripts = captions[0];
  }
  if (comments.length > 0) {
    result.commentsFromScripts = comments;
  }
  if (hashtagSet.size > 0) {
    result.hashtagsFromScripts = Array.from(hashtagSet);
  }

  return result;
}

export async function fetchLinkAttachment(attachment: AnalysisAttachmentInput): Promise<LinkIngestionResult> {
  if (attachment.kind !== "link") {
    return { error: "Unsupported attachment kind for link fetcher." };
  }

  // Detect platform and try platform-specific extraction first
  const platformInfo = detectPlatform(attachment.url);
  
  if (platformInfo.platform === "x" || platformInfo.platform === "twitter") {
    const twitterResult = await extractTwitterContent(attachment.url);
    if (twitterResult?.text) {
      const { text, truncated } = truncateContent(twitterResult.text);
      const words = text.split(/\s+/).filter(Boolean);
      
      if (words.length === 0) {
        // Fall through to generic extraction
      } else {
        const segments: string[] = [text];
        if (twitterResult.author) {
          segments.push(`Author: ${twitterResult.author}`);
        }
        
        const combined = segments.join("\n");
        const finalWords = combined.split(/\s+/).filter(Boolean);
        
        // Assess quality for social media extraction
        const quality = assessExtractionQuality(
          combined,
          finalWords.length,
          platformInfo.platform,
          Boolean(twitterResult.author),
          Boolean(twitterResult.imageUrl),
          truncated
        );
        
        return {
          text: combined,
          truncated,
          wordCount: finalWords.length,
          imageUrl: twitterResult.imageUrl,
          warnings: undefined,
          quality
        };
      }
    }
    
    // Try fallback extraction
    const fallbackResult = await extractTwitterContentFallback(attachment.url);
    if (fallbackResult?.text) {
      const { text, truncated } = truncateContent(fallbackResult.text);
      const words = text.split(/\s+/).filter(Boolean);
      
      if (words.length > 0) {
        // Assess quality for fallback extraction
        const quality = assessExtractionQuality(
          text,
          words.length,
          platformInfo.platform,
          Boolean(fallbackResult.author),
          false,
          truncated
        );
        
        return {
          text,
          truncated,
          wordCount: words.length,
          imageUrl: undefined,
          warnings: ["Used fallback Twitter extraction method"],
          quality
        };
      }
    }
  } else if (platformInfo.platform === "instagram") {
    console.log(`[LinkFetcher] Attempting Instagram extraction for: ${attachment.url}`);
    // Apify is now prioritized within extractInstagramContent function
    const instagramResult = await extractInstagramContent(attachment.url, platformInfo.isReel ?? false, {
      useInstaloader: true, // Fallback to Instaloader if Apify fails
      processMedia: true
    });
    
    if (instagramResult?.text && instagramResult.text.trim().length > 0) {
      // Log extracted content for debugging
      console.log(`[LinkFetcher] Instagram content extracted: ${instagramResult.text.substring(0, 300)}...`);
      console.log(`[LinkFetcher] Instagram author: ${instagramResult.author || 'unknown'}`);
      const segments: string[] = [instagramResult.text];
      
      if (instagramResult.author) {
        segments.push(`Author: @${instagramResult.author}`);
      }
      
      if (instagramResult.hashtags && instagramResult.hashtags.length > 0) {
        segments.push(`Hashtags: ${instagramResult.hashtags.join(", ")}`);
      }
      
      if (instagramResult.isReel) {
        segments.push("[Instagram Reel]");
      }
      
      const combined = segments.join("\n");
      const { text, truncated } = truncateContent(combined);
      const words = text.split(/\s+/).filter(Boolean);
      
      if (words.length > 0) {
        console.log(`[LinkFetcher] Instagram extraction successful: ${words.length} words extracted`);
        
        // Assess quality for Instagram extraction
        const quality = assessExtractionQuality(
          text,
          words.length,
          "instagram",
          Boolean(instagramResult.author),
          Boolean(instagramResult.imageUrl || instagramResult.videoUrl),
          truncated
        );
        
        return {
          text,
          truncated,
          wordCount: words.length,
          imageUrl: instagramResult.imageUrl || instagramResult.videoUrl,
          warnings: quality.level === "poor" || quality.level === "insufficient" 
            ? ["Instagram content extraction quality is low. Consider using Instagram API for better results."]
            : undefined,
          quality
        };
      }
    }
    
    // Instagram-specific extraction failed, fall through to generic HTML scraper
    console.warn(`[LinkFetcher] Instagram-specific extraction failed for ${attachment.url}, falling back to generic HTML scraper`);
    
    // Log failure reason if extraction returned null or empty result
    if (!instagramResult || !instagramResult.text || instagramResult.text.trim().length === 0) {
      console.warn(`[LinkFetcher] Instagram extraction returned no content for ${attachment.url}`);
    }
  } else if (platformInfo.platform === "threads") {
    const threadsResult = await extractThreadsContent(attachment.url);
    if (threadsResult?.text) {
      const segments: string[] = [threadsResult.text];
      
      if (threadsResult.author) {
        segments.push(`Author: @${threadsResult.author}`);
      }
      
      const combined = segments.join("\n");
      const { text, truncated } = truncateContent(combined);
      const words = text.split(/\s+/).filter(Boolean);
      
      if (words.length > 0) {
        // Assess quality for Threads extraction
        const quality = assessExtractionQuality(
          text,
          words.length,
          "threads",
          Boolean(threadsResult.author),
          Boolean(threadsResult.imageUrl),
          truncated
        );
        
        return {
          text,
          truncated,
          wordCount: words.length,
          imageUrl: threadsResult.imageUrl,
          warnings: undefined,
          quality
        };
      }
    }
  } else if (platformInfo.platform === "facebook") {
    console.log(`[LinkFetcher] Attempting Facebook extraction for: ${attachment.url}`);
    const facebookResult = await extractFacebookContent(attachment.url);
    
    if (facebookResult?.text) {
      const segments: string[] = [facebookResult.text];
      
      if (facebookResult.author) {
        segments.push(`Author: ${facebookResult.author}`);
      }
      
      const combined = segments.join("\n");
      const { text, truncated } = truncateContent(combined);
      const words = text.split(/\s+/).filter(Boolean);
      
      if (words.length > 0) {
        // Assess quality
        const quality = assessExtractionQuality(
          text,
          words.length,
          "facebook",
          Boolean(facebookResult.author),
          Boolean(facebookResult.imageUrl),
          truncated
        );
        
        return {
          text,
          truncated,
          wordCount: words.length,
          imageUrl: facebookResult.imageUrl,
          warnings: undefined,
          quality
        };
      }
    }
    // Fallback to generic extraction if Facebook specific fails
  }

  // Fall back to generic extraction for non-social media or if platform-specific extraction failed
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(attachment.url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache"
      }
    });

    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type");
    if (!isHtmlContent(contentType) && !isPlainText(contentType)) {
      return { error: `Unsupported content-type: ${contentType ?? "unknown"}` };
    }

    const raw = await response.text();

    const warnings: string[] = [];
    const segments: string[] = [];
    let imageUrl: string | undefined;

    if (isHtmlContent(contentType)) {
      const { document } = parseHTML(raw);

      const ogDescription = sanitize(
        document.querySelector('meta[property="og:description"]')?.getAttribute("content")
      );
      const metaDescription = sanitize(document.querySelector('meta[name="description"]')?.getAttribute("content"));
      const ogTitle = sanitize(document.querySelector('meta[property="og:title"]')?.getAttribute("content"));
      imageUrl = sanitize(document.querySelector('meta[property="og:image"]')?.getAttribute("content")) ?? undefined;

      const firstImageAlt = sanitize(document.querySelector("img[alt]")?.getAttribute("alt"));

      if (ogTitle) {
        segments.push(ogTitle);
      }
      if (ogDescription) {
        segments.push(ogDescription);
      }
      if (metaDescription && metaDescription !== ogDescription) {
        segments.push(metaDescription);
      }
      if (firstImageAlt) {
        segments.push(`Image alt text: ${firstImageAlt}`);
      }

      const jsonLd = parseJsonLd(document);
      if (jsonLd.caption) {
        segments.push(jsonLd.caption);
      }
      if (jsonLd.description && jsonLd.description !== jsonLd.caption) {
        segments.push(jsonLd.description);
      }
      if (jsonLd.authorName) {
        segments.push(`Author: ${jsonLd.authorName}`);
      }
      if (jsonLd.comments && jsonLd.comments.length > 0) {
        const topComments = jsonLd.comments.slice(0, 2).join(" | ");
        segments.push(`Top comments: ${topComments}`);
      }

      const hashtagSet = new Set<string>();
      segments.forEach((segment) => collectHashtags(segment).forEach((tag) => hashtagSet.add(tag)));
      if (jsonLd.keywords) {
        jsonLd.keywords.forEach((tag) => hashtagSet.add(tag.startsWith("#") ? tag : `#${tag}`));
      }

      if (hashtagSet.size > 0) {
        segments.push(`Hashtags: ${Array.from(hashtagSet).join(", ")}`);
      }

      const { captionFromScripts, commentsFromScripts, hashtagsFromScripts } = extractSharedData(raw);
      if (captionFromScripts) {
        segments.push(captionFromScripts);
      }
      if (commentsFromScripts.length > 0) {
        segments.push(`Comments snapshot: ${commentsFromScripts.slice(0, 2).join(" | ")}`);
      }
      hashtagsFromScripts.forEach((tag) => hashtagSet.add(tag));

      const visibleText = sanitize(
        raw
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
          .replace(/<\/?[a-zA-Z0-9]+[^>]*>/g, " ")
      );
      if (visibleText && !isLowInformation(visibleText)) {
        segments.push(visibleText);
      }
    } else {
      const sanitized = sanitize(raw);
      if (sanitized) {
        segments.push(sanitized);
      }
    }

    const combined = sanitize(
      Array.from(new Set(segments.filter((segment) => typeof segment === "string" && segment.trim().length > 0))).join(
        "\n"
      )
    );

    if (!combined || isLowInformation(combined)) {
      warnings.push("Extracted content may be low-information.");
      if (!combined) {
        // Provide more specific error message for Instagram links
        if (platformInfo.platform === "instagram") {
          return { error: "Unable to extract content from Instagram link. The post may be private, require authentication, or Instagram may be blocking access. Please try uploading a screenshot of the post instead." };
        }
        return { error: "No meaningful text extracted from attachment. Please try uploading a screenshot instead." };
      }
    }

    const { text, truncated } = truncateContent(combined ?? "");
    const words = text.split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      // Provide more specific error message for Instagram links
      if (platformInfo.platform === "instagram") {
        return { error: "Unable to extract readable content from Instagram link. The post may be private, require authentication, or contain only media without captions. Please try uploading a screenshot of the post instead." };
      }
      return { error: "No meaningful text extracted from attachment. Please try uploading a screenshot instead." };
    }

    // Assess quality for generic extraction (only if it's a social media platform)
    let quality;
    if (platformInfo.platform !== "unknown") {
      quality = assessExtractionQuality(
        text,
        words.length,
        platformInfo.platform,
        segments.some((s) => s.includes("Author:")),
        Boolean(imageUrl),
        truncated
      );
    }

    return {
      text,
      truncated,
      wordCount: words.length,
      imageUrl,
      warnings: warnings.length > 0 ? warnings : undefined,
      quality
    };
  } catch (error) {
    if ((error as Error | undefined)?.name === "AbortError") {
      return { error: "Fetch timed out." };
    }
    return { error: (error as Error | undefined)?.message ?? "Unknown fetch error." };
  } finally {
    clearTimeout(timeout);
  }
}

