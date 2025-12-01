import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { instagramService } from "../services/instagram-service.js";
import { env } from "../env.js";
import crypto from "crypto";

interface InstagramWebhookBody {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text?: string;
        attachments?: Array<{
          type: string;
          payload: {
            url?: string;
          };
        }>;
      };
    }>;
  }>;
}

/**
 * Verify Instagram webhook signature
 */
function verifyInstagramWebhook(body: string, signature: string): boolean {
  if (!env.INSTAGRAM_APP_SECRET) {
    return false;
  }

  // Instagram uses HMAC-SHA256
  const expectedSignature = crypto
    .createHmac("sha256", env.INSTAGRAM_APP_SECRET)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * Register Instagram webhook route
 */
export async function registerInstagramWebhook(app: FastifyInstance) {
  // GET endpoint for webhook verification (Meta requires this)
  app.get(
    "/webhooks/instagram",
    {
      config: {
        skipAuth: true
      },
      schema: {
        description: "Instagram webhook verification endpoint",
        tags: ["webhooks"]
      }
    },
    async (request: FastifyRequest<{ Querystring: { "hub.mode": string; "hub.verify_token": string; "hub.challenge": string } }>, reply: FastifyReply) => {
      const mode = request.query["hub.mode"];
      const token = request.query["hub.verify_token"];
      const challenge = request.query["hub.challenge"];

      // Verify the webhook
      if (mode === "subscribe" && token === env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
        app.log.info("[Instagram] Webhook verified successfully");
        return reply.send(challenge);
      } else {
        app.log.warn("[Instagram] Webhook verification failed", { mode, token });
        return reply.code(403).send("Forbidden");
      }
    }
  );

  // POST endpoint for receiving webhook events
  app.post(
    "/webhooks/instagram",
    {
      config: {
        skipAuth: true
      },
      schema: {
        description: "Instagram webhook endpoint for DM events",
        tags: ["webhooks"]
      }
    },
    async (request: FastifyRequest<{ Body: InstagramWebhookBody }>, reply: FastifyReply) => {
      try {
        // Verify webhook signature if provided
        const signature = request.headers["x-hub-signature-256"] as string;
        if (signature) {
          const rawBody = JSON.stringify(request.body);
          const sig = signature.replace("sha256=", "");
          if (!verifyInstagramWebhook(rawBody, sig)) {
            app.log.warn("[Instagram] Webhook signature verification failed");
            return reply.code(401).send({ error: "Invalid signature" });
          }
        }

        const body = request.body;

        // Verify webhook object type
        if (body.object !== "instagram") {
          app.log.warn("[Instagram] Invalid webhook object type:", body.object);
          return reply.code(400).send({ error: "Invalid webhook object" });
        }

        // Process each entry
        for (const entry of body.entry || []) {
          for (const event of entry.messaging || []) {
            // Only process messages sent to our page
            if (event.recipient.id !== env.INSTAGRAM_PAGE_ID) {
              continue;
            }

            // Process message event
            if (event.message) {
              const message = {
                id: event.message.mid,
                from: {
                  id: event.sender.id
                },
                text: event.message.text,
                attachments: event.message.attachments
              };

              // Handle incoming DM asynchronously (don't block webhook response)
              instagramService.handleIncomingDM({ message }).catch((error) => {
                app.log.error("[Instagram] Error processing DM:", error);
              });
            }
          }
        }

        // Return 200 OK immediately to acknowledge receipt
        return reply.code(200).send({ received: true });
      } catch (error: any) {
        app.log.error("[Instagram] Webhook processing error:", error);

        // Still return 200 to prevent Instagram from retrying
        // Log the error for investigation
        return reply.code(200).send({
          received: true,
          error: error.message
        });
      }
    }
  );
}

