import { eq, and, gte } from "drizzle-orm";
import { db } from "../db/client.js";
import { instagramDmUsage, instagramUsers } from "../db/schema.js";
import { env } from "../env.js";
import { socialLinkingService } from "./social-linking-service.js";
import { analysisService } from "./analysis-service.js";
import type { AnalysisSummary } from "./analysis-service.js";
import { serviceLogger } from "../utils/service-logger.js";
import { fetchMediaFromAttachment } from "./instagram/media-fetcher.js";
import { extractVisionData } from "./instagram/vision-extractor.js";
import { extractClaims } from "./instagram/claim-extractor.js";

const INSTAGRAM_API_BASE = "https://graph.facebook.com/v18.0";
const FREE_TIER_DM_LIMIT = 3; // 3 analyses per month for FREE tier

interface InstagramMessage {
  id: string;
  from: {
    id: string;
    username?: string;
  };
  text?: string;
  attachments?: Array<{
    type: string;
    payload?: {
      url?: string;
      [key: string]: unknown; // Allow other payload fields
    };
    [key: string]: unknown; // Allow other attachment fields
  }>;
}

interface ExtractedContent {
  text?: string;
  links: string[];
  images: string[];
}

class InstagramService {
  /**
   * Send DM to Instagram user via Meta Graph API
   */
  async sendDM(instagramUserId: string, message: string): Promise<{ success: boolean; error?: string }> {
    // Check if credentials are set and not empty, then trim them for use
    // Accept either INSTAGRAM_PAGE_ID (Facebook Page ID) or INSTAGRAM_BUSINESS_ACCOUNT_ID (Instagram Business Account ID)
    const accessToken = env.INSTAGRAM_PAGE_ACCESS_TOKEN?.trim();
    const pageId = env.INSTAGRAM_PAGE_ID?.trim();
    const businessAccountId = env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim();
    
    // Determine token type and appropriate account ID
    const tokenPrefix = accessToken ? accessToken.substring(0, 4).toUpperCase() : "";
    const isInstagramToken = tokenPrefix.startsWith("IGA") || tokenPrefix.startsWith("IG");
    const isPageToken = tokenPrefix.startsWith("EAA");
    
    // For Instagram tokens (IGA), we MUST use Instagram Business Account ID
    // For Page tokens (EAA), we can use either Page ID or Business Account ID
    let accountId: string;
    if (isInstagramToken) {
      if (!businessAccountId) {
        serviceLogger.error({ 
          instagramUserId,
          tokenPrefix,
          note: "Instagram tokens (IGA prefix) require INSTAGRAM_BUSINESS_ACCOUNT_ID, not INSTAGRAM_PAGE_ID"
        }, "[Instagram] Instagram token requires Instagram Business Account ID");
        return { 
          success: false, 
          error: "Instagram access token (IGA) requires INSTAGRAM_BUSINESS_ACCOUNT_ID to be set. Please set INSTAGRAM_BUSINESS_ACCOUNT_ID environment variable with your Instagram Business Account ID." 
        };
      }
      accountId = businessAccountId;
    } else {
      // For Page tokens, prefer Business Account ID if available, otherwise use Page ID
      accountId = businessAccountId || pageId;
    }
    
    const hasAccessToken = accessToken && accessToken.length > 0;
    const hasAccountId = accountId && accountId.length > 0;
    
    if (!hasAccessToken || !hasAccountId) {
      serviceLogger.error({ 
        instagramUserId,
        hasAccessToken,
        hasPageId: !!pageId,
        hasBusinessAccountId: !!businessAccountId,
        tokenPrefix,
        isInstagramToken,
        accessTokenLength: env.INSTAGRAM_PAGE_ACCESS_TOKEN?.length || 0,
        pageIdLength: env.INSTAGRAM_PAGE_ID?.length || 0,
        businessAccountIdLength: env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.length || 0,
        accessTokenPreview: env.INSTAGRAM_PAGE_ACCESS_TOKEN ? `${env.INSTAGRAM_PAGE_ACCESS_TOKEN.substring(0, 10)}...` : "undefined",
        accountIdPreview: accountId ? `${accountId.substring(0, 10)}...` : "undefined"
      }, "[Instagram] Missing Instagram API credentials");
      return { success: false, error: "Instagram API not configured" };
    }

    try {
      // Use trimmed values to avoid API failures from whitespace
      // Instagram Graph API accepts access_token as query parameter or in body
      // Using query parameter is more standard and reliable
      // For Instagram tokens, use Instagram Business Account ID endpoint
      // For Page tokens, can use either Page ID or Business Account ID endpoint
      const url = `${INSTAGRAM_API_BASE}/${accountId}/messages?access_token=${encodeURIComponent(accessToken)}`;
      
      serviceLogger.debug({ 
        instagramUserId,
        accountId,
        accountIdType: isInstagramToken ? "Instagram Business Account ID (required for IGA token)" : (businessAccountId ? "Instagram Business Account ID" : "Page ID"),
        tokenType: isInstagramToken ? "Instagram Token (IGA)" : (isPageToken ? "Page Token (EAA)" : "Unknown"),
        url: url.replace(accessToken, "[REDACTED]"),
        messageLength: message.length,
        accessTokenLength: accessToken.length,
        accessTokenPreview: `${accessToken.substring(0, 10)}...`,
        tokenPrefix
      }, "[Instagram] Sending DM via Graph API");
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recipient: { id: instagramUserId },
          message: { text: message },
          messaging_type: "RESPONSE"
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorCode = errorData.error?.code;
        const errorMessage = errorData.error?.message || "Failed to send DM";
        const errorSubcode = errorData.error?.error_subcode;
        const errorType = errorData.error?.type;
        
        // Log detailed error information
        serviceLogger.error({ 
          instagramUserId,
          accountId,
          accountIdType: businessAccountId ? "Instagram Business Account ID" : "Page ID",
          errorData,
          errorCode,
          errorSubcode,
          errorType,
          errorMessage,
          httpStatus: response.status,
          url: url.replace(accessToken, "[REDACTED]"), // Don't log full token
          responseHeaders: Object.fromEntries(response.headers.entries())
        }, "[Instagram] Failed to send DM");
        
        // Provide helpful error messages for common issues
        if (errorCode === 190) {
          const isInstagramToken = tokenPrefix.startsWith("IGA") || tokenPrefix.startsWith("IG");
          const troubleshootingTips = isInstagramToken ? [
            "1. Verify Instagram token has 'instagram_basic' and 'pages_messaging' permissions",
            "2. Ensure INSTAGRAM_BUSINESS_ACCOUNT_ID is set (required for Instagram tokens)",
            "3. Check token hasn't expired - use Meta Access Token Debugger: https://developers.facebook.com/tools/debug/accesstoken/",
            "4. Verify Instagram Business Account is linked to a Facebook Page",
            "5. Ensure your app has Instagram Graph API product added",
            "6. Check token has access to the Instagram Business Account",
            `7. Token preview: ${accessToken.substring(0, 10)}... (length: ${accessToken.length}, type: Instagram)`
          ] : [
            "1. Verify token is a Facebook Page Access Token (starts with EAAB or EAA)",
            "2. Check token hasn't expired - use Meta Access Token Debugger: https://developers.facebook.com/tools/debug/accesstoken/",
            "3. Ensure token has 'pages_messaging' permission",
            "4. Verify Instagram Business Account is linked to the Facebook Page",
            "5. Check for extra whitespace or characters in the token",
            `6. Token preview: ${accessToken.substring(0, 10)}... (length: ${accessToken.length}, type: Page)`
          ];
          
          serviceLogger.error({ 
            instagramUserId,
            accountId,
            accountIdType: isInstagramToken ? "Instagram Business Account ID" : "Page ID",
            tokenPrefix: accessToken.substring(0, 4),
            tokenType: isInstagramToken ? "Instagram Token (IGA)" : "Page Token (EAA)",
            tokenLength: accessToken.length,
            errorMessage,
            troubleshootingTips
          }, "[Instagram] OAuth token error - see troubleshooting tips below");
          
          return { 
            success: false, 
            error: `Invalid OAuth access token (Error 190). ${errorMessage}\n\nTroubleshooting:\n${troubleshootingTips.join("\n")}`
          };
        }
        
        return { success: false, error: errorMessage };
      }

      return { success: true };
    } catch (error: any) {
      serviceLogger.error({ instagramUserId, error }, "[Instagram] Error sending DM");
      return { success: false, error: error.message || "Failed to send DM" };
    }
  }

  /**
   * Extract Instagram post URL from shared post attachment using Graph API
   * When a user shares a post, we get a CDN URL, but we need the actual post URL for content extraction
   */
  private async extractPostUrlFromAttachment(attachment: InstagramMessage["attachments"][0]): Promise<string | null> {
    try {
      // Check if attachment has target field (contains post URL)
      if (attachment.payload?.target) {
        const target = attachment.payload.target as string;
        if (target.includes("instagram.com")) {
          serviceLogger.debug({ target }, "[Instagram] Found post URL in attachment.target");
          return target;
        }
      }

      // Check if attachment has media field with permalink
      if (attachment.payload?.media) {
        const media = attachment.payload.media as { permalink?: string; id?: string };
        if (media.permalink) {
          serviceLogger.debug({ permalink: media.permalink }, "[Instagram] Found post URL in attachment.media.permalink");
          return media.permalink;
        }
        // If we have media ID, construct URL
        if (media.id) {
          // Try to get permalink from Graph API
          const permalink = await this.getPostPermalinkFromMediaId(media.id);
          if (permalink) {
            return permalink;
          }
        }
      }

      // Check if attachment has share field with href
      if (attachment.payload?.share) {
        const share = attachment.payload.share as { href?: string };
        if (share.href && share.href.includes("instagram.com")) {
          serviceLogger.debug({ href: share.href }, "[Instagram] Found post URL in attachment.share.href");
          return share.href;
        }
      }

      // Check attachment ID field - might be a media ID we can use
      if ((attachment as any).id) {
        const mediaId = (attachment as any).id;
        const permalink = await this.getPostPermalinkFromMediaId(mediaId);
        if (permalink) {
          return permalink;
        }
      }

      serviceLogger.debug({ attachment }, "[Instagram] No post URL found in attachment payload");
      return null;
    } catch (error) {
      serviceLogger.error({ error, attachment }, "[Instagram] Error extracting post URL from attachment");
      return null;
    }
  }

  /**
   * Get Instagram post permalink from media ID using Graph API
   */
  private async getPostPermalinkFromMediaId(mediaId: string): Promise<string | null> {
    const accessToken = env.INSTAGRAM_PAGE_ACCESS_TOKEN?.trim();
    if (!accessToken || accessToken.length === 0) {
      serviceLogger.warn("[Instagram] INSTAGRAM_PAGE_ACCESS_TOKEN not configured, cannot fetch post permalink");
      return null;
    }

    try {
      // Use Graph API to get media information
      // Use trimmed access token to avoid API failures from whitespace
      // Send access_token as query parameter (standard for Graph API)
      const response = await fetch(
        `${INSTAGRAM_API_BASE}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        serviceLogger.warn({ mediaId, status: response.status }, "[Instagram] Failed to fetch post permalink from Graph API");
        return null;
      }

      const data = await response.json() as { permalink?: string };
      if (data.permalink) {
        serviceLogger.debug({ mediaId, permalink: data.permalink }, "[Instagram] Retrieved post permalink from Graph API");
        return data.permalink;
      }

      return null;
    } catch (error) {
      serviceLogger.error({ error, mediaId }, "[Instagram] Error fetching post permalink from Graph API");
      return null;
    }
  }

  /**
   * Check if a URL is an Instagram CDN URL
   */
  private isInstagramCdnUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();
      
      // Check for Instagram CDN URL formats (matching detectPlatform logic):
      // 1. lookaside.fbsbx.com/ig_messaging_cdn/...
      // 2. ig_messaging_cdn.fbsbx.com/...
      // 3. *.fbsbx.com/ig_messaging_cdn/...
      // Use .endsWith() for domain matching to avoid false positives (e.g., xfbsbx.com matching fbsbx.com)
      const isLookasideFbsbx = hostname === "lookaside.fbsbx.com" || hostname.endsWith(".lookaside.fbsbx.com");
      const isIgMessagingCdn = hostname === "ig_messaging_cdn.fbsbx.com" || hostname.endsWith(".ig_messaging_cdn.fbsbx.com");
      const isFbsbxDomain = hostname === "fbsbx.com" || hostname.endsWith(".fbsbx.com");
      
      return isLookasideFbsbx ||
             isIgMessagingCdn ||
             (isFbsbxDomain && pathname.includes("ig_messaging_cdn"));
    } catch {
      // If URL parsing fails, check string directly using domain boundaries
      // Use regex with word boundaries to avoid false positives (e.g., xfbsbx.com matching fbsbx.com)
      const lookasidePattern = /[./]lookaside\.fbsbx\.com[/?]|^lookaside\.fbsbx\.com[/?]/i;
      const igMessagingPattern = /[./]ig_messaging_cdn\.fbsbx\.com[/?]|^ig_messaging_cdn\.fbsbx\.com[/?]/i;
      const fbsbxPattern = /[./]fbsbx\.com[/?]|^fbsbx\.com[/?]/i;
      
      return lookasidePattern.test(url) ||
             igMessagingPattern.test(url) ||
             (fbsbxPattern.test(url) && url.includes("ig_messaging_cdn"));
    }
  }

  /**
   * Extract content from Instagram message (links, images, text)
   */
  async extractContentFromMessage(message: InstagramMessage): Promise<ExtractedContent> {
    const content: ExtractedContent = {
      links: [],
      images: []
    };

    serviceLogger.debug({
      hasText: !!message.text,
      textLength: message.text?.length || 0,
      hasAttachments: !!message.attachments,
      attachmentsCount: message.attachments?.length || 0,
      attachmentTypes: message.attachments?.map(a => a.type) || []
    }, "[Instagram] Extracting content from message");

    // Extract text
    if (message.text) {
      content.text = message.text;

      // Extract URLs from text
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = message.text.match(urlRegex);
      if (urls) {
        // Classify URLs: Instagram CDN URLs go to images, others go to links
        for (const url of urls) {
          if (this.isInstagramCdnUrl(url)) {
            content.images.push(url);
            serviceLogger.debug({ url }, "[Instagram] Found Instagram CDN URL in text, added as image");
          } else {
            content.links.push(url);
            serviceLogger.debug({ url }, "[Instagram] Found URL in text, added as link");
          }
        }
        serviceLogger.debug({ 
          totalUrls: urls.length, 
          links: content.links.length, 
          images: content.images.length 
        }, "[Instagram] Classified URLs from text");
      }
    }

    // Extract attachments (images, videos, shared posts, etc.)
    if (message.attachments) {
      for (const attachment of message.attachments) {
        serviceLogger.debug({
          type: attachment.type,
          hasPayload: !!attachment.payload,
          payloadKeys: attachment.payload ? Object.keys(attachment.payload) : []
        }, "[Instagram] Processing attachment");

        if (attachment.type === "image" && attachment.payload?.url) {
          // Images should always be treated as images, not links
          content.images.push(attachment.payload.url);
          serviceLogger.debug({ url: attachment.payload.url }, "[Instagram] Added image URL");
        } else if (attachment.type === "share" && attachment.payload?.url) {
          const shareUrl = attachment.payload.url;
          
          // Check if this is an Instagram CDN URL (shared post attachment)
          if (this.isInstagramCdnUrl(shareUrl)) {
            // Try to extract the actual Instagram post URL from the attachment
            // This allows us to process the post content via Apify instead of just the CDN image
            const postUrl = await this.extractPostUrlFromAttachment(attachment);
            
            if (postUrl) {
              // Use the extracted post URL as a link for content extraction
              content.links.push(postUrl);
              serviceLogger.debug({ 
                cdnUrl: shareUrl, 
                postUrl 
              }, "[Instagram] Extracted post URL from shared attachment, added as link");
            } else {
              // Fallback: treat CDN URL as image if we can't extract post URL
              content.images.push(shareUrl);
              serviceLogger.debug({ url: shareUrl }, "[Instagram] Could not extract post URL, treating CDN URL as image");
            }
          } else {
            // Regular shared links/posts (not CDN URLs)
            content.links.push(shareUrl);
            serviceLogger.debug({ url: shareUrl }, "[Instagram] Added shared link URL");
          }
        } else if (attachment.type === "video" && attachment.payload?.url) {
          // Check if video URL is an Instagram CDN URL
          const videoUrl = attachment.payload.url;
          if (this.isInstagramCdnUrl(videoUrl)) {
            // Instagram CDN URLs are media files, treat as images (videos can be analyzed as images)
            content.images.push(videoUrl);
            serviceLogger.debug({ url: videoUrl }, "[Instagram] Added video from CDN URL as image");
          } else {
            // Regular video links
            content.links.push(videoUrl);
            serviceLogger.debug({ url: videoUrl }, "[Instagram] Added video URL");
          }
        } else if (attachment.type === "fallback" && attachment.payload?.url) {
          // Check if fallback URL is an Instagram CDN URL
          const fallbackUrl = attachment.payload.url;
          if (this.isInstagramCdnUrl(fallbackUrl)) {
            // Instagram CDN URLs are media files, treat as images
            content.images.push(fallbackUrl);
            serviceLogger.debug({ url: fallbackUrl }, "[Instagram] Added fallback image from CDN URL");
          } else {
            // Regular fallback links
            content.links.push(fallbackUrl);
            serviceLogger.debug({ url: fallbackUrl }, "[Instagram] Added fallback URL");
          }
        } else {
          serviceLogger.debug({ attachment }, "[Instagram] Unhandled attachment type");
        }
      }
    }

    serviceLogger.debug({
      hasText: !!content.text,
      textLength: content.text?.length || 0,
      linksCount: content.links.length,
      imagesCount: content.images.length
    }, "[Instagram] Final extracted content");

    return content;
  }

  /**
   * Check if Instagram user has exceeded FREE tier limit
   */
  /**
   * Check if an Instagram user ID is whitelisted for unlimited access
   */
  private isWhitelisted(instagramUserId: string): boolean {
    const whitelistStr = env.INSTAGRAM_WHITELIST_ACCOUNTS?.trim();
    if (!whitelistStr || whitelistStr.length === 0) {
      return false;
    }

    // Parse comma-separated list and trim whitespace
    const whitelist = whitelistStr
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    return whitelist.includes(instagramUserId);
  }

  async checkInstagramUsageLimit(instagramUserId: string): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
  }> {
    // Check if user is whitelisted for unlimited access (for testing/admin accounts)
    if (this.isWhitelisted(instagramUserId)) {
      serviceLogger.debug({ instagramUserId }, "[Instagram] User is whitelisted - unlimited access granted");
      return { allowed: true, remaining: -1, limit: -1 }; // -1 means unlimited
    }

    // Check if user is linked to PRO plan
    const subscriptionTier = await socialLinkingService.getInstagramUserSubscription(instagramUserId);

    if (subscriptionTier === "PRO") {
      // PRO users have unlimited Instagram DM analyses
      return { allowed: true, remaining: -1, limit: -1 }; // -1 means unlimited
    }

    // FREE tier: check usage
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // End of current month

    let usage;
    try {
      usage = await db.query.instagramDmUsage.findFirst({
        where: eq(instagramDmUsage.instagramUserId, instagramUserId)
      });

      // Reset if period has changed
      if (usage && (usage.periodEnd < now || usage.periodStart > now)) {
        await db
          .update(instagramDmUsage)
          .set({
            analysesCount: 0,
            periodStart,
            periodEnd,
            lastResetAt: now,
            updatedAt: now
          })
          .where(eq(instagramDmUsage.id, usage.id));

        usage = {
          ...usage,
          analysesCount: 0,
          periodStart,
          periodEnd,
          lastResetAt: now
        };
      }

      // Create usage record if it doesn't exist
      if (!usage) {
        const [created] = await db
          .insert(instagramDmUsage)
          .values({
            instagramUserId,
            analysesCount: 0,
            periodStart,
            periodEnd
          })
          .returning();

        usage = created;
      }
    } catch (error: any) {
      // Check if error is due to missing table (42P01 = undefined_table)
      if (error.code === "42P01" || error.message?.includes("does not exist") || (error.message?.includes("relation") && error.message?.includes("does not exist"))) {
        const errorMessage = `Database migration required: Instagram tables are missing. Please run migrations:\n\n` +
          `  pnpm --filter vett-api db:migrate\n\n` +
          `Or use the SQL migration script:\n` +
          `  pnpm --filter vett-api db:migrate:sql\n\n` +
          `Missing table: instagram_dm_usage\n` +
          `Error code: ${error.code || "N/A"}`;
        serviceLogger.error({ instagramUserId, error }, errorMessage);
        throw new Error(errorMessage);
      }
      throw error;
    }

    const remaining = Math.max(0, FREE_TIER_DM_LIMIT - usage.analysesCount);
    const allowed = usage.analysesCount < FREE_TIER_DM_LIMIT;

    return { allowed, remaining, limit: FREE_TIER_DM_LIMIT };
  }

  /**
   * Increment Instagram DM usage count
   * Skips incrementing for whitelisted users (they have unlimited access)
   */
  async incrementInstagramUsage(instagramUserId: string): Promise<void> {
    // Skip incrementing for whitelisted users
    if (this.isWhitelisted(instagramUserId)) {
      serviceLogger.debug({ instagramUserId }, "[Instagram] User is whitelisted - skipping usage increment");
      return;
    }

    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      let usage = await db.query.instagramDmUsage.findFirst({
        where: eq(instagramDmUsage.instagramUserId, instagramUserId)
      });

      if (!usage) {
        await db.insert(instagramDmUsage).values({
          instagramUserId,
          analysesCount: 1,
          periodStart,
          periodEnd
        });
      } else {
        // Reset if period has changed
        if (usage.periodEnd < now || usage.periodStart > now) {
          await db
            .update(instagramDmUsage)
            .set({
              analysesCount: 1,
              periodStart,
              periodEnd,
              lastResetAt: now,
              updatedAt: now
            })
            .where(eq(instagramDmUsage.id, usage.id));
        } else {
          await db
            .update(instagramDmUsage)
            .set({
              analysesCount: usage.analysesCount + 1,
              updatedAt: now
            })
            .where(eq(instagramDmUsage.id, usage.id));
        }
      }
    } catch (error: any) {
      // Check if error is due to missing table (42P01 = undefined_table)
      if (error.code === "42P01" || error.message?.includes("does not exist") || (error.message?.includes("relation") && error.message?.includes("does not exist"))) {
        const errorMessage = `Database migration required: Instagram tables are missing. Please run migrations:\n\n` +
          `  pnpm --filter vett-api db:migrate\n\n` +
          `Or use the SQL migration script:\n` +
          `  pnpm --filter vett-api db:migrate:sql\n\n` +
          `Missing table: instagram_dm_usage\n` +
          `Error code: ${error.code || "N/A"}`;
        serviceLogger.error({ instagramUserId, error }, errorMessage);
        throw new Error(errorMessage);
      }
      throw error;
    }
  }

  /**
   * Format analysis response for DM
   */
  formatAnalysisResponse(analysis: AnalysisSummary, appBaseUrl?: string): string {
    const baseUrl = appBaseUrl || env.APP_BASE_URL;
    const score = analysis.score ?? 0;
    const verdict = analysis.verdict || "Unknown";
    const summary = analysis.summary || "Analysis completed.";

    // Determine emoji based on score
    let emoji = "🔍";
    if (score >= 80) emoji = "✅";
    else if (score >= 60) emoji = "⚠️";
    else if (score >= 40) emoji = "❌";
    else emoji = "🚫";

    // Truncate summary for DM (Instagram has character limits)
    const maxSummaryLength = 200;
    const truncatedSummary =
      summary.length > maxSummaryLength ? summary.substring(0, maxSummaryLength) + "..." : summary;

    // Generate shareable link
    const analysisUrl = `${baseUrl}/result/${analysis.id}`;

    return `${emoji} *Vett Analysis*

*Score:* ${score}/100
*Verdict:* ${verdict}

${truncatedSummary}

📱 View full analysis: ${analysisUrl}

💡 Tip: Link your Instagram account in the Vett app to unlock unlimited analyses!`;
  }

  /**
   * Format error message for DM
   */
  formatErrorMessage(error: string): string {
    return `❌ *Error*

${error}

Please try again or contact support if the issue persists.`;
  }

  /**
   * Format rate limit exceeded message
   */
  formatRateLimitMessage(remaining: number, limit: number): string {
    const appUrl = env.APP_BASE_URL;
    return `🚫 *Rate Limit Reached*

You've used ${limit} free analyses this month. ${remaining} remaining.

💎 *Upgrade to PRO* for unlimited analyses via Instagram DM!

Download the Vett app and link your Instagram account:
${appUrl}

Once linked, you'll get unlimited analyses through DMs! 🎉`;
  }

  /**
   * Format processing message
   */
  formatProcessingMessage(): string {
    return `⏳ *Processing Analysis*

I'm analyzing your content. This may take a few moments...

I'll send you the results as soon as they're ready! 📊`;
  }

  /**
   * Handle incoming DM webhook event
   */
  async handleIncomingDM(webhookEvent: any): Promise<{ success: boolean; error?: string }> {
    try {
      const message = webhookEvent.message;
      if (!message || !message.from) {
        serviceLogger.error({ webhookEvent }, "[Instagram] Invalid message format");
        return { success: false, error: "Invalid message format" };
      }

      const instagramUserId = message.from.id;
      const username = message.from.username;
      
      serviceLogger.info({
        instagramUserId,
        messageId: message.id,
        hasText: !!message.text,
        hasAttachments: !!message.attachments?.length
      }, "[Instagram] Handling DM from user");

      // Get or create Instagram user
      await socialLinkingService.getOrCreateInstagramUser(instagramUserId, username);

      // Check if message has media attachments (image or video) for multimodal processing
      const hasMediaAttachment = message.attachments?.some(
        (att: any) => 
          (att.type === "image" || att.type === "video") && 
          att.payload?.url
      );

      let extractedClaims: string[] = [];
      let visionExtractionFailed = false;

      // Process media attachments with multimodal pipeline
      if (hasMediaAttachment) {
        serviceLogger.info({ instagramUserId }, "[Instagram] Detected media attachment, using multimodal pipeline");
        
        try {
          // Find first media attachment (image or video)
          const mediaAttachment = message.attachments?.find(
            (att: any) => 
              (att.type === "image" || att.type === "video") && 
              att.payload?.url
          );

          if (mediaAttachment) {
            // Step 1: Download media
            let mediaData;
            try {
              mediaData = await fetchMediaFromAttachment(mediaAttachment);
              serviceLogger.debug({ 
                mimeType: mediaData.mimeType,
                size: mediaData.buffer.length 
              }, "[Instagram] Successfully downloaded media");
            } catch (error: any) {
              serviceLogger.error({ error }, "[Instagram] Failed to download media");
              await this.sendDM(
                instagramUserId,
                "❌ *Media Download Failed*\n\nI couldn't access the media. Please try sending it again."
              );
              return { success: false, error: "Failed to download media" };
            }

            // Step 2: Extract vision data (OCR + description)
            let visionOutput;
            try {
              // Convert Buffer to ArrayBuffer
              // Buffer extends Uint8Array, so we can access the underlying ArrayBuffer
              const arrayBuffer = mediaData.buffer.buffer 
                ? mediaData.buffer.buffer.slice(
                    mediaData.buffer.byteOffset,
                    mediaData.buffer.byteOffset + mediaData.buffer.byteLength
                  )
                : (() => {
                    // Fallback: create new ArrayBuffer and copy data
                    const ab = new ArrayBuffer(mediaData.buffer.length);
                    const view = new Uint8Array(ab);
                    mediaData.buffer.copy(view);
                    return ab;
                  })();
              
              visionOutput = await extractVisionData(
                arrayBuffer,
                mediaData.mimeType
              );
              serviceLogger.debug({ 
                rawTextLength: visionOutput.rawText.length,
                descriptionLength: visionOutput.description.length
              }, "[Instagram] Successfully extracted vision data");
            } catch (error: any) {
              serviceLogger.error({ error }, "[Instagram] Vision extraction failed, falling back to caption");
              visionExtractionFailed = true;
              // Send warning but continue with caption-only extraction
              try {
                await this.sendDM(
                  instagramUserId,
                  "⚠️ *Vision Analysis Failed*\n\nI couldn't analyze the media. Falling back to text analysis."
                );
              } catch (dmError) {
                serviceLogger.error({ dmError }, "[Instagram] Failed to send vision failure warning");
              }
              // Fall through to use caption only
            }

            // Step 3: Extract claims from vision output + caption
            if (visionOutput) {
              try {
                extractedClaims = await extractClaims(visionOutput, message.text);
                serviceLogger.info({ 
                  claimCount: extractedClaims.length,
                  claims: extractedClaims
                }, "[Instagram] Successfully extracted claims from multimodal content");
              } catch (error: any) {
                serviceLogger.error({ error }, "[Instagram] Claim extraction failed, falling back to regular content extraction");
                // Don't return early - fall through to use regular content extraction
                // This ensures the job is still enqueued even if multimodal claim extraction fails
                visionExtractionFailed = true;
                // Send warning but continue with regular extraction
                try {
                  await this.sendDM(
                    instagramUserId,
                    "⚠️ *Claim Extraction Failed*\n\nI couldn't extract claims from the media. Falling back to regular analysis."
                  );
                } catch (dmError) {
                  serviceLogger.error({ dmError }, "[Instagram] Failed to send claim extraction failure warning");
                }
                // Clear extractedClaims so we use regular content extraction
                extractedClaims = [];
              }
            }
          }
        } catch (error: any) {
          serviceLogger.error({ error }, "[Instagram] Multimodal pipeline error");
          visionExtractionFailed = true;
          // Fall through to regular text extraction
        }
      }

      // Extract content from message (for text/links or fallback)
      const content = await this.extractContentFromMessage(message);
      
      serviceLogger.info({
        instagramUserId,
        hasText: !!content.text,
        textLength: content.text?.length || 0,
        linksCount: content.links.length,
        imagesCount: content.images.length,
        extractedClaimsCount: extractedClaims.length,
        visionExtractionFailed,
        textPreview: content.text?.substring(0, 100),
        links: content.links,
        images: content.images
      }, "[Instagram] Extracted content");

      // Check if message is a verification code (6-digit number)
      if (content.text && /^\d{6}$/.test(content.text.trim())) {
        const code = content.text.trim();
        const linkResult = await socialLinkingService.linkInstagramByCode(instagramUserId, code);
        
        if (linkResult.success) {
          await this.sendDM(
            instagramUserId,
            `✅ *Account Linked Successfully!*\n\nYour Instagram account is now linked to your Vett app account. You now have unlimited analyses via DM! 🎉\n\nSend me any post, link, or image to get started!`
          );
        } else {
          await this.sendDM(
            instagramUserId,
            `❌ *Invalid Code*\n\n${linkResult.error || "The verification code is invalid or expired. Please request a new code from the Vett app."}`
          );
        }
        return { success: true };
      }

      // Check if message has any content to analyze
      // Include extracted claims from multimodal pipeline
      const hasContent = extractedClaims.length > 0 || 
                        content.text || 
                        content.links.length > 0 || 
                        content.images.length > 0;
      
      if (!hasContent) {
        serviceLogger.warn({
          instagramUserId,
          messageText: message.text,
          messageAttachments: message.attachments
        }, "[Instagram] No content found in message from user");
        const noContentDmResult = await this.sendDM(
          instagramUserId,
          "Please send a link, image, or text message to analyze. I can help you fact-check content! 🔍\n\nTo link your account, send the 6-digit verification code from the Vett app."
        );
        if (!noContentDmResult.success) {
          serviceLogger.warn({ instagramUserId, error: noContentDmResult.error }, "[Instagram] Failed to send 'no content' message");
        }
        return { success: true };
      }

      // Check usage limits
      serviceLogger.debug({ instagramUserId }, "[Instagram] Checking usage limits");
      const usageCheck = await this.checkInstagramUsageLimit(instagramUserId);
      serviceLogger.debug({ 
        instagramUserId, 
        allowed: usageCheck.allowed, 
        remaining: usageCheck.remaining, 
        limit: usageCheck.limit 
      }, "[Instagram] Usage limit check result");
      
      if (!usageCheck.allowed) {
        serviceLogger.info({ 
          instagramUserId, 
          remaining: usageCheck.remaining, 
          limit: usageCheck.limit,
          reason: "Rate limit exceeded - analysis will not be queued"
        }, "[Instagram] ⛔ Rate limit exceeded - skipping analysis queue");
        
        // Try to send rate limit message (non-blocking)
        const rateLimitDmResult = await this.sendDM(instagramUserId, this.formatRateLimitMessage(usageCheck.remaining, usageCheck.limit));
        if (!rateLimitDmResult.success) {
          serviceLogger.warn({ 
            instagramUserId, 
            error: rateLimitDmResult.error,
            note: "User will not receive rate limit notification due to DM failure"
          }, "[Instagram] Failed to send rate limit message");
        }
        
        // Return early - do not queue analysis when rate limited
        return { success: true };
      }

      // Send processing message (non-blocking - continue even if DM fails)
      serviceLogger.debug({ instagramUserId }, "[Instagram] Sending processing message");
      const processingDmResult = await this.sendDM(instagramUserId, this.formatProcessingMessage());
      if (!processingDmResult.success) {
        serviceLogger.warn({ 
          instagramUserId, 
          error: processingDmResult.error 
        }, "[Instagram] Failed to send processing message (credentials may be missing), but continuing with analysis");
      } else {
        serviceLogger.debug({ instagramUserId }, "[Instagram] Processing message sent successfully");
      }

      // Prepare analysis input
      serviceLogger.debug({ instagramUserId }, "[Instagram] Preparing analysis input");
      const analysisInput: {
        text?: string;
        attachments: Array<{ kind: "link" | "image"; url: string }>;
      } = {
        attachments: []
      };

      // If we extracted claims from multimodal pipeline, use them as text input
      if (extractedClaims.length > 0) {
        // Combine extracted claims into text for analysis
        analysisInput.text = extractedClaims.join("\n\n");
        serviceLogger.debug({ 
          claimCount: extractedClaims.length,
          combinedTextLength: analysisInput.text.length
        }, "[Instagram] Using extracted claims as text input for analysis");
      } else if (content.text && content.links.length === 0 && content.images.length === 0) {
        // Text-only message (no multimodal extraction)
        analysisInput.text = content.text;
      } else {
        // Add links
        for (const link of content.links) {
          analysisInput.attachments.push({ kind: "link", url: link });
        }

        // Add images (only if not successfully processed by multimodal pipeline)
        // Include images if multimodal processing wasn't attempted or failed
        // If multimodal succeeded (extractedClaims.length > 0), skip images since they're already processed as claims
        // If multimodal failed or wasn't attempted (extractedClaims.length === 0), include images for regular analysis
        if (extractedClaims.length === 0) {
          for (const imageUrl of content.images) {
            analysisInput.attachments.push({ kind: "image", url: imageUrl });
          }
        }

        // Add text if present (as context)
        if (content.text) {
          analysisInput.text = content.text;
        }
      }

      // Get linked app user (if any) for analysis
      serviceLogger.debug({ instagramUserId }, "[Instagram] Checking for linked app user");
      const linkedUser = await socialLinkingService.getLinkedAppUser(instagramUserId);
      const userId = linkedUser?.id || null;
      serviceLogger.debug({ instagramUserId, userId: userId || "anonymous" }, "[Instagram] Linked user check complete");

      // Submit analysis (create anonymous analysis if not linked)
      // Store instagramUserId so we can retroactively link analyses when account is linked
      serviceLogger.info({
        instagramUserId,
        hasText: !!analysisInput.text,
        textLength: analysisInput.text?.length || 0,
        attachmentsCount: analysisInput.attachments.length,
        attachments: analysisInput.attachments,
        userId: userId || "anonymous",
        extractedClaimsCount: extractedClaims.length,
        usingMultimodalClaims: extractedClaims.length > 0
      }, "[Instagram] Enqueueing analysis for Instagram user");
      
      let analysisId: string;
      try {
        serviceLogger.debug({
          instagramUserId,
          text: analysisInput.text?.substring(0, 100),
          mediaType: "text",
          attachmentsCount: analysisInput.attachments.length,
          userId: userId || undefined,
          extractedClaimsCount: extractedClaims.length
        }, "[Instagram] Calling enqueueAnalysis");
        
        analysisId = await analysisService.enqueueAnalysis(
          {
            text: analysisInput.text,
            mediaType: "text",
            attachments: analysisInput.attachments
          },
          userId || undefined,
          instagramUserId // Store Instagram user ID for retroactive linking
        );

        serviceLogger.info({ 
          instagramUserId, 
          analysisId,
          textLength: analysisInput.text?.length || 0,
          attachmentsCount: analysisInput.attachments.length
        }, "[Instagram] ✅ Analysis queued successfully - job should be picked up by worker");
      } catch (error: any) {
        serviceLogger.error({
          instagramUserId,
          error: error.message,
          stack: error.stack,
          analysisInput
        }, "[Instagram] Failed to enqueue analysis");
        await this.sendDM(
          instagramUserId,
          `❌ *Error*\n\nFailed to process your request. Please try again or contact support.\n\nError: ${error.message || "Unknown error"}`
        );
        return { success: false, error: error.message || "Failed to enqueue analysis" };
      }

      // Increment usage
      await this.incrementInstagramUsage(instagramUserId);

      // Analysis completion callback is handled by QueueEvents listener in apps/api/src/index.ts
      // Results will be sent automatically when the worker completes the analysis

      return { success: true };
    } catch (error: any) {
      serviceLogger.error({ error }, "[Instagram] Error handling incoming DM");
      return { success: false, error: error.message || "Failed to process message" };
    }
  }

  /**
   * Send analysis results when analysis completes
   */
  async sendAnalysisResults(analysisId: string, instagramUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const analysis = await analysisService.getAnalysisSummary(analysisId);
      if (!analysis) {
        return { success: false, error: "Analysis not found" };
      }

      const response = this.formatAnalysisResponse(analysis);
      return await this.sendDM(instagramUserId, response);
    } catch (error: any) {
      serviceLogger.error({ analysisId, instagramUserId, error }, "[Instagram] Error sending analysis results");
      return { success: false, error: error.message || "Failed to send results" };
    }
  }

  /**
   * Handle post mention (when someone tags @vettapp in a post)
   */
  async handlePostMention(mention: {
    mediaId: string;
    mediaUrl?: string;
    permalink?: string;
    caption?: string;
    mediaType?: string;
    from: {
      id: string;
      username?: string;
    };
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const instagramUserId = mention.from.id;
      const username = mention.from.username;

      // Get or create Instagram user
      await socialLinkingService.getOrCreateInstagramUser(instagramUserId, username);

      // Check usage limits
      const usageCheck = await this.checkInstagramUsageLimit(instagramUserId);
      if (!usageCheck.allowed) {
        // Send rate limit message via DM
        await this.sendDM(instagramUserId, this.formatRateLimitMessage(usageCheck.remaining, usageCheck.limit));
        return { success: true };
      }

      // Send processing message
      await this.sendDM(instagramUserId, this.formatProcessingMessage());

      // Prepare analysis input from post
      const analysisInput: {
        text?: string;
        attachments: Array<{ kind: "link" | "image"; url: string }>;
      } = {
        attachments: []
      };

      // Add caption as text
      if (mention.caption) {
        analysisInput.text = mention.caption;
        
        // Extract URLs from caption
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = mention.caption.match(urlRegex);
        if (urls) {
          for (const url of urls) {
            analysisInput.attachments.push({ kind: "link", url });
          }
        }
      }

      // Add media URL as image attachment
      if (mention.mediaUrl && mention.mediaType === "IMAGE") {
        analysisInput.attachments.push({ kind: "image", url: mention.mediaUrl });
      }

      // Add permalink as link
      if (mention.permalink) {
        analysisInput.attachments.push({ kind: "link", url: mention.permalink });
      }

      // Get linked app user (if any) for analysis
      const linkedUser = await socialLinkingService.getLinkedAppUser(instagramUserId);
      const userId = linkedUser?.id || null;

      // Submit analysis
      const analysisId = await analysisService.enqueueAnalysis(
        {
          text: analysisInput.text,
          mediaType: "text",
          attachments: analysisInput.attachments
        },
        userId || undefined,
        instagramUserId
      );

      // Increment usage
      await this.incrementInstagramUsage(instagramUserId);

      return { success: true };
    } catch (error: any) {
      serviceLogger.error({ error, mention }, "[Instagram] Error handling post mention");
      return { success: false, error: error.message || "Failed to process post mention" };
    }
  }

  /**
   * Handle comment (when someone comments on a post mentioning @vettapp)
   */
  async handleComment(comment: {
    commentId: string;
    text?: string;
    mediaId?: string;
    from?: {
      id: string;
      username?: string;
    };
  }): Promise<{ success: boolean; error?: string }> {
    try {
      if (!comment.from) {
        return { success: false, error: "Comment missing sender information" };
      }

      const instagramUserId = comment.from.id;
      const username = comment.from.username;

      // Get or create Instagram user
      await socialLinkingService.getOrCreateInstagramUser(instagramUserId, username);

      // Check if comment contains content to analyze
      if (!comment.text || comment.text.trim().length === 0) {
        // Empty comment, ignore
        return { success: true };
      }

      // Check usage limits
      const usageCheck = await this.checkInstagramUsageLimit(instagramUserId);
      if (!usageCheck.allowed) {
        // Send rate limit message via DM
        await this.sendDM(instagramUserId, this.formatRateLimitMessage(usageCheck.remaining, usageCheck.limit));
        return { success: true };
      }

      // Send processing message
      await this.sendDM(instagramUserId, this.formatProcessingMessage());

      // Prepare analysis input from comment
      const analysisInput: {
        text?: string;
        attachments: Array<{ kind: "link" | "image"; url: string }>;
      } = {
        attachments: []
      };

      // Add comment text
      if (comment.text) {
        analysisInput.text = comment.text;
        
        // Extract URLs from comment
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = comment.text.match(urlRegex);
        if (urls) {
          for (const url of urls) {
            analysisInput.attachments.push({ kind: "link", url });
          }
        }
      }

      // Add post permalink if available
      if (comment.mediaId) {
        // Construct Instagram post URL
        const postUrl = `https://www.instagram.com/p/${comment.mediaId}/`;
        analysisInput.attachments.push({ kind: "link", url: postUrl });
      }

      // Get linked app user (if any) for analysis
      const linkedUser = await socialLinkingService.getLinkedAppUser(instagramUserId);
      const userId = linkedUser?.id || null;

      // Submit analysis
      const analysisId = await analysisService.enqueueAnalysis(
        {
          text: analysisInput.text,
          mediaType: "text",
          attachments: analysisInput.attachments
        },
        userId || undefined,
        instagramUserId
      );

      // Increment usage
      await this.incrementInstagramUsage(instagramUserId);

      return { success: true };
    } catch (error: any) {
      serviceLogger.error({ error, comment }, "[Instagram] Error handling comment");
      return { success: false, error: error.message || "Failed to process comment" };
    }
  }
}

export const instagramService = new InstagramService();

