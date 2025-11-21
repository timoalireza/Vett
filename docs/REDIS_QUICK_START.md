# Redis Quick Start

## 🚀 Upstash Setup (5 minutes)

### Step 1: Create Account
1. Go to https://upstash.com
2. Sign up (free)

### Step 2: Create Database
1. Click **"Create Database"**
2. Fill in:
   - **Name**: `vett-production`
   - **Type**: Regional
   - **Region**: `eu-west-1` (same as Supabase)
   - **Plan**: Free
3. Click **"Create"**

### Step 3: Get Redis URL
1. After creation, click **"Redis"** tab
2. Copy the **Redis URL**
   - Format: `redis://default:[PASSWORD]@[HOST]:[PORT]`
   - Example: `redis://default:AbCd123@eu-west-1-redis.upstash.io:6379`

### Step 4: Add to Railway
1. Railway → API Service → Variables
2. Add: `REDIS_URL` = `redis://default:[PASSWORD]@[HOST]:[PORT]`
3. Railway → Worker Service → Variables
4. Add: `REDIS_URL` = Same value

---

## ✅ Verification

After adding to Railway, check logs:
- Should see: `Redis connected` or no errors
- Test: `curl https://your-api.railway.app/ready`
- Should show: `"redis": true`

---

## 📋 Checklist

- [ ] Upstash account created
- [ ] Redis database created (eu-west-1)
- [ ] Redis URL copied
- [ ] Added to API service variables
- [ ] Added to Worker service variables
- [ ] Connection verified

---

**Full guide:** `docs/REDIS_SETUP.md`

