import { ApifyClient } from 'apify-client';
import { env } from '../env.js';

// Initialize the client
// Use a lazy initialization or check if token exists to avoid errors if not configured
let client: ApifyClient | null = null;

function getClient(): ApifyClient | null {
  if (client) return client;
  
  if (env.APIFY_API_TOKEN) {
    client = new ApifyClient({
      token: env.APIFY_API_TOKEN,
    });
    return client;
  }
  
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

  // Input for apify/instagram-post-scraper (instagram-scraper is deprecated/more complex for single posts)
  // Using 'apify/instagram-scraper' might be needed for better results but 'apify/instagram-post-scraper' is cheaper/faster for single URLs
  // Let's try 'apify/instagram-scraper' as it's often more reliable or 'apify/instagram-post-scraper'
  // The user guide suggested 'apify/instagram-post-scraper' or 'apify/instagram-scraper'.
  // 'apify/instagram-scraper' input format: { "directUrls": ["..."], "resultsType": "posts", "searchLimit": 1 }
  
  const input = {
    directUrls: [url],
    resultsType: "posts",
    searchLimit: 1,
  };

  try {
    console.log(`[Apify] Scraping Instagram post: ${url}`);
    // Using "apify/instagram-scraper" as it's the most popular and maintained one
    const run = await apify.actor("apify/instagram-scraper").call(input);

    // Fetch results from the dataset
    const { items } = await apify.dataset(run.defaultDatasetId).listItems();
    
    if (items && items.length > 0) {
      return items[0] as ApifyInstagramResult;
    }
    return null;
  } catch (error) {
    console.error("[Apify] Instagram scrape failed:", error);
    return null;
  }
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

