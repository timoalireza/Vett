import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/backend";

import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { env } from "../env.js";

const clerk = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY
});

class UserService {
  /**
   * Get or create a user in the database from Clerk user ID
   * This syncs Clerk users to our database
   */
  async getOrCreateUser(clerkUserId: string): Promise<string> {
    // Check if user exists in our database
    const existingUser = await db.query.users.findFirst({
      where: eq(users.externalId, clerkUserId)
    });

    if (existingUser) {
      return existingUser.id;
    }

    // Fetch user details from Clerk
    let clerkUser;
    try {
      clerkUser = await clerk.users.getUser(clerkUserId);
    } catch (error) {
      throw new Error(`Failed to fetch user from Clerk: ${error}`);
    }

    // Create user in our database
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
    const phoneNumber = clerkUser.phoneNumbers[0]?.phoneNumber ?? null;
    
    // Build display name with fallback chain: full name > username > email > phone > external ID
    const displayName =
      clerkUser.firstName && clerkUser.lastName
        ? `${clerkUser.firstName} ${clerkUser.lastName}`
        : clerkUser.username ?? 
          email ?? 
          (phoneNumber ? `User ${phoneNumber.slice(-4)}` : null) ?? 
          `User ${clerkUserId.slice(-8)}`;
    
    const avatarUrl = clerkUser.imageUrl ?? null;

    const [newUser] = await db
      .insert(users)
      .values({
        externalId: clerkUserId,
        email,
        phoneNumber,
        displayName,
        avatarUrl
      })
      .returning({ id: users.id });

    return newUser.id;
  }

  /**
   * Update user information from Clerk
   * Call this when user updates their profile in Clerk
   */
  async syncUserFromClerk(clerkUserId: string): Promise<void> {
    try {
      const clerkUser = await clerk.users.getUser(clerkUserId);
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
      const phoneNumber = clerkUser.phoneNumbers[0]?.phoneNumber ?? null;
      
      // Build display name with fallback chain: full name > username > email > phone > external ID
      const displayName =
        clerkUser.firstName && clerkUser.lastName
          ? `${clerkUser.firstName} ${clerkUser.lastName}`
          : clerkUser.username ?? 
            email ?? 
            (phoneNumber ? `User ${phoneNumber.slice(-4)}` : null) ?? 
            `User ${clerkUserId.slice(-8)}`;
      
      const avatarUrl = clerkUser.imageUrl ?? null;

      await db
        .update(users)
        .set({
          email,
          phoneNumber,
          displayName,
          avatarUrl
        })
        .where(eq(users.externalId, clerkUserId));
    } catch (error) {
      // Log error but don't throw - user might not exist yet
      console.error(`Failed to sync user ${clerkUserId} from Clerk:`, error);
    }
  }

  /**
   * Get user by Clerk user ID
   */
  async getUserByExternalId(externalId: string) {
    return db.query.users.findFirst({
      where: eq(users.externalId, externalId)
    });
  }

  /**
   * Get user by internal user ID
   */
  async getUserById(userId: string) {
    return db.query.users.findFirst({
      where: eq(users.id, userId)
    });
  }
}

export const userService = new UserService();

