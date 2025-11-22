# Fix Database Password Authentication Error

**Error:** `password authentication failed for user "postgres"`  
**Cause:** The `DATABASE_URL` in Railway has an incorrect password

---

## 🔧 Step-by-Step Fix

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

**Important:** Make sure you're copying the **Transaction Pooler** URL (port 6543), not the direct connection URL.

### Step 3: Update DATABASE_URL in Railway

1. **Railway Dashboard** → **API Service** → **Variables** tab
2. **Find `DATABASE_URL` variable**
3. **Click the variable** to edit it
4. **Replace the entire value** with the new connection string from Step 2
   - Make sure the password in the URL matches the password from Step 1
5. **Click "Save"**

**Important:** 
- The password in the connection string must match the Supabase database password
- The format should be: `postgresql://postgres.[PROJECT-REF]:[CORRECT-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
- Make sure there are no extra spaces or newlines

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

### Step 6: Test Connection

```bash
# Test /ready endpoint
curl https://vett-api-production.up.railway.app/ready

# Should show:
# {
#   "status": "ready",
#   "checks": {
#     "database": true,
#     "redis": true
#   }
# }
```

### Step 7: Test submitAnalysis Mutation

```bash
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { submitAnalysis(input: { text: \"test\", mediaType: \"text/plain\" }) { analysisId status } }"
  }'
```

**Should return:**
```json
{
  "data": {
    "submitAnalysis": {
      "analysisId": "...",
      "status": "QUEUED"
    }
  }
}
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
- Update `DATABASE_URL` with new password
- Make sure password in URL matches exactly (no extra spaces)

### Mistake 3: Copy-Paste Errors

**Symptom:** Connection string looks correct but still fails

**Fix:**
- Check for extra spaces at beginning/end
- Check for newlines in the middle
- Copy entire string again from Supabase
- Paste directly into Railway (don't modify manually)

---

## ✅ Verification Checklist

- [ ] Got correct password from Supabase Dashboard
- [ ] Copied Transaction Pooler URL (port 6543)
- [ ] Updated `DATABASE_URL` in Railway with correct password
- [ ] Connection string format is correct
- [ ] No extra spaces or newlines
- [ ] Railway redeployed successfully
- [ ] `/ready` endpoint shows `database: true`
- [ ] `submitAnalysis` mutation works

---

## 🆘 Still Having Issues?

If password authentication still fails after following these steps:

1. **Double-check password:**
   - Reset password in Supabase again
   - Copy new password immediately
   - Update Railway variable

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

4. **Contact Supabase Support:**
   - If password keeps failing, there may be an account issue

---

**Once the password is correct, the "password authentication failed" error will be resolved and `submitAnalysis` will work!**

