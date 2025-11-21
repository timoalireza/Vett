# Step 1: Supabase Database Setup

## Current Status Check

Let's verify your Supabase setup and get it production-ready.

---

## ✅ Checklist

- [ ] Supabase project created
- [ ] Pro plan activated (recommended for production)
- [ ] Connection string copied
- [ ] Migrations run successfully
- [ ] Tables verified

---

## Step-by-Step Instructions

### 1.1 Verify Supabase Project

1. Go to https://app.supabase.com
2. Log in to your account
3. Check if your project exists:
   - **Project Name**: Should be visible in dashboard
   - **Status**: Should be "Active" (not paused)
   - **Plan**: Should be Pro Plan ($25/month) for production

**If project is paused:**
- Click "Restore" or "Resume"
- Wait 1-2 minutes for database to come online

**If project doesn't exist:**
- Click "New Project"
- Fill in:
  - **Name**: Vett Production
  - **Database Password**: Generate strong password (save it!)
  - **Region**: Choose closest to your users
  - **Plan**: **Pro Plan ($25/month)** recommended

---

### 1.2 Get Connection String

1. In Supabase Dashboard, go to your project
2. Navigate to **Settings** → **Database**
3. Scroll to **Connection string** section
4. Select **URI** tab
5. **Important**: Use **Connection Pooling** URL (port 6543) for better performance

**Connection Pooling URL Format:**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Standard URL Format (alternative):**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Why Connection Pooling?**
- Better for serverless/server applications
- Handles connection limits better
- More efficient connection management
- Recommended for Railway/Render deployments

---

### 1.3 Run Migrations

You have two options:

#### Option A: SQL Editor (Recommended)

1. In Supabase Dashboard → **SQL Editor**
2. Click **"New query"**
3. Open `scripts/run-migrations-to-supabase.sql` from your project
4. Copy entire contents
5. Paste into SQL Editor
6. Click **"Run"** (or press Cmd/Ctrl + Enter)
7. Verify success message

#### Option B: Command Line (psql)

```bash
# Install psql if needed
# macOS: brew install postgresql@15

# Connect and run migrations
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -f scripts/run-migrations-to-supabase.sql
```

---

### 1.4 Verify Tables Created

Run this query in Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected Tables:**
- `users`
- `analyses`
- `claims`
- `sources`
- `analysis_sources`
- `explanation_steps`
- `collections`
- `collection_items`
- `feedback`
- `analysis_attachments`
- `subscriptions`
- `user_usage`

---

### 1.5 Verify Indexes

Run this query to check indexes:

```sql
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Expected Indexes:**
- `analyses_userId_idx`
- `analyses_createdAt_idx`
- `claims_analysisId_idx`
- `subscriptions_userId_idx`
- `user_usage_userId_idx`
- And more...

---

### 1.6 Test Connection

Test the connection from your local machine:

```bash
# Test connection (replace with your actual connection string)
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -c "SELECT version();"
```

Should return PostgreSQL version information.

---

## 🔧 Troubleshooting

### Database Paused

**Symptom**: Connection fails, project shows as "Paused"

**Solution**:
- Click "Restore" in Supabase Dashboard
- Wait 1-2 minutes
- Try connection again

### Connection String Wrong

**Symptom**: `getaddrinfo ENOTFOUND` error

**Solution**:
- Verify you copied the entire connection string
- Check project reference is correct
- Ensure password doesn't have special characters that need URL encoding

### Migrations Failed

**Symptom**: SQL errors when running migrations

**Solution**:
- Check if tables already exist (might have been run before)
- Verify SQL syntax is correct
- Check Supabase logs for detailed error messages

### Can't Find Password

**Symptom**: Don't remember database password

**Solution**:
- Go to Settings → Database → Reset database password
- Update connection string with new password
- **Note**: This will disconnect existing connections

---

## ✅ Verification Checklist

Before moving to Step 2 (Redis), verify:

- [ ] Supabase project is active
- [ ] Connection string copied (Connection Pooling URL)
- [ ] Migrations run successfully
- [ ] All tables exist
- [ ] Indexes created
- [ ] Connection test successful

---

## 📝 Save Your Connection String

**Important**: Save your connection string securely. You'll need it for:
- Railway environment variables
- Local testing
- Backup/restore operations

**Format to save:**
```
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Security Note**: Never commit this to Git (already in `.gitignore`)

---

## 🎯 Next Step

Once Supabase is verified, proceed to:
**Step 2: Redis Setup** (see `docs/QUICK_START_PRODUCTION.md`)

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs/guides/database
- Connection Pooling: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler

