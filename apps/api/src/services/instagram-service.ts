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
import { PLAN_LIMITS } from "./subscription-service.js";
import type { SubscriptionPlan } from "../types/subscription.js";

const INSTAGRAM_API_BASE = "https://graph.facebook.com/v18.0";

function canonicalizeUrlForDedup(raw: string): string {
  const input = (raw ?? "").trim();
  if (!input) return input;
  try {
    const u = new URL(input);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    if (u.hostname.startsWith("www.")) u.hostname = u.hostname.slice(4);

    // Drop common tracking params (keep everything else).
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

    if (u.pathname.length > 1) {
      u.pathname = u.pathname.replace(/\/+$/, "");
    }

    return u.toString();
  } catch {
    return input;
  }
}

// DM limits are now defined in PLAN_LIMITS (subscription-service.ts)
// FREE: 3/month, PLUS: 10/month, PRO: unlimited

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
   * Get the appropriate access token for Instagram API calls
   * Prefers Facebook Page Access Token, falls back to Instagram Business Account Token
   * 
   * @returns Object with token, token type, and whether it's an Instagram token (needs exchange)
   */
  private getAccessToken(): { token: string | null; isInstagramToken: boolean; tokenType: string } {
    const pageToken = env.INSTAGRAM_PAGE_ACCESS_TOKEN?.trim();
    const instagramToken = env.INSTAGRAM_BUSINESS_ACCOUNT_TOKEN?.trim();
    
    // Prefer Page Access Token if available
    if (pageToken && pageToken.length > 0) {
      const tokenPrefix = pageToken.substring(0, 4).toUpperCase();
      const isInstagramToken = tokenPrefix.startsWith("IGA") || tokenPrefix.startsWith("IG");
      return {
        token: pageToken,
        isInstagramToken,
        tokenType: isInstagramToken ? "Instagram Token (IGA) - from INSTAGRAM_PAGE_ACCESS_TOKEN" : "Page Token (EAA) - from INSTAGRAM_PAGE_ACCESS_TOKEN"
      };
    }
    
    // Fall back to Instagram Business Account Token
    if (instagramToken && instagramToken.length > 0) {
      // Validate token prefix to determine actual token type
      const tokenPrefix = instagramToken.substring(0, 4).toUpperCase();
      const isInstagramTokenType = tokenPrefix.startsWith("IGA") || tokenPrefix.startsWith("IG");
      const isPageTokenType = tokenPrefix.startsWith("EAA");
      
      // Warn if Page token is mistakenly placed in INSTAGRAM_BUSINESS_ACCOUNT_TOKEN
      if (isPageTokenType) {
        serviceLogger.warn({ 
          tokenPrefix,
          note: "INSTAGRAM_BUSINESS_ACCOUNT_TOKEN contains a Page token (EAA) instead of Instagram token (IGA). Consider using INSTAGRAM_PAGE_ACCESS_TOKEN instead."
        }, "[Instagram] Page token detected in INSTAGRAM_BUSINESS_ACCOUNT_TOKEN - treating as Page token");
        return {
          token: instagramToken,
          isInstagramToken: false,
          tokenType: "Page Token (EAA) - from INSTAGRAM_BUSINESS_ACCOUNT_TOKEN (should use INSTAGRAM_PAGE_ACCESS_TOKEN)"
        };
      }
      
      // Validate it's actually an Instagram token
      if (!isInstagramTokenType) {
        serviceLogger.warn({ 
          tokenPrefix,
          note: "INSTAGRAM_BUSINESS_ACCOUNT_TOKEN has unexpected prefix. Expected IGA/IG prefix for Instagram token."
        }, "[Instagram] Unexpected token prefix in INSTAGRAM_BUSINESS_ACCOUNT_TOKEN");
      }
      
      return {
        token: instagramToken,
        isInstagramToken: isInstagramTokenType,
        tokenType: isInstagramTokenType 
          ? "Instagram Token (IGA) - from INSTAGRAM_BUSINESS_ACCOUNT_TOKEN"
          : `Unknown Token Type (${tokenPrefix}) - from INSTAGRAM_BUSINESS_ACCOUNT_TOKEN`
      };
    }
    
    return {
      token: null,
      isInstagramToken: false,
      tokenType: "None"
    };
  }

  /**
   * Exchange Instagram Business Account token for Page Access Token
   * Instagram Messaging API requires a Page Access Token, not an Instagram token
   * 
   * Note: This requires the Instagram Business Account to be linked to a Facebook Page
   */
  private async exchangeInstagramTokenForPageToken(instagramToken: string, businessAccountId: string): Promise<{ pageToken: string; pageId: string } | null> {
    try {
      // Try to get pages associated with the user's account
      // Instagram tokens with proper permissions can query /me/accounts to get Page Access Tokens
      const pagesResponse = await fetch(
        `${INSTAGRAM_API_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(instagramToken)}`
      );
      
      if (!pagesResponse.ok) {
        const errorData = await pagesResponse.json().catch(() => ({}));
        serviceLogger.warn({ 
          businessAccountId, 
          status: pagesResponse.status,
          error: errorData.error?.message || "Unknown error"
        }, "[Instagram] Failed to get pages for token exchange - Instagram token may not have 'pages_show_list' permission");
        return null;
      }
      
      const pagesData = await pagesResponse.json() as { data?: Array<{ id: string; access_token: string; instagram_business_account?: { id: string } }> };
      
      if (!pagesData.data || pagesData.data.length === 0) {
        serviceLogger.warn({ businessAccountId }, "[Instagram] No pages found - Instagram Business Account may not be linked to a Facebook Page");
        return null;
      }
      
      // Find the page that matches the Instagram Business Account ID
      const matchingPage = pagesData.data.find(p => p.instagram_business_account?.id === businessAccountId);
      
      if (matchingPage?.access_token) {
        serviceLogger.info({ 
          pageId: matchingPage.id, 
          businessAccountId,
          pageName: matchingPage.name || "Unknown"
        }, "[Instagram] Successfully exchanged Instagram token for Page Access Token");
        return { pageToken: matchingPage.access_token, pageId: matchingPage.id };
      }
      
      serviceLogger.warn({ 
        businessAccountId, 
        pagesCount: pagesData.data.length,
        pageIds: pagesData.data.map(p => ({ id: p.id, instagramId: p.instagram_business_account?.id }))
      }, "[Instagram] No matching page found for Instagram Business Account ID");
      return null;
    } catch (error: any) {
      serviceLogger.error({ 
        error: error instanceof Error ? error.message : String(error),
        businessAccountId 
      }, "[Instagram] Error exchanging Instagram token for Page Access Token");
      return null;
    }
  }

  /**
   * Send DM to Instagram user via Meta Graph API
   */
  async sendDM(instagramUserId: string, message: string): Promise<{ success: boolean; error?: string }> {
    // Get the appropriate access token (prefers Page token, falls back to Instagram token)
    const { token: accessToken, isInstagramToken: isTokenInstagramType, tokenType } = this.getAccessToken();
    const pageId = env.INSTAGRAM_PAGE_ID?.trim();
    const businessAccountId = env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim();
    
    if (!accessToken) {
      serviceLogger.error({ 
        instagramUserId,
        hasPageToken: !!env.INSTAGRAM_PAGE_ACCESS_TOKEN,
        hasInstagramToken: !!env.INSTAGRAM_BUSINESS_ACCOUNT_TOKEN,
        pageTokenLength: env.INSTAGRAM_PAGE_ACCESS_TOKEN?.length || 0,
        instagramTokenLength: env.INSTAGRAM_BUSINESS_ACCOUNT_TOKEN?.length || 0
      }, "[Instagram] No access token configured - set either INSTAGRAM_PAGE_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_TOKEN");
      return { success: false, error: "Instagram API not configured - set either INSTAGRAM_PAGE_ACCESS_TOKEN (preferred) or INSTAGRAM_BUSINESS_ACCOUNT_TOKEN" };
    }
    
    // Determine token type and appropriate account ID
    const tokenPrefix = accessToken.substring(0, 4).toUpperCase();
    const isInstagramToken = isTokenInstagramType || tokenPrefix.startsWith("IGA") || tokenPrefix.startsWith("IG");
    const isPageToken = tokenPrefix.startsWith("EAA");
    
    let accountId: string;
    let accountIdType: string;
    let finalAccessToken = accessToken;
    
    // For Instagram tokens (IGA), we need to exchange for Page Access Token
    // Instagram Messaging API requires a Page Access Token, not an Instagram token
    if (isInstagramToken) {
      if (!businessAccountId) {
        serviceLogger.error({ 
          instagramUserId,
          tokenPrefix,
          note: "Instagram tokens (IGA prefix) require INSTAGRAM_BUSINESS_ACCOUNT_ID for token exchange"
        }, "[Instagram] Instagram token requires Instagram Business Account ID");
        return { 
          success: false, 
          error: "Instagram access token (IGA) requires INSTAGRAM_BUSINESS_ACCOUNT_ID to be set. Instagram Messaging API requires a Page Access Token - attempting to exchange Instagram token for Page Access Token." 
        };
      }
      
      // Try to exchange Instagram token for Page Access Token
      serviceLogger.info({ businessAccountId }, "[Instagram] Attempting to exchange Instagram token for Page Access Token");
      const exchangeResult = await this.exchangeInstagramTokenForPageToken(accessToken, businessAccountId);
      
      if (!exchangeResult) {
        serviceLogger.error({ 
          instagramUserId,
          businessAccountId,
          note: "Failed to exchange Instagram token for Page Access Token. Instagram Messaging API requires a Page Access Token."
        }, "[Instagram] Token exchange failed");
        return { 
          success: false, 
          error: "Failed to exchange Instagram token for Page Access Token. Instagram Messaging API requires a Facebook Page Access Token (EAAB/EAA), not an Instagram token (IGA).\n\nSOLUTION:\n1. Link your Instagram Business Account to a Facebook Page (if not already linked)\n2. In Meta App Dashboard → Instagram → Settings → 'Generate access tokens'\n3. Click 'Generate token' for your Instagram account\n4. This will generate a Page Access Token (starts with EAAB/EAA) that works with messaging\n5. Copy that token and set it as INSTAGRAM_PAGE_ACCESS_TOKEN\n\nNote: Even with 'API setup with Instagram login', you can generate Page Access Tokens from the 'Generate access tokens' section." 
        };
      }
      
      // Use the exchanged Page Access Token
      finalAccessToken = exchangeResult.pageToken;
      accountId = exchangeResult.pageId;
      accountIdType = "Page ID (from token exchange)";
      serviceLogger.info({ pageId: accountId, businessAccountId }, "[Instagram] Using exchanged Page Access Token for messaging");
    } else {
      // For Page tokens, prefer Business Account ID if available, otherwise use Page ID
      accountId = businessAccountId || pageId;
      // Determine accountIdType based on which ID is actually being used
      accountIdType = businessAccountId && accountId === businessAccountId 
        ? "Instagram Business Account ID" 
        : "Page ID";
    }
    
    // Validate the token that will actually be used (finalAccessToken), not the original token
    const hasAccessToken = finalAccessToken && finalAccessToken.length > 0;
    const hasAccountId = accountId && accountId.length > 0;
    
    if (!hasAccessToken || !hasAccountId) {
      serviceLogger.error({ 
        instagramUserId,
        hasAccessToken,
        hasPageId: !!pageId,
        hasBusinessAccountId: !!businessAccountId,
        tokenPrefix,
        isInstagramToken,
        wasTokenExchanged: isInstagramToken && finalAccessToken !== accessToken,
        originalTokenLength: accessToken?.length || 0,
        finalTokenLength: finalAccessToken?.length || 0,
        accessTokenLength: accessToken?.length || 0,
        pageIdLength: env.INSTAGRAM_PAGE_ID?.length || 0,
        businessAccountIdLength: env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.length || 0,
        tokenSource: tokenType,
        hasPageToken: !!env.INSTAGRAM_PAGE_ACCESS_TOKEN,
        hasInstagramToken: !!env.INSTAGRAM_BUSINESS_ACCOUNT_TOKEN,
        accessTokenPreview: accessToken ? `${accessToken.substring(0, 10)}...` : "undefined",
        finalTokenPreview: finalAccessToken ? `${finalAccessToken.substring(0, 10)}...` : "undefined",
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
      const url = `${INSTAGRAM_API_BASE}/${accountId}/messages?access_token=${encodeURIComponent(finalAccessToken)}`;
      
      serviceLogger.debug({ 
        instagramUserId,
        accountId,
        accountIdType,
        tokenType: isInstagramToken && finalAccessToken !== accessToken 
          ? "Page Token (EAA) - exchanged from Instagram token" 
          : (isPageToken ? "Page Token (EAA)" : (isInstagramToken ? "Instagram Token (IGA) - will exchange" : "Unknown")),
        tokenSource: tokenType,
        url: url.replace(finalAccessToken, "[REDACTED]"),
        messageLength: message.length,
        accessTokenLength: finalAccessToken.length,
        accessTokenPreview: `${finalAccessToken.substring(0, 10)}...`,
        tokenPrefix: finalAccessToken.substring(0, 4).toUpperCase(),
        wasExchanged: isInstagramToken && finalAccessToken !== accessToken
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
          accountIdType,
          errorData,
          errorCode,
          errorSubcode,
          errorType,
          errorMessage,
          httpStatus: response.status,
          url: url.replace(finalAccessToken, "[REDACTED]"), // Don't log full token
          responseHeaders: Object.fromEntries(response.headers.entries()),
          wasTokenExchanged: isInstagramToken
        }, "[Instagram] Failed to send DM");
        
        // Provide helpful error messages for common issues
        if (errorCode === 190) {
          // Check if token exchange was attempted (original token was Instagram token but we're using exchanged Page token)
          const wasTokenExchanged = isInstagramToken && finalAccessToken !== accessToken;
          
          // Special handling for "Cannot parse access token" error
          const cannotParseError = errorMessage.toLowerCase().includes("cannot parse") || errorMessage.toLowerCase().includes("parse");
          
          // Determine troubleshooting tips based on whether exchange was attempted
          const troubleshootingTips = wasTokenExchanged ? [
            "⚠️ Token exchange succeeded, but the Page Access Token is invalid or lacks permissions",
            "1. The Instagram token was successfully exchanged for a Page Access Token, but the Page token failed",
            "2. Check if the Page Access Token has expired - use Meta Access Token Debugger: https://developers.facebook.com/tools/debug/accesstoken/",
            "3. Ensure the Page Access Token has 'pages_messaging' permission",
            "4. Verify the Page is properly linked to the Instagram Business Account",
            "5. Try regenerating the Page Access Token directly from Meta App Dashboard → Instagram → Settings → 'Generate access tokens'",
            "6. Ensure the Page token has not been revoked or invalidated",
            ...(cannotParseError ? ["7. The exchanged Page token format appears invalid - try regenerating from Meta App Dashboard"] : [])
          ] : isInstagramToken ? [
            "⚠️ CRITICAL: Instagram Messaging API requires a Facebook Page Access Token (EAAB/EAA), NOT an Instagram token (IGA)",
            "1. Switch to 'API setup with Facebook login' in Meta App Dashboard (not 'API setup with Instagram login')",
            "2. Generate a Page Access Token from your Facebook Page (linked to Instagram Business Account)",
            "3. The token should start with 'EAAB' or 'EAA', not 'IGA'",
            "4. Ensure the Page Access Token has 'pages_messaging' permission",
            "5. Use the Page ID (not Instagram Business Account ID) with Page Access Tokens",
            "6. Check token hasn't expired - use Meta Access Token Debugger: https://developers.facebook.com/tools/debug/accesstoken/",
            "7. Verify Instagram Business Account is linked to the Facebook Page",
            ...(cannotParseError ? ["8. The current token format is invalid - regenerate using Facebook Page Access Token method"] : [])
          ] : [
            "1. Verify token is a Facebook Page Access Token (starts with EAAB or EAA)",
            "2. Check token hasn't expired - use Meta Access Token Debugger: https://developers.facebook.com/tools/debug/accesstoken/",
            "3. Ensure token has 'pages_messaging' permission",
            "4. Verify Instagram Business Account is linked to the Facebook Page",
            "5. Check for extra whitespace or characters in the token",
            ...(cannotParseError ? ["6. Token format appears invalid - try regenerating the token"] : [])
          ];
          
          // Determine tokenType: if isInstagramToken is true, exchange must have succeeded (otherwise we'd return early)
          // So wasTokenExchanged is always true when isInstagramToken is true, making the "exchange not attempted" branch unreachable
          const tokenType = wasTokenExchanged 
            ? "Page Token (EAA) - exchanged from Instagram token" 
            : (isPageToken ? "Page Token (EAA)" : "Unknown");
          
          serviceLogger.error({ 
            instagramUserId,
            accountId,
            accountIdType,
            tokenPrefix: finalAccessToken.substring(0, 4).toUpperCase(),
            tokenType,
            tokenLength: finalAccessToken.length,
            wasTokenExchanged,
            errorMessage,
            troubleshootingTips
          }, "[Instagram] OAuth token error - see troubleshooting tips below");
          
          return { 
            success: false, 
            error: `Invalid OAuth access token (Error 190). ${errorMessage}\n\nTroubleshooting:\n${troubleshootingTips.join("\n")}`
          };
        }
        
        // Error code 3: Application does not have the capability to make this API call
        if (errorCode === 3) {
          // Check if token exchange was attempted (consistent with error 190 handling)
          const wasTokenExchanged = isInstagramToken && finalAccessToken !== accessToken;
          
          const troubleshootingTips = [
            "⚠️ CRITICAL: Your app does not have Instagram Messaging API capability enabled",
            "",
            "This error means your Meta App is not configured or approved for Instagram Messaging API.",
            "",
            "SOLUTION - Enable Instagram Messaging API:",
            "1. Go to Meta App Dashboard: https://developers.facebook.com/apps/",
            "2. Select your app",
            "3. Navigate to: Instagram → Instagram Messaging → Settings",
            "4. Ensure 'Instagram Messaging' is enabled",
            "5. Check that your app is in 'Live' mode (not Development mode)",
            "",
            "If your app is in Development mode:",
            "- Only test users can receive messages",
            "- Switch to Live mode: App Dashboard → App Review → Permissions and Features",
            "",
            "Required Permissions:",
            "- Ensure 'pages_messaging' permission is approved",
            "- Ensure 'instagram_basic' permission is approved",
            "- Verify Instagram Business Account is linked to Facebook Page",
            "",
            "App Review (if needed):",
            "- If your app is new, you may need to submit for App Review",
            "- Go to: App Dashboard → App Review → Permissions and Features",
            "- Submit 'pages_messaging' permission for review",
            "",
            "Verify Setup:",
            "- Check that INSTAGRAM_PAGE_ACCESS_TOKEN is a Page Access Token (starts with EAAB/EAA)",
            "- Verify INSTAGRAM_PAGE_ID or INSTAGRAM_BUSINESS_ACCOUNT_ID is set correctly",
            "- Test webhook: Ensure webhook is verified and receiving events"
          ];
          
          // Determine tokenType: if isInstagramToken is true, exchange must have succeeded (otherwise we'd return early)
          // So wasTokenExchanged is always true when isInstagramToken is true, making the "exchange not attempted" branch unreachable
          const tokenType = wasTokenExchanged 
            ? "Page Token (EAA) - exchanged from Instagram token" 
            : (isPageToken ? "Page Token (EAA)" : "Unknown");
          
          serviceLogger.error({ 
            instagramUserId,
            accountId,
            accountIdType,
            tokenPrefix: finalAccessToken.substring(0, 4).toUpperCase(),
            tokenType,
            tokenLength: finalAccessToken.length,
            wasTokenExchanged,
            errorCode,
            errorMessage,
            troubleshootingTips
          }, "[Instagram] App does not have Instagram Messaging API capability - see troubleshooting tips");
          
          return { 
            success: false, 
            error: `Application does not have the capability to make this API call (Error 3). ${errorMessage}\n\n${troubleshootingTips.join("\n")}`
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
    const { token: accessToken, tokenType } = this.getAccessToken();
    if (!accessToken || accessToken.length === 0) {
      serviceLogger.warn({ 
        hasPageToken: !!env.INSTAGRAM_PAGE_ACCESS_TOKEN,
        hasInstagramToken: !!env.INSTAGRAM_BUSINESS_ACCOUNT_TOKEN
      }, "[Instagram] No access token configured, cannot fetch post permalink - set either INSTAGRAM_PAGE_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_TOKEN");
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
    const linkSet = new Set<string>();
    const imageSet = new Set<string>();
    const content: ExtractedContent = { links: [], images: [] };

    const addLink = (url: string) => {
      const canonical = canonicalizeUrlForDedup(url);
      if (canonical) linkSet.add(canonical);
    };
    const addImage = (url: string) => {
      const trimmed = (url ?? "").trim();
      if (trimmed) imageSet.add(trimmed);
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
            addImage(url);
            serviceLogger.debug({ url }, "[Instagram] Found Instagram CDN URL in text, added as image");
          } else {
            addLink(url);
            serviceLogger.debug({ url }, "[Instagram] Found URL in text, added as link");
          }
        }
        serviceLogger.debug({ 
          totalUrls: urls.length, 
          links: linkSet.size, 
          images: imageSet.size 
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
          addImage(attachment.payload.url);
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
              addLink(postUrl);
              serviceLogger.debug({ 
                cdnUrl: shareUrl, 
                postUrl 
              }, "[Instagram] Extracted post URL from shared attachment, added as link");
            } else {
              // Fallback: treat CDN URL as image if we can't extract post URL
              addImage(shareUrl);
              serviceLogger.debug({ url: shareUrl }, "[Instagram] Could not extract post URL, treating CDN URL as image");
            }
          } else {
            // Regular shared links/posts (not CDN URLs)
            addLink(shareUrl);
            serviceLogger.debug({ url: shareUrl }, "[Instagram] Added shared link URL");
          }
        } else if (attachment.type === "video" && attachment.payload?.url) {
          // Check if video URL is an Instagram CDN URL
          const videoUrl = attachment.payload.url;
          if (this.isInstagramCdnUrl(videoUrl)) {
            // Instagram CDN URLs are media files, treat as images (videos can be analyzed as images)
            addImage(videoUrl);
            serviceLogger.debug({ url: videoUrl }, "[Instagram] Added video from CDN URL as image");
          } else {
            // Regular video links
            addLink(videoUrl);
            serviceLogger.debug({ url: videoUrl }, "[Instagram] Added video URL");
          }
        } else if (attachment.type === "fallback" && attachment.payload?.url) {
          // Check if fallback URL is an Instagram CDN URL
          const fallbackUrl = attachment.payload.url;
          if (this.isInstagramCdnUrl(fallbackUrl)) {
            // Instagram CDN URLs are media files, treat as images
            addImage(fallbackUrl);
            serviceLogger.debug({ url: fallbackUrl }, "[Instagram] Added fallback image from CDN URL");
          } else {
            // Regular fallback links
            addLink(fallbackUrl);
            serviceLogger.debug({ url: fallbackUrl }, "[Instagram] Added fallback URL");
          }
        } else {
          serviceLogger.debug({ attachment }, "[Instagram] Unhandled attachment type");
        }
      }
    }

    content.links = Array.from(linkSet);
    content.images = Array.from(imageSet);

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
    tier: SubscriptionPlan;
  }> {
    // Check if user is whitelisted for unlimited access (for testing/admin accounts)
    if (this.isWhitelisted(instagramUserId)) {
      serviceLogger.debug({ instagramUserId }, "[Instagram] User is whitelisted - unlimited access granted");
      return { allowed: true, remaining: -1, limit: -1, tier: "PRO" }; // -1 means unlimited
    }

    // Get user's subscription tier (defaults to FREE if not linked)
    const subscriptionTier = await socialLinkingService.getInstagramUserSubscription(instagramUserId) as SubscriptionPlan | null;
    const tier: SubscriptionPlan = subscriptionTier || "FREE";
    const dmLimit = PLAN_LIMITS[tier].maxDmAnalysesPerMonth;

    // Check if tier has unlimited DM analyses (PRO)
    if (dmLimit === null) {
      serviceLogger.debug({ instagramUserId, tier }, "[Instagram] User has unlimited DM analyses");
      return { allowed: true, remaining: -1, limit: -1, tier };
    }

    // Check usage against tier limit
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

    const remaining = Math.max(0, dmLimit - usage.analysesCount);
    const allowed = usage.analysesCount < dmLimit;

    serviceLogger.debug({ 
      instagramUserId, 
      tier, 
      limit: dmLimit, 
      used: usage.analysesCount, 
      remaining, 
      allowed 
    }, "[Instagram] DM usage check");

    return { allowed, remaining, limit: dmLimit, tier };
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
  formatRateLimitMessage(remaining: number, limit: number, tier: SubscriptionPlan = "FREE"): string {
    const appUrl = env.APP_BASE_URL;
    
    if (tier === "FREE") {
      return `🚫 *Rate Limit Reached*

You've used all ${limit} free DM analyses this month.

💎 *Upgrade to Plus* for 10 DM analyses/month, or *Pro* for unlimited!

Download the Vett app and upgrade your plan:
${appUrl}`;
    }
    
    // PLUS tier
    return `🚫 *Rate Limit Reached*

You've used all ${limit} DM analyses this month on your Plus plan.

💎 *Upgrade to Pro* for unlimited DM analyses!

Open the Vett app to upgrade:
${appUrl}`;
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
        const rateLimitDmResult = await this.sendDM(instagramUserId, this.formatRateLimitMessage(usageCheck.remaining, usageCheck.limit, usageCheck.tier));
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
        const seen = new Set<string>();
        const addAttachment = (kind: "link" | "image", url: string) => {
          const normalized = kind === "link" ? canonicalizeUrlForDedup(url) : (url ?? "").trim();
          if (!normalized) return;
          const key = `${kind}:${normalized}`;
          if (seen.has(key)) return;
          seen.add(key);
          analysisInput.attachments.push({ kind, url: normalized });
        };

        for (const link of content.links) addAttachment("link", link);

        // Add images (only if not successfully processed by multimodal pipeline)
        // Include images if multimodal processing wasn't attempted or failed
        // If multimodal succeeded (extractedClaims.length > 0), skip images since they're already processed as claims
        // If multimodal failed or wasn't attempted (extractedClaims.length === 0), include images for regular analysis
        if (extractedClaims.length === 0) {
          for (const imageUrl of content.images) addAttachment("image", imageUrl);
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
        await this.sendDM(instagramUserId, this.formatRateLimitMessage(usageCheck.remaining, usageCheck.limit, usageCheck.tier));
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
        await this.sendDM(instagramUserId, this.formatRateLimitMessage(usageCheck.remaining, usageCheck.limit, usageCheck.tier));
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

