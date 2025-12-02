/**
 * Migration runner utility
 * Runs SQL migrations from the drizzle directory
 */

import { readFile, readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { env } from "../env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
  });

  try {
    // Get migration files from drizzle directory
    const drizzleDir = join(__dirname, "../../drizzle");
    const files = await readdir(drizzleDir);
    const migrationFiles = files
      .filter((f) => f.endsWith(".sql") && f.startsWith("0"))
      .sort(); // Sort to run in order

    console.log(`[Migrations] Found ${migrationFiles.length} migration file(s)`);

    for (const file of migrationFiles) {
      const filePath = join(drizzleDir, file);
      const sql = await readFile(filePath, "utf-8");

      console.log(`[Migrations] Running ${file}...`);
      
      // Execute migration
      await pool.query(sql);
      
      console.log(`[Migrations] ✅ Completed ${file}`);
    }

    console.log("[Migrations] All migrations completed successfully");
  } catch (error: any) {
    console.error("[Migrations] Error running migrations:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// If run directly, execute migrations
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log("[Migrations] Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("[Migrations] Migration script failed:", error);
      process.exit(1);
    });
}

