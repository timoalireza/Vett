import { eq, and, gte } from "drizzle-orm";
import { db } from "../db/client.js";
import { instagramDmUsage, instagramUsers } from "../db/schema.js";
import { env } from "../env.js";
import { socialLinkingService } from "./social-linking-service.js";
import { analysisService } from "./analysis-service.js";
import type { AnalysisSummary } from "./analysis-service.js";
import { serviceLogger } from "../utils/service-logger.js";

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
    if (!env.INSTAGRAM_PAGE_ACCESS_TOKEN || !env.INSTAGRAM_PAGE_ID) {
      serviceLogger.error({ instagramUserId }, "[Instagram] Missing Instagram API credentials");
      return { success: false, error: "Instagram API not configured" };
    }

    try {
      const url = `${INSTAGRAM_API_BASE}/${env.INSTAGRAM_PAGE_ID}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recipient: { id: instagramUserId },
          message: { text: message },
          messaging_type: "RESPONSE",
          access_token: env.INSTAGRAM_PAGE_ACCESS_TOKEN
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        serviceLogger.error({ instagramUserId, errorData }, "[Instagram] Failed to send DM");
        return { success: false, error: errorData.error?.message || "Failed to send DM" };
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
    if (!env.INSTAGRAM_PAGE_ACCESS_TOKEN) {
      serviceLogger.warn("[Instagram] INSTAGRAM_PAGE_ACCESS_TOKEN not configured, cannot fetch post permalink");
      return null;
    }

    try {
      // Use Graph API to get media information
      const response = await fetch(
        `${INSTAGRAM_API_BASE}/${mediaId}?fields=permalink&access_token=${env.INSTAGRAM_PAGE_ACCESS_TOKEN}`,
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
  async checkInstagramUsageLimit(instagramUserId: string): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
  }> {
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
   */
  async incrementInstagramUsage(instagramUserId: string): Promise<void> {
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

      // Extract content from message
      const content = await this.extractContentFromMessage(message);
      
      serviceLogger.info({
        instagramUserId,
        hasText: !!content.text,
        textLength: content.text?.length || 0,
        linksCount: content.links.length,
        imagesCount: content.images.length,
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
      if (!content.text && content.links.length === 0 && content.images.length === 0) {
        serviceLogger.warn({
          instagramUserId,
          messageText: message.text,
          messageAttachments: message.attachments
        }, "[Instagram] No content found in message from user");
        await this.sendDM(
          instagramUserId,
          "Please send a link, image, or text message to analyze. I can help you fact-check content! 🔍\n\nTo link your account, send the 6-digit verification code from the Vett app."
        );
        return { success: true };
      }

      // Check usage limits
      const usageCheck = await this.checkInstagramUsageLimit(instagramUserId);
      if (!usageCheck.allowed) {
        await this.sendDM(instagramUserId, this.formatRateLimitMessage(usageCheck.remaining, usageCheck.limit));
        return { success: true };
      }

      // Send processing message
      await this.sendDM(instagramUserId, this.formatProcessingMessage());

      // Prepare analysis input
      const analysisInput: {
        text?: string;
        attachments: Array<{ kind: "link" | "image"; url: string }>;
      } = {
        attachments: []
      };

      if (content.text && content.links.length === 0 && content.images.length === 0) {
        // Text-only message
        analysisInput.text = content.text;
      } else {
        // Add links
        for (const link of content.links) {
          analysisInput.attachments.push({ kind: "link", url: link });
        }

        // Add images
        for (const imageUrl of content.images) {
          analysisInput.attachments.push({ kind: "image", url: imageUrl });
        }

        // Add text if present (as context)
        if (content.text) {
          analysisInput.text = content.text;
        }
      }

      // Get linked app user (if any) for analysis
      const linkedUser = await socialLinkingService.getLinkedAppUser(instagramUserId);
      const userId = linkedUser?.id || null;

      // Submit analysis (create anonymous analysis if not linked)
      // Store instagramUserId so we can retroactively link analyses when account is linked
      serviceLogger.info({
        instagramUserId,
        hasText: !!analysisInput.text,
        textLength: analysisInput.text?.length || 0,
        attachmentsCount: analysisInput.attachments.length,
        attachments: analysisInput.attachments,
        userId: userId || "anonymous"
      }, "[Instagram] Enqueueing analysis for Instagram user");
      
      let analysisId: string;
      try {
        serviceLogger.debug({
          instagramUserId,
          text: analysisInput.text?.substring(0, 100),
          mediaType: "text",
          attachmentsCount: analysisInput.attachments.length,
          userId: userId || undefined
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

        serviceLogger.info({ instagramUserId, analysisId }, "[Instagram] Analysis queued successfully");
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

