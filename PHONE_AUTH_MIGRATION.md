# Phone Authentication Migration Guide

## Quick Start

This migration adds support for users who register with phone numbers instead of email addresses.

### What Changed?

1. ✅ Added `phone_number` column to `users` table
2. ✅ Updated user service to extract and store phone numbers from Clerk
3. ✅ Improved display name fallback logic for phone-only users
4. ✅ Enhanced Sentry tracking for phone-only users

### Running the Migration

#### Option 1: Automatic (Recommended)

The migration will run automatically on next deployment to Railway/Supabase.

#### Option 2: Manual (Local Development)

```bash
# Navigate to the API directory
cd apps/api

# Run Drizzle migrations
pnpm drizzle-kit push

# Or connect directly to your database
psql "postgresql://[user]:[password]@[host]:5432/postgres"
\i drizzle/0014_add_phone_number_to_users.sql
```

#### Option 3: Manual (Production)

```bash
# Connect to Supabase database
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Run the migration
\i apps/api/drizzle/0014_add_phone_number_to_users.sql

# Verify the column was added
\d users
```

### Verification

After running the migration, verify the changes:

```sql
-- Check that the column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'phone_number';

-- Expected output:
-- column_name  | data_type | is_nullable
-- phone_number | text      | YES
```

### Testing

1. **Test phone-only user creation:**
   - Create a user in Clerk with only a phone number
   - Authenticate and make a request
   - Verify user is created with `phone_number` populated

2. **Test email user (regression):**
   - Create a user with only email
   - Verify existing behavior still works

### Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Remove the phone_number column
ALTER TABLE users DROP COLUMN IF EXISTS phone_number;
```

**Note:** This is safe because the column is nullable and not used in any critical queries.

### Files Changed

- `apps/api/src/db/schema.ts` - Added `phoneNumber` field to users table
- `apps/api/src/services/user-service.ts` - Extract and store phone numbers
- `apps/api/src/plugins/auth.ts` - Include phone in Sentry context
- `apps/api/drizzle/0014_add_phone_number_to_users.sql` - Migration SQL
- `apps/api/drizzle/meta/_journal.json` - Migration metadata

### Documentation

For detailed information, see:
- [Phone Authentication Support](./docs/PHONE_AUTH_SUPPORT.md) - Complete documentation
- [Authentication Setup](./docs/AUTHENTICATION_SETUP.md) - Clerk configuration

### Support

If you encounter issues:
1. Check that Clerk is configured to support phone authentication
2. Verify the migration ran successfully
3. Check logs for any errors during user creation
4. See [Troubleshooting](./docs/PHONE_AUTH_SUPPORT.md#troubleshooting) section

---

**Status:** ✅ Ready for production deployment  
**Breaking Changes:** None  
**Backwards Compatible:** Yes  
**Action Required:** None (migration runs automatically)


