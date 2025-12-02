import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { readFile } from "fs/promises";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Find the docs directory by checking multiple possible locations
 * Works in both development and production (Railway)
 */
function findDocsPath(filename: string): string {
  // Try multiple possible locations
  const possiblePaths = [
    // In production (Docker): docs folder is copied to /app/docs
    join(process.cwd(), "docs", filename),
    // From source: apps/api/src/routes -> go up 4 levels to repo root
    join(__dirname, "../../../../docs", filename),
    // From dist: apps/api/dist/routes -> go up 4 levels to repo root
    join(__dirname, "../../../../docs", filename),
    // From apps/api (if cwd is apps/api)
    join(process.cwd(), "../docs", filename),
    // Absolute path fallback
    resolve(process.cwd(), "docs", filename)
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // If none found, return the first path (will throw error with helpful message)
  return possiblePaths[0];
}

/**
 * Register legal document routes (Terms of Service and Privacy Policy)
 */
export async function registerLegalRoutes(app: FastifyInstance) {
  // Serve Terms of Service
  app.get(
    "/terms",
    {
      config: {
        skipAuth: true // Public access
      },
      schema: {
        description: "Terms of Service document",
        tags: ["legal"]
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Read Terms of Service markdown file
        const docsPath = findDocsPath("TERMS_OF_SERVICE.md");
        const content = await readFile(docsPath, "utf-8");

        // Return as markdown with proper content type
        return reply
          .type("text/markdown; charset=utf-8")
          .header("Cache-Control", "public, max-age=3600") // Cache for 1 hour
          .send(content);
      } catch (error: any) {
        app.log.error({ error }, "Failed to read Terms of Service");
        
        // Return error response
        if (error.code === "ENOENT") {
          return reply.code(404).send({
            error: "Terms of Service not found",
            message: "The Terms of Service document is not available."
          });
        }
        
        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to retrieve Terms of Service."
        });
      }
    }
  );

  // Serve Privacy Policy
  app.get(
    "/privacy",
    {
      config: {
        skipAuth: true // Public access
      },
      schema: {
        description: "Privacy Policy document",
        tags: ["legal"]
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Read Privacy Policy markdown file
        const docsPath = findDocsPath("PRIVACY_POLICY.md");
        const content = await readFile(docsPath, "utf-8");

        // Return as markdown with proper content type
        return reply
          .type("text/markdown; charset=utf-8")
          .header("Cache-Control", "public, max-age=3600") // Cache for 1 hour
          .send(content);
      } catch (error: any) {
        app.log.error({ error }, "Failed to read Privacy Policy");
        
        // Return error response
        if (error.code === "ENOENT") {
          return reply.code(404).send({
            error: "Privacy Policy not found",
            message: "The Privacy Policy document is not available."
          });
        }
        
        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to retrieve Privacy Policy."
        });
      }
    }
  );

  // Optional: Serve Terms of Service as HTML (if you want to convert markdown to HTML)
  // This would require a markdown-to-HTML library like 'marked' or 'markdown-it'
  app.get(
    "/terms.html",
    {
      config: {
        skipAuth: true
      },
      schema: {
        description: "Terms of Service document (HTML format)",
        tags: ["legal"]
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const docsPath = findDocsPath("TERMS_OF_SERVICE.md");
        const markdown = await readFile(docsPath, "utf-8");
        
        // For now, return markdown wrapped in basic HTML
        // In the future, you can use a markdown parser to convert to HTML
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service - Vett</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    h3 { color: #777; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <pre style="white-space: pre-wrap; font-family: inherit;">${markdown}</pre>
</body>
</html>`;

        return reply
          .type("text/html; charset=utf-8")
          .header("Cache-Control", "public, max-age=3600")
          .send(html);
      } catch (error: any) {
        app.log.error({ error }, "Failed to read Terms of Service");
        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to retrieve Terms of Service."
        });
      }
    }
  );

  // Optional: Serve Privacy Policy as HTML
  app.get(
    "/privacy.html",
    {
      config: {
        skipAuth: true
      },
      schema: {
        description: "Privacy Policy document (HTML format)",
        tags: ["legal"]
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const docsPath = findDocsPath("PRIVACY_POLICY.md");
        const markdown = await readFile(docsPath, "utf-8");
        
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Vett</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    h3 { color: #777; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <pre style="white-space: pre-wrap; font-family: inherit;">${markdown}</pre>
</body>
</html>`;

        return reply
          .type("text/html; charset=utf-8")
          .header("Cache-Control", "public, max-age=3600")
          .send(html);
      } catch (error: any) {
        app.log.error({ error }, "Failed to read Privacy Policy");
        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to retrieve Privacy Policy."
        });
      }
    }
  );
}

