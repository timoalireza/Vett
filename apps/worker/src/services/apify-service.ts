import { ApifyClient } from 'apify-client';
import { env } from '../env.js';

// Initialize the client
// Use a lazy initialization or check if token exists to avoid errors if not configured
let client: ApifyClient | null = null;

type CacheEntry<T> = { expiresAt: number; promise: Promise<T> };
const instagramScrapeCache = new Map<string, CacheEntry<ApifyInstagramResult | null>>();
const INSTAGRAM_SCRAPE_CACHE_TTL_MS = Number(process.env.INSTAGRAM_SCRAPE_CACHE_TTL_MS ?? 10 * 60_000); // 10 min
const INSTAGRAM_SCRAPE_FAILURE_TTL_MS = Number(process.env.INSTAGRAM_SCRAPE_FAILURE_TTL_MS ?? 30_000); // 30s

function canonicalizeUrlForCache(raw: string): string {
  const input = (raw ?? "").trim();
  if (!input) return input;
  try {
    const u = new URL(input);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    if (u.hostname.startsWith("www.")) u.hostname = u.hostname.slice(4);
    
    // Drop common tracking params to maximize cache hits (same post with different utm_* should use cache)
    const dropKeys = new Set([
      "fbclid",
      "gclid",
      "mc_cid",
      "mc_eid",
      "ref",
      "ref_src",
      "igsh",
      "igshid",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content"
    ]);
    for (const key of Array.from(u.searchParams.keys())) {
      const k = key.toLowerCase();
      if (k.startsWith("utm_") || dropKeys.has(k)) {
        u.searchParams.delete(key);
      }
    }
    
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
    return u.toString();
  } catch {
    return input;
  }
}

function getClient(): ApifyClient | null {
  if (client) return client;
  
  // Check for both APIFY_API_TOKEN and APIFY_API_KEY (common naming variations)
  const apiToken = env.APIFY_API_TOKEN || (process.env.APIFY_API_KEY as string | undefined);
  
  if (apiToken) {
    // Log only non-sensitive metadata - never log token preview or actual characters
    console.log(`[Apify] Initializing Apify client (token length: ${apiToken.length} characters)`);
    client = new ApifyClient({
      token: apiToken,
    });
    return client;
  }
  
  console.warn(`[Apify] No API token found. Checked APIFY_API_TOKEN=${!!env.APIFY_API_TOKEN}, APIFY_API_KEY=${!!process.env.APIFY_API_KEY}`);
  return null;
}

export interface ApifyInstagramResult {
  inputUrl?: string;
  id?: string;
  type?: string;
  shortCode?: string;
  caption?: string;
  hashtags?: string[];
  mentions?: string[];
  url?: string;
  commentsCount?: number;
  firstComment?: string;
  latestComments?: any[];
  dimensionsHeight?: number;
  dimensionsWidth?: number;
  displayUrl?: string;
  images?: string[];
  videoUrl?: string;
  alt?: string;
  likesCount?: number;
  videoViewCount?: number;
  timestamp?: string;
  childPosts?: any[];
  ownerFullName?: string;
  ownerUsername?: string;
  ownerId?: string;
  productType?: string;
  isSponsored?: boolean;
}

export interface ApifyTwitterResult {
  url?: string;
  twitterUrl?: string;
  id?: string;
  text?: string;
  fullText?: string;
  retweetCount?: number;
  replyCount?: number;
  likeCount?: number;
  quoteCount?: number;
  viewCount?: number;
  createdAt?: string;
  lang?: string;
  bookmarkCount?: number;
  isQuote?: boolean;
  isRetweet?: boolean;
  user?: {
    id?: string;
    name?: string;
    screen_name?: string;
    profile_image_url_https?: string;
    description?: string;
    followers_count?: number;
    friends_count?: number;
    verified?: boolean;
  };
  media?: any[];
}

export interface ApifyFacebookResult {
  postId?: string;
  url?: string;
  pageName?: string;
  user?: {
    name?: string;
    id?: string;
    profilePic?: string;
  };
  message?: string;
  text?: string;
  date?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  media?: any[];
}

export async function scrapeInstagramPost(url: string): Promise<ApifyInstagramResult | null> {
  const apify = getClient();
  if (!apify) {
    console.warn("[Apify] No API token configured, skipping Apify extraction");
    return null;
  }

  const cacheKey = canonicalizeUrlForCache(url);
  const cached = instagramScrapeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return await cached.promise;
  }

  // Input for apify/instagram-post-scraper (more specialized for single posts)
  // This actor is often more reliable for single URLs than the general scraper
  // Input format: { "username": [], "startUrls": ["..."], "resultsType": "posts" }
  
  // We will try apify/instagram-post-scraper which is designed for this
  // Input format: { "startUrls": ["..."], "resultsType": "posts" }
  // Note: input is prepared but not used in current implementation

  const promise = (async () => {
    console.log(`[Apify] Scraping Instagram post: ${url}`);
    
    // Use the input format that works for 'apify/instagram-scraper'
    const inputScraper = {
      directUrls: [url],
      resultsType: "posts",
      searchLimit: 1,
    };

    console.log(`[Apify] Calling apify/instagram-scraper with input:`, JSON.stringify(inputScraper));
    
    // Start the actor run
    const run = await apify.actor("apify/instagram-scraper").call(inputScraper);
    
    console.log(`[Apify] Run finished - status: ${run.status}, datasetId: ${run.defaultDatasetId}, runId: ${run.id}`);

    // Check run status
    if (run.status !== "SUCCEEDED") {
      console.warn(`[Apify] Run did not succeed. Status: ${run.status}, defaultDatasetId: ${run.defaultDatasetId}`);
      return null;
    }

    // Fetch results from the dataset
    const { items } = await apify.dataset(run.defaultDatasetId).listItems();
    
    console.log(`[Apify] Retrieved ${items?.length || 0} items from dataset ${run.defaultDatasetId}`);
    
    if (items && items.length > 0) {
      console.log(`[Apify] Successfully extracted Instagram post - first item keys: ${Object.keys(items[0]).join(", ")}`);
      return items[0] as ApifyInstagramResult;
    }
    
    console.warn(`[Apify] No items found in dataset ${run.defaultDatasetId} for URL: ${url}`);
    return null;
  })().catch((error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : typeof error;
    
    console.error(`[Apify] Instagram scrape failed for ${url}:`, {
      name: errorName,
      message: errorMessage,
      stack: errorStack,
      // Log error details if available
      ...(error instanceof Error && 'code' in error ? { code: (error as any).code } : {}),
      ...(error instanceof Error && 'statusCode' in error ? { statusCode: (error as any).statusCode } : {})
    });
    return null;
  });

  instagramScrapeCache.set(cacheKey, {
    expiresAt: Date.now() + INSTAGRAM_SCRAPE_CACHE_TTL_MS,
    promise
  });

  const result = await promise;
  if (!result) {
    // Keep negative caching short so transient failures don't get stuck.
    instagramScrapeCache.set(cacheKey, {
      expiresAt: Date.now() + INSTAGRAM_SCRAPE_FAILURE_TTL_MS,
      promise: Promise.resolve(null)
    });
  }

  return result;
}

export async function scrapeTwitterPost(url: string): Promise<ApifyTwitterResult | null> {
  const apify = getClient();
  if (!apify) {
    console.warn("[Apify] No API token configured, skipping Apify extraction");
    return null;
  }

  // Input for apify/twitter-scraper
  const input = {
    startUrls: [{ url }],
    tweetsDesired: 1,
  };

  try {
    console.log(`[Apify] Scraping Twitter post: ${url}`);
    const run = await apify.actor("apify/twitter-scraper").call(input);
    const { items } = await apify.dataset(run.defaultDatasetId).listItems();
    
    if (items && items.length > 0) {
      return items[0] as ApifyTwitterResult;
    }
    return null;
  } catch (error) {
    console.error("[Apify] Twitter scrape failed:", error);
    return null;
  }
}

export async function scrapeFacebookPost(url: string): Promise<ApifyFacebookResult | null> {
  const apify = getClient();
  if (!apify) {
    console.warn("[Apify] No API token configured, skipping Apify extraction");
    return null;
  }

  // Input for apify/facebook-posts-scraper
  const input = {
    startUrls: [{ url }],
    resultsLimit: 1,
  };

  try {
    console.log(`[Apify] Scraping Facebook post: ${url}`);
    const run = await apify.actor("apify/facebook-posts-scraper").call(input);
    const { items } = await apify.dataset(run.defaultDatasetId).listItems();
    
    if (items && items.length > 0) {
      return items[0] as ApifyFacebookResult;
    }
    return null;
  } catch (error) {
    console.error("[Apify] Facebook scrape failed:", error);
    return null;
  }
}

