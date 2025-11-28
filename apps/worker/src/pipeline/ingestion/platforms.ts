/**
 * Platform detection and identification utilities for social media links
 */

export type SocialPlatform = "twitter" | "x" | "instagram" | "threads" | "facebook" | "tiktok" | "youtube" | "unknown";

export interface PlatformInfo {
  platform: SocialPlatform;
  isReel?: boolean;
  isPost?: boolean;
  postId?: string;
  username?: string;
}

/**
 * Detects the social media platform from a URL
 */
export function detectPlatform(url: string): PlatformInfo {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();

    // X (Twitter) - handles both twitter.com and x.com
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
      const match = pathname.match(/\/(?:status|statuses)\/(\d+)/);
      return {
        platform: hostname.includes("x.com") ? "x" : "twitter",
        isPost: true,
        postId: match?.[1],
        username: pathname.split("/")[1] || undefined
      };
    }

    // Instagram - handles posts and reels
    if (hostname.includes("instagram.com")) {
      const reelMatch = pathname.match(/\/reel\/([^\/]+)/);
      const postMatch = pathname.match(/\/p\/([^\/]+)/);
      const usernameMatch = pathname.match(/\/([^\/]+)\//);

      if (reelMatch) {
        return {
          platform: "instagram",
          isReel: true,
          isPost: true,
          postId: reelMatch[1],
          username: usernameMatch?.[1]
        };
      }

      if (postMatch) {
        return {
          platform: "instagram",
          isPost: true,
          postId: postMatch[1],
          username: usernameMatch?.[1]
        };
      }

      return {
        platform: "instagram",
        username: usernameMatch?.[1]
      };
    }

    // Threads (Meta)
    if (hostname.includes("threads.net")) {
      const match = pathname.match(/\/(?:@)?([^\/]+)\/post\/([^\/]+)/);
      return {
        platform: "threads",
        isPost: true,
        postId: match?.[2],
        username: match?.[1]
      };
    }

    // Facebook
    if (hostname.includes("facebook.com") || hostname.includes("fb.com") || hostname.includes("fb.watch")) {
      // Facebook URLs can be complex (e.g. /watch, /posts, /permalink.php, /groups)
      // We'll just identify it as Facebook for now and let Apify handle parsing
      const isPost = pathname.includes("/posts/") || pathname.includes("/permalink.php") || pathname.includes("/watch") || urlObj.searchParams.has("story_fbid");
      
      return {
        platform: "facebook",
        isPost: isPost
      };
    }

    // TikTok
    if (hostname.includes("tiktok.com") || hostname.includes("vm.tiktok.com")) {
      // Try to extract video ID from pathname first (e.g., /@username/video/1234567890)
      const pathMatch = pathname.match(/\/video\/(\d+)/);
      // Fallback to query parameter (e.g., ?video_id=1234567890)
      const queryVideoId = urlObj.searchParams.get("video_id");
      
      const videoId = pathMatch?.[1] || queryVideoId || undefined;
      
      return {
        platform: "tiktok",
        isPost: true,
        postId: videoId,
        username: pathname.split("/")[1] || undefined
      };
    }

    // YouTube Shorts
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      const shortsMatch = pathname.includes("/shorts/");
      const videoId = pathname.match(/\/shorts\/([^\/\?]+)/)?.[1] || 
                     urlObj.searchParams.get("v") ||
                     pathname.match(/\/([a-zA-Z0-9_-]{11})/)?.[1];
      
      if (shortsMatch || (videoId && videoId.length === 11)) {
        return {
          platform: "youtube",
          isPost: true,
          postId: videoId,
          isReel: shortsMatch // Treat shorts as reels for consistency
        };
      }
    }

    return { platform: "unknown" };
  } catch {
    return { platform: "unknown" };
  }
}

/**
 * Checks if a URL is from a social media platform we support
 */
export function isSocialMediaUrl(url: string): boolean {
  const info = detectPlatform(url);
  return info.platform !== "unknown";
}

