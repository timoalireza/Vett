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
      
      try {
        // Execute migration
        await pool.query(sql);
        console.log(`[Migrations] ✅ Completed ${file}`);
      } catch (error: any) {
        // If migration fails due to already applied changes, log and continue
        // Error codes that are safe to skip (indicate migration already applied):
        // 42P07 = duplicate_object (object already exists)
        // 42710 = duplicate_object (constraint/index already exists)
        // 2BP01 = cannot drop type because it has dependent objects (handled in migration logic, but skip if still occurs)
        // 
        // Error codes that should NOT be skipped (critical failures):
        // 22P02 = invalid input value for enum (data cannot be converted - indicates schema/data mismatch)
        // 
        // IMPORTANT: Only suppress errors with known safe error codes. Message-based checks
        // are only used as additional validation, never standalone, to prevent suppressing
        // critical errors that happen to mention "already exists" in their message.
        const isSafeToSkip = 
          error.code === "42P07" || // duplicate_object (object already exists)
          error.code === "42710" || // duplicate_object (constraint/index already exists)
          (error.code === "2BP01" && error.message?.includes("dependent objects")); // cannot drop type with dependent objects
        
        if (isSafeToSkip) {
          console.log(`[Migrations] ⚠️  ${file} already applied or skipped (${error.code || error.message?.substring(0, 50)})`);
        } else {
          // Critical error - log and throw
          console.error(`[Migrations] ❌ Error in ${file}:`, {
            code: error.code,
            message: error.message,
            detail: error.detail,
            hint: error.hint
          });
          throw error;
        }
      }
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

