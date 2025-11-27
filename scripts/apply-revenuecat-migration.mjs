#!/usr/bin/env node
/**
 * Safe migration script to add RevenueCat fields to subscriptions table
 * This script only adds the new columns without touching existing data
 */

import { Pool } from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";

const rootDir = dirname(fileURLToPath(import.meta.url));
const envPath = join(rootDir, "../apps/api/.env");

// Load environment variables
config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not defined in apps/api/.env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log("🔄 Applying RevenueCat migration...");
    
    // Check if columns already exist
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions' 
      AND column_name IN ('revenuecat_customer_id', 'revenuecat_subscription_id')
    `;
    
    const existing = await client.query(checkQuery);
    const existingColumns = existing.rows.map(r => r.column_name);
    
    if (existingColumns.includes("revenuecat_customer_id") && 
        existingColumns.includes("revenuecat_subscription_id")) {
      console.log("✅ RevenueCat columns already exist, skipping migration");
      return;
    }
    
    // Apply migration
    await client.query("BEGIN");
    
    if (!existingColumns.includes("revenuecat_customer_id")) {
      console.log("  ➕ Adding revenuecat_customer_id column...");
      await client.query(`
        ALTER TABLE "subscriptions" 
        ADD COLUMN "revenuecat_customer_id" text
      `);
    }
    
    if (!existingColumns.includes("revenuecat_subscription_id")) {
      console.log("  ➕ Adding revenuecat_subscription_id column...");
      await client.query(`
        ALTER TABLE "subscriptions" 
        ADD COLUMN "revenuecat_subscription_id" text
      `);
    }
    
    await client.query("COMMIT");
    console.log("✅ Migration applied successfully!");
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

applyMigration()
  .then(() => {
    console.log("✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });

