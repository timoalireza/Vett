# Phone Number Authentication Support

This document explains how Vett handles users who register with phone numbers instead of email addresses.

## Overview

Vett now gracefully supports users who authenticate via phone number through Clerk. The system has been updated to:

1. Store phone numbers in the database alongside email addresses
2. Use phone numbers as fallback identifiers when email is not available
3. Generate appropriate display names for phone-only users
4. Track phone-only users in error monitoring (Sentry)

## Database Schema Changes

### Migration: `0014_add_phone_number_to_users.sql`

A new `phone_number` column has been added to the `users` table:

```sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number" text;
```

**Fields:**
- `phone_number` (text, nullable): Stores the user's phone number from Clerk
- `email` (text, nullable): Stores the user's email address from Clerk

Both fields are nullable, allowing users to authenticate with either email or phone number.

## Backend Changes

### 1. User Service (`apps/api/src/services/user-service.ts`)

**Updated Functions:**
- `getOrCreateUser()`: Now extracts and stores phone numbers from Clerk
- `syncUserFromClerk()`: Now syncs phone numbers alongside email addresses

**Display Name Fallback Chain:**
1. Full name (firstName + lastName)
2. Username
3. Email address
4. Phone number (last 4 digits): `"User 1234"`
5. External ID (last 8 characters): `"User abc12345"`

**Example:**
```typescript
// For a user with only a phone number
const displayName = "User 5678"; // Last 4 digits of phone

// For a user with email
const displayName = "user@example.com";

// For a user with full name
const displayName = "John Doe";
```

### 2. Authentication Plugin (`apps/api/src/plugins/auth.ts`)

**Sentry Context:**
- Now includes phone number in the username field when email is not available
- Helps with error tracking and debugging for phone-only users

**Example Sentry Context:**
```typescript
// Email user
Sentry.setUser({
  id: "user_123",
  email: "user@example.com",
  username: "user@example.com"
});

// Phone-only user
Sentry.setUser({
  id: "user_456",
  email: undefined,
  username: "+1234567890"
});
```

### 3. Database Schema (`apps/api/src/db/schema.ts`)

**Updated `users` table:**
```typescript
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: text("external_id").notNull().unique(),
  email: text("email"),                    // Nullable
  phoneNumber: text("phone_number"),       // NEW: Nullable
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
```

## Running the Migration

### Development (Local Database)

```bash
# Navigate to API directory
cd apps/api

# Run the migration
pnpm drizzle-kit push
```

### Production (Supabase)

The migration will be automatically applied when you deploy to Railway/Supabase. The migration uses `IF NOT EXISTS` to safely add the column without breaking existing deployments.

**Manual Migration (if needed):**
```bash
# Connect to your Supabase database
psql "postgresql://[user]:[password]@[host]:5432/postgres"

# Run the migration
\i apps/api/drizzle/0014_add_phone_number_to_users.sql
```

## Clerk Configuration

### Enabling Phone Authentication

1. Go to your Clerk Dashboard
2. Navigate to **User & Authentication** → **Email, Phone, Username**
3. Enable **Phone number** authentication
4. Configure SMS provider (Twilio, etc.)
5. Set phone number as required or optional based on your needs

### Recommended Settings

- **Phone number**: Optional (allows both email and phone users)
- **Email**: Optional (allows both email and phone users)
- **Username**: Optional (provides additional identifier)
- **Require at least one**: Enable (ensures users have at least one identifier)

## Testing

### Test Phone-Only User Flow

1. **Create a phone-only user in Clerk:**
   - Sign up with phone number only
   - Complete SMS verification
   - Get authentication token

2. **Make authenticated request:**
   ```bash
   curl -X POST http://localhost:4000/graphql \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
     -d '{"query": "mutation { submitAnalysis(input: { mediaType: \"text\", text: \"test claim\" }) { analysisId } }"}'
   ```

3. **Verify in database:**
   ```sql
   SELECT id, external_id, email, phone_number, display_name 
   FROM users 
   WHERE phone_number IS NOT NULL;
   ```

4. **Expected result:**
   - User created with `phone_number` populated
   - `email` is `NULL`
   - `display_name` is either username or `"User XXXX"` (last 4 digits)

### Test Email User Flow (Regression)

Ensure existing email-based authentication still works:

1. Sign up with email only
2. Verify user has `email` populated and `phone_number` is `NULL`
3. Confirm display name uses email or full name

## Backwards Compatibility

✅ **Fully backwards compatible**

- Existing users with email addresses are unaffected
- New column is nullable and doesn't require data migration
- All existing queries and resolvers continue to work
- Display name fallback chain maintains existing behavior for email users

## Privacy Considerations

### Data Storage

- Phone numbers are stored in plain text (same as email)
- Phone numbers are only visible to the user themselves
- Phone numbers are included in data export requests (GDPR compliance)
- Phone numbers are deleted when user deletes their account

### Data Deletion

When a user requests account deletion:
1. Phone number is deleted from `users` table
2. All associated analyses are anonymized
3. Privacy request is logged in `privacy_requests` table

## Monitoring

### Sentry

Phone-only users are now properly tracked in Sentry:
- User ID is always set
- Username falls back to phone number when email is not available
- Helps identify issues specific to phone-only users

### Logging

User service logs include phone number information:
```
[UserService] Creating user: externalId=user_123, email=null, phone=+1234567890
```

## Future Enhancements

Potential improvements for phone number support:

1. **Phone Number Formatting**: Normalize phone numbers to E.164 format
2. **GraphQL User Type**: Add User type to GraphQL schema if needed
3. **SMS Notifications**: Send analysis results via SMS for phone-only users
4. **Phone Number Verification**: Track verification status in database
5. **Multiple Phone Numbers**: Support multiple phone numbers per user

## Related Documentation

- [Clerk Authentication Setup](./AUTHENTICATION_SETUP.md)
- [Database Migrations](./DATABASE_MIGRATIONS.md)
- [Privacy & Data Deletion](./DATA_DELETION.md)
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md)

## Troubleshooting

### Issue: Phone number not being stored

**Solution:**
1. Verify Clerk user has phone number set
2. Check Clerk API response includes `phoneNumbers` array
3. Ensure migration has been run: `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_number';`

### Issue: Display name shows "User undefined"

**Solution:**
- This happens when phone number is null or empty
- Fallback will use external ID instead
- Check Clerk user data: `await clerk.users.getUser(userId)`

### Issue: Sentry not showing phone users

**Solution:**
- Verify auth plugin is extracting phone numbers
- Check Sentry user context in logs
- Ensure phone number is being passed to `Sentry.setUser()`

## Summary

The Vett platform now fully supports users who register with phone numbers instead of email addresses. The changes are:

✅ Database schema updated with `phone_number` column  
✅ User service extracts and stores phone numbers from Clerk  
✅ Display names gracefully fallback to phone identifiers  
✅ Sentry tracking includes phone-only users  
✅ Fully backwards compatible with existing email users  
✅ Migration ready for production deployment  

No breaking changes. No action required for existing users.


