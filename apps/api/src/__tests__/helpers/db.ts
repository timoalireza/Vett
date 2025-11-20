import { db } from "../../db/client.js";
import { users, subscriptions, userUsage } from "../../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * Clean up test data
 * Note: This will fail if the test database doesn't exist
 */
export async function cleanupTestData() {
  try {
    // Delete in reverse order of dependencies
    await db.delete(userUsage);
    await db.delete(subscriptions);
    await db.delete(users);
  } catch (error: any) {
    // If database doesn't exist, that's okay - tests will handle it
    if (error?.message?.includes("does not exist")) {
      console.warn("⚠️  Test database not found. Create it with: createdb vett_test");
      throw error;
    }
    throw error;
  }
}

/**
 * Create a test user
 */
export async function createTestUser(externalId: string, email?: string) {
  const [user] = await db
    .insert(users)
    .values({
      externalId,
      email: email || `${externalId}@test.com`,
      displayName: "Test User"
    })
    .returning();

  return user;
}

/**
 * Get a test user by external ID
 */
export async function getTestUser(externalId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.externalId, externalId))
    .limit(1);

  return user || null;
}

/**
 * Delete a test user
 */
export async function deleteTestUser(externalId: string) {
  await db.delete(users).where(eq(users.externalId, externalId));
}

