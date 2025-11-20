import Fastify from "fastify";
import { buildServer } from "../../index.js";

let app: Awaited<ReturnType<typeof buildServer>> | null = null;

/**
 * Get or create a test Fastify instance
 */
export async function getTestServer() {
  if (!app) {
    app = await buildServer();
  }
  return app;
}

/**
 * Clean up test server
 */
export async function closeTestServer() {
  if (app) {
    await app.close();
    app = null;
  }
}

/**
 * Create a fresh test server instance
 */
export async function createTestServer() {
  const server = await buildServer();
  return server;
}

