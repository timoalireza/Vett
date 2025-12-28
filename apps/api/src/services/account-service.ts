import { eq, inArray } from "drizzle-orm";

import { db } from "../db/client.js";
import { analyses, collections, instagramDmUsage, socialAccounts, users } from "../db/schema.js";

class AccountService {
  /**
   * Delete all user data from our database.
   *
   * Important: `analyses.userId` is ON DELETE SET NULL, so we must delete analyses explicitly
   * before deleting the user to avoid leaving orphaned analyses behind.
   */
  async deleteUserData(userId: string): Promise<void> {
    // Capture linked Instagram user IDs so we can delete DM usage records as well.
    const linkedInstagramAccounts = await db.query.socialAccounts.findMany({
      where: eq(socialAccounts.userId, userId)
    });

    const instagramUserIds = linkedInstagramAccounts
      .filter((a) => a.platform === "INSTAGRAM")
      .map((a) => a.platformUserId);

    // User-owned content
    await db.delete(collections).where(eq(collections.userId, userId));
    await db.delete(analyses).where(eq(analyses.userId, userId));

    // Instagram DM usage (not FK-linked)
    if (instagramUserIds.length > 0) {
      await db.delete(instagramDmUsage).where(inArray(instagramDmUsage.instagramUserId, instagramUserIds));
    }

    // Finally, delete the user. Cascades to: subscriptions, user_usage, social_accounts, etc.
    await db.delete(users).where(eq(users.id, userId));
  }
}

export const accountService = new AccountService();


