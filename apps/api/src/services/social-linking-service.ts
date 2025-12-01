import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { instagramUsers, socialAccounts, users, analyses } from "../db/schema.js";
import { userService } from "./user-service.js";
import { subscriptionService } from "./subscription-service.js";

class SocialLinkingService {
  /**
   * Get or create Instagram user record
   */
  async getOrCreateInstagramUser(instagramUserId: string, username?: string) {
    let instagramUser = await db.query.instagramUsers.findFirst({
      where: eq(instagramUsers.instagramUserId, instagramUserId)
    });

    if (!instagramUser) {
      const [created] = await db
        .insert(instagramUsers)
        .values({
          instagramUserId,
          username: username || null
        })
        .returning();

      instagramUser = created;
    } else if (username && instagramUser.username !== username) {
      // Update username if provided and different
      const [updated] = await db
        .update(instagramUsers)
        .set({
          username,
          updatedAt: new Date()
        })
        .where(eq(instagramUsers.id, instagramUser.id))
        .returning();

      instagramUser = updated;
    }

    return instagramUser;
  }

  /**
   * Get linked app user for Instagram account
   * Only returns accounts that are actually linked (have linkedAt set)
   */
  async getLinkedAppUser(instagramUserId: string) {
    const socialAccount = await db.query.socialAccounts.findFirst({
      where: and(
        eq(socialAccounts.platformUserId, instagramUserId),
        eq(socialAccounts.platform, "INSTAGRAM"),
        isNotNull(socialAccounts.linkedAt)
      ),
      with: {
        user: true
      }
    });

    return socialAccount?.user || null;
  }

  /**
   * Link Instagram account to app user by verification code
   * This is called when user sends verification code to Instagram bot
   */
  async linkInstagramByCode(
    instagramUserId: string,
    verificationCode: string
  ): Promise<{ success: boolean; appUserId?: string; error?: string }> {
    try {
      // Find account with matching verification code
      const account = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.verificationCode, verificationCode),
          eq(socialAccounts.platform, "INSTAGRAM")
        )
      });

      if (!account) {
        return { success: false, error: "Invalid verification code" };
      }

      // Verify code hasn't expired
      if (account.verificationCodeExpiresAt && account.verificationCodeExpiresAt < new Date()) {
        return { success: false, error: "Verification code expired" };
      }

      // Update account with Instagram user ID and mark as linked
      await db
        .update(socialAccounts)
        .set({
          platformUserId: instagramUserId,
          linkedAt: new Date(),
          verificationCode: null,
          verificationCodeExpiresAt: null,
          updatedAt: new Date()
        })
        .where(eq(socialAccounts.id, account.id));

      // Retroactively link analyses created via Instagram DM for this Instagram user
      await this.linkAnalysesForInstagramUser(instagramUserId, account.userId);

      return { success: true, appUserId: account.userId };
    } catch (error: any) {
      console.error("[SocialLinking] Error linking by code:", error);
      return { success: false, error: error.message || "Failed to link account" };
    }
  }

  /**
   * Link Instagram account to app user
   */
  async linkInstagramToAppUser(
    instagramUserId: string,
    appUserId: string,
    verificationCode?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify app user exists
      const appUser = await db.query.users.findFirst({
        where: eq(users.id, appUserId)
      });

      if (!appUser) {
        return { success: false, error: "App user not found" };
      }

      // Check if verification code is required and valid
      if (verificationCode) {
        const existingAccount = await db.query.socialAccounts.findFirst({
          where: and(
            eq(socialAccounts.platformUserId, instagramUserId),
            eq(socialAccounts.platform, "INSTAGRAM")
          )
        });

        if (!existingAccount || existingAccount.verificationCode !== verificationCode) {
          return { success: false, error: "Invalid verification code" };
        }

        if (
          existingAccount.verificationCodeExpiresAt &&
          existingAccount.verificationCodeExpiresAt < new Date()
        ) {
          return { success: false, error: "Verification code expired" };
        }
      }

      // Check if already linked to a different user
      const existingLink = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.platformUserId, instagramUserId),
          eq(socialAccounts.platform, "INSTAGRAM")
        )
      });

      if (existingLink && existingLink.userId !== appUserId) {
        return { success: false, error: "Instagram account already linked to another user" };
      }

      // Create or update social account link
      if (existingLink) {
        await db
          .update(socialAccounts)
          .set({
            userId: appUserId,
            linkedAt: new Date(),
            verificationCode: null,
            verificationCodeExpiresAt: null,
            updatedAt: new Date()
          })
          .where(eq(socialAccounts.id, existingLink.id));
      } else {
        await db.insert(socialAccounts).values({
          userId: appUserId,
          platform: "INSTAGRAM",
          platformUserId: instagramUserId,
          linkedAt: new Date(),
          verificationCode: null,
          verificationCodeExpiresAt: null
        });
      }

      // Retroactively link analyses created via Instagram DM for this Instagram user
      await this.linkAnalysesForInstagramUser(instagramUserId, appUserId);

      return { success: true };
    } catch (error: any) {
      console.error("[SocialLinking] Error linking Instagram account:", error);
      return { success: false, error: error.message || "Failed to link account" };
    }
  }

  /**
   * Generate verification code for linking Instagram account
   * This creates a temporary record that will be updated when linking is completed
   * If instagramUserId is not provided, code is generated for app user and will be linked when user sends code to bot
   */
  async generateVerificationCode(
    appUserId: string,
    instagramUserId?: string,
    expiresInMinutes: number = 10
  ): Promise<string> {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    // Check if social account exists (by userId if no instagramUserId, or by instagramUserId if provided)
    let existingAccount;
    if (instagramUserId) {
      existingAccount = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.platformUserId, instagramUserId),
          eq(socialAccounts.platform, "INSTAGRAM")
        )
      });
    } else {
      // Find by userId and platform, looking for unlinked accounts (no platformUserId or no linkedAt)
      existingAccount = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.userId, appUserId),
          eq(socialAccounts.platform, "INSTAGRAM")
        )
      });
    }

    if (existingAccount) {
      // Update existing account with new code
      await db
        .update(socialAccounts)
        .set({
          userId: appUserId, // Update userId in case it changed
          platformUserId: instagramUserId || existingAccount.platformUserId || "", // Keep existing or set new
          verificationCode: code,
          verificationCodeExpiresAt: expiresAt,
          updatedAt: new Date()
        })
        .where(eq(socialAccounts.id, existingAccount.id));
    } else {
      // Create new account record with verification code
      // userId is set here, but linking is not complete until verification code is confirmed
      // platformUserId can be empty initially and set when user sends code to bot
      await db.insert(socialAccounts).values({
        userId: appUserId,
        platform: "INSTAGRAM",
        platformUserId: instagramUserId || "", // Can be empty initially
        verificationCode: code,
        verificationCodeExpiresAt: expiresAt
      });
    }

    return code;
  }

  /**
   * Unlink Instagram account from app user
   * Only unlinks accounts that are actually linked (have linkedAt set)
   */
  async unlinkInstagramAccount(instagramUserId: string, appUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const socialAccount = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.platformUserId, instagramUserId),
          eq(socialAccounts.platform, "INSTAGRAM"),
          eq(socialAccounts.userId, appUserId),
          isNotNull(socialAccounts.linkedAt)
        )
      });

      if (!socialAccount) {
        return { success: false, error: "Instagram account not linked to this user" };
      }

      await db.delete(socialAccounts).where(eq(socialAccounts.id, socialAccount.id));

      return { success: true };
    } catch (error: any) {
      console.error("[SocialLinking] Error unlinking Instagram account:", error);
      return { success: false, error: error.message || "Failed to unlink account" };
    }
  }

  /**
   * Get Instagram user's subscription tier (via linked app user)
   */
  async getInstagramUserSubscription(instagramUserId: string): Promise<"FREE" | "PLUS" | "PRO"> {
    const linkedUser = await this.getLinkedAppUser(instagramUserId);

    if (!linkedUser) {
      return "FREE"; // Default to FREE if not linked
    }

    try {
      const subscription = await subscriptionService.getSubscriptionInfo(linkedUser.id);
      return subscription.plan;
    } catch (error) {
      console.error("[SocialLinking] Error getting subscription:", error);
      return "FREE";
    }
  }

  /**
   * Get social accounts linked to app user
   * Only returns accounts that are actually linked (have linkedAt set)
   */
  async getLinkedSocialAccounts(appUserId: string) {
    const accounts = await db.query.socialAccounts.findMany({
      where: and(
        eq(socialAccounts.userId, appUserId),
        isNotNull(socialAccounts.linkedAt)
      )
    });

    return accounts;
  }

  /**
   * Find social account by verification code for a specific user
   * Returns accounts regardless of linkedAt status (for pending verification codes)
   */
  async findAccountByVerificationCode(appUserId: string, verificationCode: string, platform: "INSTAGRAM" = "INSTAGRAM") {
    const account = await db.query.socialAccounts.findFirst({
      where: and(
        eq(socialAccounts.userId, appUserId),
        eq(socialAccounts.platform, platform),
        eq(socialAccounts.verificationCode, verificationCode)
      )
    });

    return account || null;
  }

  /**
   * Retroactively link analyses created via Instagram DM to app user
   * This is called when an Instagram account is linked to ensure all previous analyses appear in the app
   */
  async linkAnalysesForInstagramUser(instagramUserId: string, appUserId: string): Promise<void> {
    try {
      // Update all analyses with this Instagram user ID that don't have a userId yet
      // This ensures analyses created before linking are now associated with the app user
      await db
        .update(analyses)
        .set({
          userId: appUserId,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(analyses.instagramUserId, instagramUserId),
            isNull(analyses.userId) // Only update analyses that aren't already linked
          )
        );

      console.log(`[SocialLinking] Linked analyses for Instagram user ${instagramUserId} to app user ${appUserId}`);
    } catch (error: any) {
      console.error("[SocialLinking] Error linking analyses:", error);
      // Don't throw - linking analyses is best-effort, shouldn't fail account linking
    }
  }
}

export const socialLinkingService = new SocialLinkingService();

