# How to Find Your Railway Domain

## Step-by-Step Guide

### 1. Go to Railway Dashboard

1. **Open Railway:** https://railway.app
2. **Sign in** to your account
3. **Select your project** (the one with your API service)

### 2. Find Your API Service

1. In your Railway project, you should see **two services:**
   - `vett-api` (or similar name for API)
   - `vett-worker` (or similar name for Worker)

2. **Click on your API service** (not the worker)

### 3. Get the Domain

**Option A: Generate Domain (If Not Already Done)**

1. Click **Settings** (gear icon) in the top right
2. Click **Networking** tab
3. Scroll to **"Public Networking"** section
4. Click **"Generate Domain"** button
5. Railway will create a domain like: `vett-api-production.up.railway.app`
6. **Copy this domain** - this is your API URL!

**Option B: View Existing Domain**

1. Click **Settings** → **Networking**
2. Look for **"Public Domain"** section
3. You'll see your domain listed (e.g., `vett-api-production.up.railway.app`)
4. **Copy this domain**

### 4. Verify Domain is Active

- The domain should show as **"Active"** or **"Provisioned"**
- If it says "Pending", wait 1-2 minutes for SSL to provision

---

## Visual Guide

```
Railway Dashboard
  └── Your Project
      ├── vett-api (API Service) ← Click this one
      │   └── Settings → Networking → Generate Domain
      └── vett-worker (Worker Service)
```

---

## Domain Format

Your Railway domain will look like:
```
https://your-service-name.up.railway.app
```

Examples:
- `vett-api-production.up.railway.app`
- `vett-api.up.railway.app`
- `api-vett-1234.up.railway.app`

---

## Privacy Settings

### Should Your Project Be Private?

**Answer: It depends on your needs**

#### Public Project (Default)
- ✅ **Domain is public** - Anyone with the URL can access your API
- ✅ **Good for:** Public APIs, mobile apps, web apps
- ⚠️ **Security:** Your API endpoints are accessible, but:
  - Authentication (Clerk) protects your data
  - Rate limiting prevents abuse
  - CORS restricts which origins can call your API

#### Private Project
- 🔒 **Domain is still public** - Railway domains are always publicly accessible
- 🔒 **But:** Project settings are private (only you can see them)
- ✅ **Good for:** Internal tools, staging environments
- ⚠️ **Note:** Making a project "private" doesn't hide the domain - it just hides the project from Railway's public directory

### Recommendation

**For Production:** Keep project **Public** (default)
- Your API domain will be public anyway (needed for mobile app)
- Security comes from:
  - ✅ Authentication (Clerk)
  - ✅ Rate limiting
  - ✅ CORS restrictions
  - ✅ Environment variables (secrets)

**For Staging/Dev:** Can be **Private**
- If you want to hide it from Railway's public directory
- But the domain will still work the same way

---

## Security Best Practices

Even with a public domain, your API is secure because:

1. **Authentication Required:**
   - Users must authenticate with Clerk
   - Unauthenticated requests are rejected

2. **CORS Protection:**
   - Only allowed origins can call your API
   - Set in `ALLOWED_ORIGINS` environment variable

3. **Rate Limiting:**
   - Prevents abuse and DDoS
   - Limits requests per IP/user

4. **Environment Variables:**
   - Secrets (API keys, database URLs) are stored securely
   - Never exposed in code or logs

---

## Quick Checklist

- [ ] Found Railway Dashboard
- [ ] Selected API service (not worker)
- [ ] Went to Settings → Networking
- [ ] Generated or copied domain
- [ ] Domain shows as "Active"
- [ ] Copied domain URL (e.g., `https://vett-api-production.up.railway.app`)

---

## Next Steps

After getting your domain:

1. **Copy the domain** (e.g., `https://vett-api-production.up.railway.app`)
2. **Update mobile app** (see `RAILWAY_DOMAIN_SETUP.md`)
3. **Update CORS** in Railway variables
4. **Test connection** with curl commands

---

## Troubleshooting

### Can't Find Networking Tab

**Fix:** Make sure you're in the **API service**, not the worker service. The API service needs a public domain.

### Domain Shows "Pending"

**Fix:** Wait 1-2 minutes. Railway needs to provision SSL certificate. Refresh the page.

### No "Generate Domain" Button

**Fix:** 
- Check you're in the API service (not worker)
- Worker services don't need public domains
- If still missing, try refreshing the page

### Domain Not Working

**Fix:**
- Verify service is deployed and running
- Check Railway logs for errors
- Test with: `curl https://your-domain.railway.app/health`

---

**Need Help?** Check Railway documentation: https://docs.railway.app/networking/domains

