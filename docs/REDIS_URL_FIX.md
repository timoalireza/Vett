# Fix REDIS_URL Configuration Error

**Error:** `Invalid environment configuration: { REDIS_URL: [ 'Invalid url' ] }`

## ✅ Fixes Applied

1. **Made REDIS_URL validation more flexible** - Now accepts:
   - `redis://` (standard Redis)
   - `rediss://` (Redis with SSL)
   - `http://` (Upstash REST API)
   - `https://` (Upstash REST API with SSL)

2. **Fixed module type warning** - Added package.json to root directory

---

## 🔍 Verify Your REDIS_URL

### For Upstash Redis

**Format should be:**
```
https://YOUR_ENDPOINT.upstash.io
```

**Or:**
```
redis://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
```

### Check Railway Variables

1. **Railway Dashboard** → **API Service** → **Settings** → **Variables**
2. **Find `REDIS_URL`**
3. **Verify format:**
   - Should start with `redis://`, `rediss://`, `http://`, or `https://`
   - Should be a complete URL

### Common Issues

**Issue 1: Missing Protocol**
```
❌ WRONG: default:password@endpoint.upstash.io:6379
✅ CORRECT: redis://default:password@endpoint.upstash.io:6379
```

**Issue 2: Wrong Format**
```
❌ WRONG: upstash.io/redis/endpoint
✅ CORRECT: https://endpoint.upstash.io
```

**Issue 3: Extra Spaces**
```
❌ WRONG: redis:// endpoint.upstash.io
✅ CORRECT: redis://endpoint.upstash.io
```

---

## 📝 How to Get Correct REDIS_URL

### From Upstash Dashboard

1. Go to **Upstash Console** → Your Redis Database
2. Click **"REST API"** or **"Redis CLI"** tab
3. Copy the **REST URL** or **Redis URL**
4. **REST URL format:** `https://endpoint.upstash.io`
5. **Redis URL format:** `redis://default:password@endpoint.upstash.io:6379`

### For Railway Redis

If using Railway's Redis service:
1. Railway → Redis Service → Settings → Variables
2. Copy the `REDIS_URL` variable
3. Format: `redis://default:password@host:port`

---

## ✅ Verification Steps

After updating REDIS_URL in Railway:

1. **Redeploy API Service:**
   - Railway will auto-redeploy on variable change
   - Or manually redeploy: Deployments → Redeploy

2. **Check Logs:**
   - Railway → API Service → Deployments → View Logs
   - Should see: "Vett API ready at http://localhost:4000/graphql"
   - No REDIS_URL validation errors

3. **Test Health Endpoint:**
   ```bash
   curl https://vett-api-production.up.railway.app/health
   ```

4. **Test Ready Endpoint:**
   ```bash
   curl https://vett-api-production.up.railway.app/ready
   ```
   - Should show: `"redis": "connected"`

---

## 🐛 Still Getting Errors?

### Check REDIS_URL Format

**Test your REDIS_URL locally:**
```bash
# Test Redis connection
redis-cli -u "YOUR_REDIS_URL" ping
# Should return: PONG
```

### Common REDIS_URL Formats

**Upstash REST API:**
```
https://endpoint-name.upstash.io
```

**Upstash Redis:**
```
redis://default:password@endpoint-name.upstash.io:6379
```

**Railway Redis:**
```
redis://default:password@host:port
```

**Local Redis:**
```
redis://localhost:6379
```

---

## 📋 Checklist

- [ ] REDIS_URL is set in Railway variables
- [ ] REDIS_URL starts with `redis://`, `rediss://`, `http://`, or `https://`
- [ ] REDIS_URL is a complete, valid URL
- [ ] No extra spaces or characters
- [ ] API service redeployed after updating REDIS_URL
- [ ] Logs show no REDIS_URL errors
- [ ] `/ready` endpoint shows `"redis": "connected"`

---

**After fixing REDIS_URL, the API should start successfully! 🚀**

