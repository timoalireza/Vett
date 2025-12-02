import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { instagramService } from "../services/instagram-service.js";
import { env } from "../env.js";
import crypto from "crypto";

interface InstagramWebhookBody {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging?: Array<{
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
    // Post-related webhook events
    changes?: Array<{
      field: string;
      value: {
        media_id?: string;
        comment_id?: string;
        text?: string;
        from?: {
          id: string;
          username?: string;
        };
        media?: {
          id: string;
          media_type?: string;
          media_url?: string;
          permalink?: string;
          caption?: string;
          timestamp?: string;
        };
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
  // Configure content parser to preserve raw body for signature verification
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      // Store raw body for signature verification
      (req as any).rawBody = body as string;
      // Parse JSON
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

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
        description: "Instagram webhook endpoint for DM and post events",
        tags: ["webhooks"]
      }
    },
    async (request: FastifyRequest<{ Body: InstagramWebhookBody }>, reply: FastifyReply) => {
      try {
        // Verify webhook signature if provided
        const signature = request.headers["x-hub-signature-256"] as string;
        if (signature && env.INSTAGRAM_APP_SECRET) {
          // Use raw body if available (from content parser), otherwise stringify parsed body
          const rawBody = (request as any).rawBody || JSON.stringify(request.body);
          const sig = signature.replace("sha256=", "");
          if (!verifyInstagramWebhook(rawBody, sig)) {
            app.log.warn("[Instagram] Webhook signature verification failed");
            // In development, log but don't fail (allows testing without proper signature)
            if (env.NODE_ENV === "production") {
              return reply.code(401).send({ error: "Invalid signature" });
            } else {
              app.log.warn("[Instagram] Signature verification failed but continuing in development mode");
            }
          } else {
            app.log.info("[Instagram] Webhook signature verified successfully");
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
          // Process Direct Messages
          if (entry.messaging) {
            for (const event of entry.messaging) {
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

          // Process Post-related events (mentions, comments, etc.)
          if (entry.changes) {
            for (const change of entry.changes) {
              // Handle post mentions (when someone tags @vettapp in a post)
              if (change.field === "mentions" && change.value.media) {
                const media = change.value.media;
                const from = change.value.from;
                
                if (from && media) {
                  app.log.info("[Instagram] Post mention detected", {
                    mediaId: media.id,
                    from: from.id,
                    username: from.username
                  });

                  // Handle post mention asynchronously
                  instagramService.handlePostMention({
                    mediaId: media.id,
                    mediaUrl: media.media_url,
                    permalink: media.permalink,
                    caption: media.caption,
                    mediaType: media.media_type,
                    from: {
                      id: from.id,
                      username: from.username
                    }
                  }).catch((error) => {
                    app.log.error("[Instagram] Error processing post mention:", error);
                  });
                }
              }

              // Handle comments on posts (when someone comments on a post mentioning @vettapp)
              if (change.field === "comments" && change.value.comment_id) {
                const comment = change.value;
                
                app.log.info("[Instagram] Comment detected", {
                  commentId: comment.comment_id,
                  text: comment.text,
                  from: comment.from?.id
                });

                // Handle comment asynchronously
                instagramService.handleComment({
                  commentId: comment.comment_id,
                  text: comment.text,
                  mediaId: comment.media?.id,
                  from: comment.from ? {
                    id: comment.from.id,
                    username: comment.from.username
                  } : undefined
                }).catch((error) => {
                  app.log.error("[Instagram] Error processing comment:", error);
                });
              }
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

