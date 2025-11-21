# Step 1: Supabase Database - Quick Checklist

## ✅ Action Items

### 1. Verify Supabase Project
- [ ] Go to https://app.supabase.com
- [ ] Log in
- [ ] Check project status: **Active** (not paused)
- [ ] Verify plan: **Pro Plan** ($25/month) recommended

**If paused:** Click "Restore" and wait 1-2 minutes

---

### 2. Get Connection String

- [ ] Go to **Settings** → **Database**
- [ ] Find **Connection string** section
- [ ] Select **URI** tab
- [ ] **Copy Connection Pooling URL** (port 6543)

**Format:**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Save this!** You'll need it for Railway environment variables.

---

### 3. Run Migrations

- [ ] Go to **SQL Editor** in Supabase Dashboard
- [ ] Click **"New query"**
- [ ] Open `scripts/run-migrations-to-supabase.sql` from your project
- [ ] Copy entire file contents
- [ ] Paste into SQL Editor
- [ ] Click **"Run"** (or Cmd/Ctrl + Enter)
- [ ] Verify success message

---

### 4. Verify Tables Created

Run this in SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected tables:**
- users
- analyses
- claims
- sources
- analysis_sources
- explanation_steps
- collections
- collection_items
- feedback
- analysis_attachments
- subscriptions
- user_usage

---

### 5. Test Connection (Optional)

From your terminal:

```bash
# Replace with your actual connection string
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -c "SELECT version();"
```

Should return PostgreSQL version.

---

## 🎯 Next Step

Once all checkboxes are complete, proceed to:
**Step 2: Redis Setup** (Upstash or Railway Redis)

---

## 📝 Notes

- **Connection Pooling URL** (port 6543) is recommended for better performance
- **Never commit** connection strings to Git (already in `.gitignore`)
- **Save connection string** securely - you'll need it for Railway

---

**Detailed guide:** See `docs/STEP1_SUPABASE_SETUP.md`

