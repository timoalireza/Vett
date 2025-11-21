# Fix Supabase Database Connection Error

## Error: `getaddrinfo ENOTFOUND db.rqliizpjhxiiulrckzgu.supabase.co`

This means your Supabase database hostname cannot be resolved. Here's how to fix it:

## Step 1: Check Supabase Dashboard

1. Go to https://app.supabase.com
2. Log in to your account
3. Check if your project exists:
   - **If project is paused**: Click "Restore" or "Resume"
   - **If project is deleted**: You'll need to create a new one
   - **If project exists**: Continue to Step 2

## Step 2: Get Fresh Connection String

1. In Supabase Dashboard, go to your project
2. Navigate to **Settings** → **Database**
3. Scroll to **Connection string** section
4. Select **URI** tab
5. Copy the connection string (it should look like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```

## Step 3: Update Your .env File

1. Open `apps/api/.env`
2. Update the `DATABASE_URL` line:
   ```bash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
3. Replace `[YOUR-PASSWORD]` with your actual database password
4. Replace `db.xxx.supabase.co` with your actual hostname

## Step 4: Use Connection Pooling (Recommended)

For better performance and connection management, use the **Connection Pooling** URL:

1. In Supabase Dashboard → Settings → Database
2. Find **Connection pooling** section
3. Copy the **Session mode** connection string (port 6543)
4. Update your `.env`:
   ```bash
   DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

## Step 5: Verify Connection

```bash
# Test the connection
cd apps/api
psql "$DATABASE_URL" -c "SELECT version();"
```

## Step 6: Restart Server

```bash
pnpm dev:api
```

## Common Issues

### Database Paused (Free Tier)

**Symptom**: DNS lookup fails, project shows as "Paused" in dashboard

**Solution**: 
- Click "Restore" in Supabase Dashboard
- Wait 1-2 minutes for database to come online
- Consider upgrading to Pro plan ($25/month) to avoid pausing

### Wrong Password

**Symptom**: Connection timeout or authentication error

**Solution**:
- Reset password in Supabase Dashboard → Settings → Database
- Update DATABASE_URL with new password

### Project Deleted

**Symptom**: Project doesn't exist in dashboard

**Solution**:
- Create new Supabase project
- Run migrations again (see `MIGRATION_INSTRUCTIONS.md`)
- Update DATABASE_URL

## Quick Test

After updating DATABASE_URL, test the connection:

```bash
curl http://localhost:4000/ready
```

Should return:
```json
{
  "status": "ready",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

---

**Still having issues?** Check `DATABASE_CONNECTION_TROUBLESHOOTING.md` for more details.

