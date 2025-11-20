import { db } from "../../db/client.js";

/**
 * Skip test if database is not available
 * Use this in tests that require database access
 */
export async function skipIfNoDb() {
  try {
    await db.execute("SELECT 1");
  } catch (error: any) {
    if (error?.message?.includes("does not exist") || error?.code === "ECONNREFUSED") {
      throw new Error("SKIP: Database not available");
    }
    throw error;
  }
}

