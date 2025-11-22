# Fix Worker Database Password Authentication Error

**Error:** `password authentication failed for user "postgres"` (Error Code: 28P01)  
**Location:** Worker Service in Railway  
**Cause:** The `DATABASE_URL` in Railway Worker Service has an incorrect password

---

## 🔧 Quick Fix

The Worker service needs the same `DATABASE_URL` as the API service.

### Step 1: Get Correct Password from Supabase

1. **Go to Supabase Dashboard:** https://app.supabase.com
2. **Select your project**
3. **Settings** → **Database**
4. **Scroll to "Database Password" section**
5. **Click "Reset Database Password"** (if you don't know it)
   - Or use the existing password if you have it
6. **Copy the password** (you'll only see it once!)

### Step 2: Get Connection Pooling URL

1. **Still in Supabase Dashboard** → **Settings** → **Database**
2. **Find "Connection Pooling" section**
3. **Click "Transaction Pooler" tab**
4. **Click "URI" tab**
5. **Copy the connection string**

**Format should be:**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Step 3: Update DATABASE_URL in Railway Worker Service

1. **Railway Dashboard** → **Worker Service** → **Variables** tab
2. **Find `DATABASE_URL` variable**
3. **Click the variable** to edit it
4. **Replace the entire value** with the connection string from Step 2
   - Make sure the password in the URL matches the password from Step 1
5. **Click "Save"**

**Important:** 
- The Worker service needs the **same** `DATABASE_URL` as the API service
- The password in the connection string must match the Supabase database password
- Use Transaction Pooler URL (port 6543), not direct connection

### Step 4: Verify Connection String Format

The connection string should look like this:
```
postgresql://postgres.abcdefghijklmnop:YourPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Check:**
- ✅ Starts with `postgresql://`
- ✅ Username is `postgres.[PROJECT-REF]` (with dot, not colon)
- ✅ Password is correct (no spaces, matches Supabase)
- ✅ Hostname contains `pooler.supabase.com`
- ✅ Port is `6543` (Transaction Pooler)
- ✅ Database is `postgres`

### Step 5: Wait for Railway to Redeploy

1. **Railway will automatically redeploy** after you save the variable
2. **Wait 1-2 minutes** for deployment to complete
3. **Check Railway logs** to verify no errors

### Step 6: Verify Worker Startup

**Railway Dashboard** → **Worker Service** → **Logs**

Look for:
```
[Startup] ✅ Database connection successful
[Startup] ✅ Redis connection successful
[Startup] ✅ Worker ready and listening for jobs
```

---

## 🐛 Common Mistakes

### Mistake 1: Using Wrong Connection String Format

**Wrong:**
```
postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

**Correct:**
```
postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

**Differences:**
- Username: `postgres.xxx` (with dot) not `postgres` (with colon)
- Hostname: `pooler.supabase.com` not `db.xxx.supabase.co`
- Port: `6543` (pooler) not `5432` (direct)

### Mistake 2: Wrong Password

**Symptom:** Still getting "password authentication failed"

**Fix:**
- Reset password in Supabase Dashboard
- Copy new password
- Update `DATABASE_URL` in Railway Worker Service with new password
- Make sure password in URL matches exactly (no extra spaces)

### Mistake 3: Different DATABASE_URL for API and Worker

**Symptom:** API works but Worker fails (or vice versa)

**Fix:**
- Both services must use the **same** `DATABASE_URL`
- Copy the exact connection string from API service to Worker service
- Ensure both use Transaction Pooler URL (port 6543)

---

## ✅ Verification

After fixing, verify:

1. **Check Worker logs:**
   ```bash
   # Railway Dashboard → Worker Service → Logs
   # Should show:
   [Startup] ✅ Database connection successful
   ```

2. **Test worker processing:**
   ```bash
   # Submit a test analysis
   curl -X POST https://vett-api-production.up.railway.app/graphql \
     -H "Content-Type: application/json" \
     -d '{
       "query": "mutation { submitAnalysis(input: { text: \"test\", mediaType: \"text/plain\" }) { analysisId status } }"
     }'
   ```

3. **Check worker logs for:**
   - `Worker started processing job`
   - `Analysis job completed`

---

## 📋 Checklist

- [ ] Got correct password from Supabase Dashboard
- [ ] Copied Transaction Pooler URL (port 6543)
- [ ] Updated `DATABASE_URL` in Railway **Worker Service** (not just API service)
- [ ] Connection string format is correct
- [ ] Password in URL matches Supabase password exactly
- [ ] No extra spaces or newlines
- [ ] Railway Worker Service redeployed successfully
- [ ] Worker logs show `[Startup] ✅ Database connection successful`
- [ ] Worker logs show `[Startup] ✅ Worker ready and listening for jobs`

---

## 🆘 Still Having Issues?

1. **Double-check password:**
   - Reset password in Supabase again
   - Copy new password immediately
   - Update Railway Worker Service variable

2. **Verify connection string:**
   - Test connection string locally:
     ```bash
     psql "YOUR_CONNECTION_STRING" -c "SELECT version();"
     ```
   - If this works, the connection string is correct
   - If this fails, the password is wrong

3. **Check Railway logs:**
   - Look for the exact error message
   - Verify the connection string is being read correctly

4. **Ensure both services use same DATABASE_URL:**
   - API Service → Variables → `DATABASE_URL`
   - Worker Service → Variables → `DATABASE_URL`
   - Both should be identical

---

**Once the database password is correct, the worker will start successfully and process jobs!**

