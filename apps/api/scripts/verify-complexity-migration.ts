import { Pool } from "pg";
import { config } from "dotenv";
import { resolve } from "path";

// Load env file
config({ path: resolve(process.cwd(), "apps/api/.env") });

async function verifyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'analyses' 
      AND column_name IN ('complexity', 'title')
      ORDER BY column_name
    `);

    console.log("✅ Migration verification:");
    if (result.rows.length === 0) {
      console.log("❌ Columns 'complexity' and 'title' not found!");
    } else {
      result.rows.forEach((row) => {
        console.log(`  ✓ ${row.column_name}: ${row.data_type}`);
      });
      
      if (result.rows.length === 2) {
        console.log("\n✅ Both columns exist! Migration successful.");
      } else {
        console.log(`\n⚠️  Only ${result.rows.length} of 2 columns found.`);
      }
    }
  } catch (error) {
    console.error("❌ Error verifying migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyMigration();

