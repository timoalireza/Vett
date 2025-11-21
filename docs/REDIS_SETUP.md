# Redis Setup for Production

## Overview

Vett uses Redis for:
- **Job Queues** (BullMQ background processing)
- **Rate Limiting** (distributed rate limiting)
- **Caching** (GraphQL query caching)

---

## Option 1: Upstash (Recommended) ✅

### Why Upstash?
- ✅ Free tier available (10K commands/day)
- ✅ Serverless/regional Redis
- ✅ Easy setup
- ✅ Works great with Railway
- ✅ No IP whitelisting needed

### Step-by-Step Setup

#### 1. Create Upstash Account

1. Go to https://upstash.com
2. Click **"Sign Up"** (or "Login" if you have an account)
3. Sign up with GitHub (recommended) or email

#### 2. Create Redis Database

1. Once logged in, click **"Create Database"**
2. Fill in the form:
   - **Name**: `vett-production`
   - **Type**: **Regional** (recommended)
   - **Region**: Choose **eu-west-1** (same as your Supabase region)
   - **Plan**: **Free** (10K commands/day) or **Pay as you go**
3. Click **"Create"**

#### 3. Get Connection Details

After creating, you'll see:

**Option A: REST API** (for REST clients)
- **UPSTASH_REDIS_REST_URL**
- **UPSTASH_REDIS_REST_TOKEN**

**Option B: Redis URL** (for ioredis - what we need!)
- Click **"Redis"** tab
- Copy the **Redis URL**:
  ```
  redis://default:[PASSWORD]@[HOST]:[PORT]
  ```

**Example:**
```
redis://default:AbCdEf123456@eu-west-1-redis.upstash.io:6379
```

#### 4. Test Connection (Optional)

```bash
# Test with redis-cli (if installed)
redis-cli -u redis://default:[PASSWORD]@[HOST]:[PORT] ping
# Should return: PONG
```

---

## Option 2: Railway Redis

### Step-by-Step Setup

#### 1. Create Redis Service

1. In Railway Dashboard → Your Project
2. Click **"New"**
3. Select **"Database"** → **"Add Redis"**
4. Railway will create Redis instance automatically

#### 2. Get Connection String

1. Click on the Redis service
2. Go to **"Variables"** tab
3. Find **"REDIS_URL"** or connection string
4. Copy it

**Format:**
```
redis://default:[PASSWORD]@[HOST]:[PORT]
```

---

## Add Redis URL to Railway Services

### For API Service

1. Railway Dashboard → Your Project → **API Service**
2. Go to **"Variables"** tab
3. Click **"New Variable"**
4. Add:
   - **Name**: `REDIS_URL`
   - **Value**: `redis://default:[PASSWORD]@[HOST]:[PORT]`
5. Click **"Add"**

### For Worker Service

1. Railway Dashboard → Your Project → **Worker Service**
2. Go to **"Variables"** tab
3. Click **"New Variable"**
4. Add:
   - **Name**: `REDIS_URL`
   - **Value**: Same as API service
5. Click **"Add"**

**Important:** Both services use the same Redis instance!

---

## Verify Redis Connection

### Test from Railway Logs

1. Railway Dashboard → API Service → **"Deployments"**
2. Click on latest deployment
3. Check logs for Redis connection:
   - Should see: `Redis connected` or similar
   - No errors about Redis connection

### Test from Health Endpoint

After deployment, test:

```bash
curl https://your-api.railway.app/ready
```

Should return:
```json
{
  "status": "ready",
  "checks": {
    "database": true,
    "redis": true  ← Should be true
  }
}
```

---

## Redis URL Format

### Standard Format

```
redis://[USERNAME]:[PASSWORD]@[HOST]:[PORT]
```

### Examples

**Upstash:**
```
redis://default:AbCdEf123456@eu-west-1-redis.upstash.io:6379
```

**Railway Redis:**
```
redis://default:password123@redis.railway.internal:6379
```

**Local Development:**
```
redis://localhost:6379
```

---

## Troubleshooting

### Connection Fails

**Check:**
- Redis URL format is correct
- Password doesn't have special characters (may need URL encoding)
- Redis database is active (not paused)
- Hostname and port are correct

### Special Characters in Password

If password has special characters (`@`, `#`, `%`, etc.), URL-encode them:

- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `&` → `%26`

**Example:**
```
Password: MyP@ss#123
Encoded:  MyP%40ss%23123
```

### Redis Not Found Error

**Solution:**
- Verify `REDIS_URL` is set in Railway environment variables
- Check the URL format matches exactly
- Ensure Redis service is running

### Rate Limiting Not Working

**Check:**
- Redis connection is successful (check logs)
- `REDIS_URL` is set correctly
- Redis database is not hitting free tier limits (Upstash)

---

## Cost Comparison

### Upstash Free Tier
- **Commands**: 10,000/day
- **Cost**: $0/month
- **Good for**: Small to medium apps

### Upstash Pay-as-you-go
- **Commands**: Unlimited
- **Cost**: ~$0.20 per 100K commands
- **Good for**: Production apps

### Railway Redis
- **Cost**: Included in Railway usage
- **Good for**: If already using Railway

---

## Quick Checklist

### Upstash Setup
- [ ] Created Upstash account
- [ ] Created Redis database (eu-west-1 region)
- [ ] Copied Redis URL
- [ ] Added `REDIS_URL` to API service
- [ ] Added `REDIS_URL` to Worker service
- [ ] Verified connection in logs

### Railway Redis Setup
- [ ] Created Redis service in Railway
- [ ] Copied connection string
- [ ] Added `REDIS_URL` to API service
- [ ] Added `REDIS_URL` to Worker service
- [ ] Verified connection

---

## Next Steps

Once Redis is set up:

1. ✅ Redis URL added to Railway
2. ✅ Both services configured
3. ✅ Connection verified
4. [ ] Test rate limiting
5. [ ] Test job queues
6. [ ] Monitor Redis usage

---

## Recommended: Upstash

For Vett production, **Upstash** is recommended because:
- Free tier is sufficient for starting
- Easy to scale
- Works seamlessly with Railway
- No IP whitelisting needed
- Regional deployment (same as Supabase)

---

**Need Help?**
- Upstash Docs: https://docs.upstash.com/redis
- Railway Docs: https://docs.railway.app/databases/redis

