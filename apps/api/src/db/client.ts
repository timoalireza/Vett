import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import { env } from "../env.js";
import * as schema from "./schema.js";

// Connection pool configuration
// Adjust based on your database provider and traffic
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Connection pool settings (can be overridden via env vars)
  max: env.DB_POOL_MAX ?? (env.NODE_ENV === "production" ? 20 : 10), // Maximum connections in pool
  min: env.DB_POOL_MIN ?? (env.NODE_ENV === "production" ? 5 : 2), // Minimum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout after 10s (increased for cloud databases)
  // SSL configuration (required for most cloud providers)
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// Handle pool errors gracefully
pool.on("error", (err) => {
  console.error("Unexpected database pool error", err);
  // Don't exit in production - let the app handle it
  if (env.NODE_ENV !== "production") {
    process.exit(-1);
  }
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;
export type Schema = typeof schema;

