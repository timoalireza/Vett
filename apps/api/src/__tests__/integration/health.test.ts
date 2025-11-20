import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, closeTestServer } from "../helpers/test-server.js";

describe("Health Endpoints", () => {
  let server: Awaited<ReturnType<typeof createTestServer>>;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await closeTestServer();
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/health"
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("ok");
      expect(body.uptime).toBeGreaterThanOrEqual(0);
      expect(body.timestamp).toBeDefined();
    });
  });

  describe("GET /ready", () => {
    it("should return readiness status", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/ready"
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("ready");
      expect(body.checks).toBeDefined();
      expect(body.checks.database).toBe(true);
      expect(body.checks.redis).toBe(true);
    });
  });

  describe("GET /live", () => {
    it("should return liveness status", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/live"
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("alive");
      expect(body.timestamp).toBeDefined();
    });
  });

  describe("GET /metrics", () => {
    it("should return metrics", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/metrics"
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.requests).toBeDefined();
      expect(body.responseTime).toBeDefined();
      expect(body.memory).toBeDefined();
    });
  });
});

