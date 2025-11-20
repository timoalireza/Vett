import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

config({ path: join(rootDir, "apps/api/.env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in apps/api/.env");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL
  },
  verbose: true,
  strict: true
});

