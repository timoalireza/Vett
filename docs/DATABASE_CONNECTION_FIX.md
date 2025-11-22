# Database Connection Issue - Troubleshooting

**Error:** "An error occurred while processing your request" when submitting analysis  
**Root Cause:** Database connection is failing (`/ready` endpoint shows `database: false`)

---

## 🔍 Current Status

Check the `/ready` endpoint:
```bash
curl https://vett-api-production.up.railway.app/ready
```

**Expected:**
```json
{
  "status": "ready",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

**Current (Issue):**
```json
{
  "status": "unhealthy",
  "checks": {
    "database": false,
    "redis": true
  }
}
```

---

## 🔧 Fix Steps

### Step 1: Verify DATABASE_URL in Railway

1. **Railway Dashboard** → **API Service** → **Variables** tab
2. **Check `DATABASE_URL` variable:**
   - ✅ Should exist
   - ✅ Should not be empty
   - ✅ Should start with `postgresql://`
   - ✅ Should use Transaction Pooler (port 6543)

**Correct Format:**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Step 2: Test Database Connection

**From Supabase Dashboard:**
1. Go to **Settings** → **Database**
2. Click **"Connection Pooling"** tab
3. Copy **Transaction Pooler** URI
4. Test connection:
   ```bash
   psql "YOUR_CONNECTION_STRING" -c "SELECT version();"
   ```

### Step 3: Check Railway Logs

**Railway Dashboard** → **API Service** → **Logs**

Look for database connection errors:
- `connection timeout`
- `ECONNREFUSED`
- `getaddrinfo ENOTFOUND`
- `password authentication failed`

### Step 4: Verify Supabase Project Status

1. **Supabase Dashboard** → Check project status
2. **If paused:** Click "Restore" or "Resume"
3. **Wait 1-2 minutes** for database to come online
4. **Check connection pooling is enabled**

---

## 🐛 Common Issues

### Issue 1: Wrong Connection String Format

**Symptom:** Connection timeout or authentication error

**Fix:**
- Use **Transaction Pooler** URL (port 6543), not direct connection
- Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
- Get from: Supabase Dashboard → Settings → Database → Connection Pooling → Transaction Pooler → URI

### Issue 2: Supabase Project Paused

**Symptom:** `getaddrinfo ENOTFOUND` error

**Fix:**
- Go to Supabase Dashboard
- Click "Restore" or "Resume" on paused project
- Wait for database to come online

### Issue 3: Wrong Password

**Symptom:** `password authentication failed`

**Fix:**
- Reset password in Supabase Dashboard → Settings → Database
- Update `DATABASE_URL` in Railway with new password

### Issue 4: IP Whitelist (Rare)

**Symptom:** Connection refused

**Fix:**
- If using Transaction Pooler (port 6543), IP whitelist is NOT needed
- If using Direct Connection (port 5432), may need IP whitelist
- **Recommendation:** Use Transaction Pooler to avoid IP issues

---

## ✅ Verification

After fixing, verify:

1. **Check `/ready` endpoint:**
   ```bash
   curl https://vett-api-production.up.railway.app/ready
   ```
   Should show `"database": true`

2. **Test `submitAnalysis` mutation:**
   ```bash
   curl -X POST https://vett-api-production.up.railway.app/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"mutation { submitAnalysis(input: { text: \"test\", mediaType: \"text/plain\" }) { analysisId status } }"}'
   ```
   Should return `analysisId` and `status: "QUEUED"`

---

## 📋 Checklist

- [ ] `DATABASE_URL` is set in Railway (API Service → Variables)
- [ ] `DATABASE_URL` uses Transaction Pooler (port 6543)
- [ ] `DATABASE_URL` format is correct
- [ ] Supabase project is active (not paused)
- [ ] Connection pooling is enabled in Supabase
- [ ] Railway logs show no database errors
- [ ] `/ready` endpoint shows `database: true`
- [ ] `submitAnalysis` mutation works

---

**Once database connection is fixed, the "An error occurred while processing your request" error should be resolved.**

