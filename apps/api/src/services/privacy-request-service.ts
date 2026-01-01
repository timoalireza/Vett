import { and, desc, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { privacyRequests } from "../db/schema.js";

export type PrivacyRequestType = "DATA_EXPORT" | "DATA_DELETION";
export type PrivacyRequestStatus = "PENDING" | "COMPLETED" | "CANCELLED";

class PrivacyRequestService {
  /**
   * Create a privacy request. If a request of the same type is already pending,
   * return it to keep the operation idempotent for the user.
   */
  async createOrReusePendingRequest(userId: string, type: PrivacyRequestType, note?: string | null) {
    const existing = await db.query.privacyRequests.findFirst({
      where: and(eq(privacyRequests.userId, userId), eq(privacyRequests.type, type), eq(privacyRequests.status, "PENDING")),
      orderBy: [desc(privacyRequests.createdAt)]
    });

    if (existing) return existing;

    const now = new Date();
    const [created] = await db
      .insert(privacyRequests)
      .values({
        userId,
        type,
        status: "PENDING",
        note: note ?? null,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return created;
  }
}

export const privacyRequestService = new PrivacyRequestService();




