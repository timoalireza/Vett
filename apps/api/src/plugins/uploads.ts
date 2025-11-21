import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import fp from "fastify-plugin";

import { env } from "../env.js";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// Allowed MIME types for uploads
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown"
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".txt", ".md"];

function resolveUploadDirectory(): string {
  if (env.UPLOADS_DIR) {
    return path.isAbsolute(env.UPLOADS_DIR)
      ? env.UPLOADS_DIR
      : path.resolve(process.cwd(), env.UPLOADS_DIR);
  }

  // In production, use /app/uploads (created in Dockerfile with proper permissions)
  // In development, use apps/api/uploads inside the repo
  if (env.NODE_ENV === "production") {
    return "/app/uploads";
  }

  // Default to apps/api/uploads inside the repo
  return path.resolve(process.cwd(), "apps/api/uploads");
}

function buildBaseUrl(request: any): string {
  if (env.PUBLIC_UPLOAD_BASE_URL) {
    return env.PUBLIC_UPLOAD_BASE_URL.replace(/\/$/, "");
  }

  const forwardedProto = request.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(",")[0] ?? request.protocol;

  const forwardedHost = request.headers["x-forwarded-host"];
  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost?.split(",")[0] ?? request.headers.host;

  if (!host) {
    return "/uploads";
  }

  return `${protocol}://${host}/uploads`;
}

export interface UploadResponse {
  id: string;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  size: number;
  url: string;
}

export default fp(async (fastify) => {
  const uploadDir = resolveUploadDirectory();
  // Create directory if it doesn't exist (with error handling for permission issues)
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error: any) {
    // If directory creation fails due to permissions, log warning but continue
    // The directory should be created in Dockerfile for production
    if (error.code === "EACCES" || error.code === "EPERM") {
      fastify.log.warn(
        { uploadDir, error: error.message },
        "Could not create uploads directory (permission denied). Directory should be pre-created in Dockerfile."
      );
    } else {
      // Re-throw other errors
      throw error;
    }
  }

  await fastify.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
      files: 1
    }
  });

  await fastify.register(fastifyStatic, {
    root: uploadDir,
    prefix: "/uploads/",
    decorateReply: false
  });

  fastify.post("/uploads", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "File payload is required" });
    }

    if (file.file.truncated) {
      file.file.resume();
      return reply.code(413).send({ error: "Uploaded file exceeds size limit of 20MB" });
    }

    // Validate file type
    const mimeType = file.mimetype;
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return reply.code(400).send({ 
        error: "File type not allowed",
        allowedTypes: ALLOWED_MIME_TYPES
      });
    }

    // Validate file extension
    const extension = path.extname(file.filename ?? "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return reply.code(400).send({ 
        error: "File extension not allowed",
        allowedExtensions: ALLOWED_EXTENSIONS
      });
    }

    // Sanitize filename
    const sanitizedExtension = extension.slice(0, 16); // Limit extension length
    const storedFilename = `${randomUUID()}${sanitizedExtension}`;
    const filePath = path.join(uploadDir, storedFilename);

    try {
      await pipeline(file.file, createWriteStream(filePath));
    } catch (error) {
      await fs.rm(filePath, { force: true });
      fastify.log.error({ error }, "Failed to store uploaded file");
      return reply.code(500).send({ error: "Unable to store uploaded file" });
    }

    const stats = await fs.stat(filePath);
    const baseUrl = buildBaseUrl(request);

    reply.code(201);
    return {
      id: storedFilename,
      originalFilename: file.filename,
      storedFilename,
      mimeType: file.mimetype,
      size: stats.size,
      url: `${baseUrl}/${storedFilename}`
    };
  });
});




