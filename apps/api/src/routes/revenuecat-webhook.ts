import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleRevenueCatWebhook, verifyRevenueCatWebhook } from "../services/revenuecat-service.js";

interface RevenueCatWebhookBody {
  event: {
    id: string;
    type: string;
    app_user_id: string;
    [key: string]: unknown;
  };
}

/**
 * Register RevenueCat webhook route
 */
export async function registerRevenueCatWebhook(app: FastifyInstance) {
  // Register webhook route BEFORE auth plugin or exclude from auth
  // RevenueCat webhooks use their own authentication (webhook secret)
  app.post(
    "/webhooks/revenuecat",
    {
      // Exclude from Clerk authentication - RevenueCat uses webhook secret
      config: {
        skipAuth: true
      },
      schema: {
        description: "RevenueCat webhook endpoint for subscription events",
        tags: ["webhooks"],
        body: {
          type: "object",
          properties: {
            event: {
              type: "object",
              properties: {
                id: { type: "string" },
                type: { type: "string" },
                app_user_id: { type: "string" }
              },
              required: ["id", "type", "app_user_id"]
            }
          },
          required: ["event"]
        }
      }
    },
    async (request: FastifyRequest<{ Body: RevenueCatWebhookBody }>, reply: FastifyReply) => {
      try {
        // Get signature from Authorization header
        const authHeader = request.headers.authorization;
        const signature = authHeader?.replace("Bearer ", "") || "";

        // Get raw body for signature verification
        const rawBody = JSON.stringify(request.body);

        // Verify webhook signature
        if (!verifyRevenueCatWebhook(rawBody, signature)) {
          app.log.warn("[RevenueCat] Webhook signature verification failed");
          return reply.code(401).send({ error: "Invalid signature" });
        }

        // Process webhook event
        await handleRevenueCatWebhook(request.body as any);

        // Return 200 OK to acknowledge receipt
        return reply.code(200).send({ received: true });
      } catch (error: any) {
        app.log.error("[RevenueCat] Webhook processing error:", error);
        
        // Still return 200 to prevent RevenueCat from retrying
        // Log the error for investigation
        return reply.code(200).send({ 
          received: true, 
          error: error.message 
        });
      }
    }
  );
}

