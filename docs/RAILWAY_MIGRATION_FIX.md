# Railway Migration Fix: Complexity Column

## Problem

The API is failing with the error:
```
column "complexity" of relation "analyses" does not exist
```

This happens because the migration `0009_add_complexity_to_analyses.sql` hasn't been applied to the Railway production database.

## Solution

### Option 1: Run Migration via Railway CLI (Recommended)

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Connect to your Railway project**:
   ```bash
   railway link
   ```

3. **Run the migration**:
   ```bash
   # Set DATABASE_URL from Railway
   railway variables
   
   # Run migration
   railway run psql $DATABASE_URL -f apps/api/drizzle/0009_add_complexity_to_analyses.sql
   ```

### Option 2: Run Migration via Railway Dashboard

1. Go to your Railway project dashboard
2. Click on your **API service**
3. Go to **Settings** → **Variables**
4. Copy the `DATABASE_URL` value
5. Run locally:
   ```bash
   export DATABASE_URL="postgresql://..."  # From Railway
   psql "$DATABASE_URL" -f apps/api/drizzle/0009_add_complexity_to_analyses.sql
   ```

### Option 3: Use Railway SQL Editor

1. Go to Railway → Your PostgreSQL service
2. Click **"Query"** tab
3. Copy and paste the contents of `apps/api/drizzle/0009_add_complexity_to_analyses.sql`
4. Click **"Run"**

### Option 4: Run via Script

```bash
# Make script executable
chmod +x apps/api/scripts/apply-complexity-migration.sh

# Set DATABASE_URL
export DATABASE_URL="postgresql://..."  # From Railway

# Run script
./apps/api/scripts/apply-complexity-migration.sh
```

## Verify Migration

After running the migration, verify it worked:

```sql
-- Check that complexity column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'analyses' 
AND column_name IN ('complexity', 'title');

-- Should return:
-- complexity | USER-DEFINED (enum)
-- title      | text
```

## What the Migration Does

The migration `0009_add_complexity_to_analyses.sql`:
1. Creates the `analysis_complexity` enum type (`simple`, `medium`, `complex`)
2. Adds the `complexity` column to the `analyses` table
3. Adds the `title` column to the `analyses` table

The migration is **idempotent** - it's safe to run multiple times. It checks if columns/enums exist before creating them.

## Prevention

To prevent this in the future:

1. **Run migrations as part of deployment**:
   - Add a migration step to your Railway deployment
   - Or use Railway's post-deploy hooks

2. **Use automated migration runner**:
   - The codebase includes `apps/api/src/utils/run-migrations.ts`
   - Consider calling this on startup (with proper safeguards)

3. **Test migrations locally first**:
   ```bash
   pnpm --filter vett-api db:migrate
   ```

## Related Files

- Migration file: `apps/api/drizzle/0009_add_complexity_to_analyses.sql`
- Schema definition: `apps/api/src/db/schema.ts` (line 84)
- Migration runner: `apps/api/src/utils/run-migrations.ts`

