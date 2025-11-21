# Railway Environment Variables Verification

## Quick Checklist

After deploying, check the Railway logs for these debug messages:

### ✅ Success Indicators:
```
🔍 Environment check (production):
  NODE_ENV: production
  PORT: 8080
  DATABASE_URL: ✅ Set
  REDIS_URL: ✅ Set
  CLERK_SECRET_KEY: ✅ Set
```

### ❌ Common Issues:

#### 1. Variables Missing
```
DATABASE_URL: ❌ Missing
REDIS_URL: ❌ Missing
CLERK_SECRET_KEY: ❌ Missing
```
**Fix**: Variables are not set in Railway. Go to Service → Variables tab and add them.

#### 2. Variables Empty
```
DATABASE_URL: ⚠️ Empty string
```
**Fix**: Variable exists but is empty. Delete and re-add the variable with the correct value.

#### 3. Variables Set at Wrong Level
**Fix**: Environment variables must be set at the **Service level**, not the Project level.

## How to Set Variables in Railway

### Step 1: Navigate to Your Service
1. Go to Railway Dashboard
2. Select your project
3. Click on the **API** service (not the project)

### Step 2: Add Variables
1. Click on the **Variables** tab
2. Click **+ New Variable**
3. Add each variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Your Supabase connection string
   - **Type**: Plain Text (not Secret if you want to see it in logs)
4. Repeat for `REDIS_URL` and `CLERK_SECRET_KEY`

### Step 3: Verify Variable Names
**Critical**: Variable names are **case-sensitive** and must match exactly:
- ✅ `DATABASE_URL` (correct)
- ❌ `database_url` (wrong)
- ❌ `DATABASE_URL_` (wrong - trailing underscore)
- ❌ `DATABASE-URL` (wrong - hyphen instead of underscore)

### Step 4: Check Variable Values
The debug logs will show previews:
```
DATABASE_URL value preview: postgresql://postgres.rqliizpjhxiiulrckzgu:oEP4...
REDIS_URL value preview: redis://default:AZrBAAIncDI4NTFhNTljYmI3MmE0YjI1...
CLERK_SECRET_KEY value preview: sk_live_abc123xyz...
```

## Common Mistakes

### Mistake 1: Setting at Project Level
- ❌ Project → Variables (wrong)
- ✅ Service → Variables (correct)

### Mistake 2: Typos in Variable Names
- Check the logs for "All env keys containing DATABASE/REDIS/CLERK"
- Look for similar names like `DATABASE_URL_OLD` or `REDIS_URL_BACKUP`

### Mistake 3: Using Wrong Connection String
- **DATABASE_URL**: Must use Supabase **Connection Pooling URL**, not direct connection
- **REDIS_URL**: Must use Upstash **Redis URL**, not REST API URL

### Mistake 4: Copy-Paste Errors
- Check for extra spaces or newlines
- Verify the entire string was copied

## Testing After Fix

1. Railway will automatically redeploy after you add/modify variables
2. Check the logs for the debug output
3. Look for:
   - ✅ All three variables showing "✅ Set"
   - ✅ Value previews showing correct prefixes
   - ✅ No validation errors

## Still Having Issues?

If variables are still not working:

1. **Check Railway Logs**: Look for the debug output showing what Railway actually provided
2. **Verify Service**: Make sure you're setting variables on the correct service (API, not Worker)
3. **Check Variable Scope**: Some Railway plans have limits on environment variables
4. **Contact Railway Support**: If variables are set correctly but still not accessible

## Example Correct Setup

```
Service: API
Variables:
  DATABASE_URL = postgresql://postgres.rqliizpjhxiiulrckzgu:oEP4JtGshGqDuiU6@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
  REDIS_URL = redis://default:AZrBAAIncDI4NTFhNTljYmI3MmE0YjI1OWZhOGMzYzJlM2Q1NGU4M3AyMzk2MTc@modern-swan-39617.upstash.io:6379
  CLERK_SECRET_KEY = sk_live_abc123xyz...
```

