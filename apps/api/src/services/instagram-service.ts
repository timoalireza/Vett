import { eq, and, gte } from "drizzle-orm";
import { db } from "../db/client.js";
import { instagramDmUsage, instagramUsers } from "../db/schema.js";
import { env } from "../env.js";
import { socialLinkingService } from "./social-linking-service.js";
import { analysisService } from "./analysis-service.js";
import type { AnalysisSummary } from "./analysis-service.js";

const INSTAGRAM_API_BASE = "https://graph.facebook.com/v18.0";
const FREE_TIER_DM_LIMIT = 3; // 3 analyses per month for FREE tier

interface InstagramMessage {
  id: string;
  from: {
    id: string;
    username?: string;
  };
  text?: string;
  attachments?: {
    type: string;
    payload: {
      url?: string;
    };
  }[];
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
      console.error("[Instagram] Missing Instagram API credentials");
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
        console.error("[Instagram] Failed to send DM:", errorData);
        return { success: false, error: errorData.error?.message || "Failed to send DM" };
      }

      return { success: true };
    } catch (error: any) {
      console.error("[Instagram] Error sending DM:", error);
      return { success: false, error: error.message || "Failed to send DM" };
    }
  }

  /**
   * Extract content from Instagram message (links, images, text)
   */
  extractContentFromMessage(message: InstagramMessage): ExtractedContent {
    const content: ExtractedContent = {
      links: [],
      images: []
    };

    // Extract text
    if (message.text) {
      content.text = message.text;

      // Extract URLs from text
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = message.text.match(urlRegex);
      if (urls) {
        content.links.push(...urls);
      }
    }

    // Extract attachments (images, videos, etc.)
    if (message.attachments) {
      for (const attachment of message.attachments) {
        if (attachment.type === "image" && attachment.payload?.url) {
          content.images.push(attachment.payload.url);
        } else if (attachment.type === "share" && attachment.payload?.url) {
          // Shared links
          content.links.push(attachment.payload.url);
        }
      }
    }

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

    let usage = await db.query.instagramDmUsage.findFirst({
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

    const remaining = Math.max(0, FREE_TIER_DM_LIMIT - usage.analysesCount);
    const allowed = usage.analysesCount < FREE_TIER_DM_LIMIT;

    return { allowed, remaining, limit: FREE_TIER_DM_LIMIT };
  }

  /**
   * Increment Instagram DM usage count
   */
  async incrementInstagramUsage(instagramUserId: string): Promise<void> {
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
        return { success: false, error: "Invalid message format" };
      }

      const instagramUserId = message.from.id;
      const username = message.from.username;

      // Get or create Instagram user
      await socialLinkingService.getOrCreateInstagramUser(instagramUserId, username);

      // Extract content from message
      const content = this.extractContentFromMessage(message);

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
      const analysisId = await analysisService.enqueueAnalysis(
        {
          text: analysisInput.text,
          mediaType: "text",
          attachments: analysisInput.attachments
        },
        userId || undefined,
        instagramUserId // Store Instagram user ID for retroactive linking
      );

      // Increment usage
      await this.incrementInstagramUsage(instagramUserId);

      // Note: Analysis completion will be handled by a separate webhook/callback
      // For now, we'll poll or use a webhook to send results when ready
      // This is a simplified version - in production, you'd want to set up a callback

      return { success: true };
    } catch (error: any) {
      console.error("[Instagram] Error handling incoming DM:", error);
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
      console.error("[Instagram] Error sending analysis results:", error);
      return { success: false, error: error.message || "Failed to send results" };
    }
  }
}

export const instagramService = new InstagramService();

