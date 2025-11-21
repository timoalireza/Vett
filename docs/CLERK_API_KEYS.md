# Clerk API Keys: Test vs Live

## Understanding Clerk Keys

Clerk has two types of keys:

### 🔵 Test Keys (Development)
- **Format**: `sk_test_...`
- **Purpose**: For development and testing
- **Environment**: Use in local development
- **Limitations**: May have rate limits, not for production

### 🟢 Live Keys (Production)
- **Format**: `sk_live_...`
- **Purpose**: For production applications
- **Environment**: Use in Railway/production
- **Features**: Full production features, higher rate limits

---

## How to Get Your Live Key

### Step 1: Go to Clerk Dashboard

1. Go to https://dashboard.clerk.com
2. Log in to your account
3. Select your application

### Step 2: Navigate to API Keys

1. In the left sidebar, click **"API Keys"**
2. Or go to **"Configure"** → **"API Keys"**

### Step 3: Find Secret Key

You'll see two sections:

**🔵 Publishable Keys** (Frontend)
- These start with `pk_test_...` or `pk_live_...`
- Used in frontend/mobile apps
- **Not what you need for backend**

**🟢 Secret Keys** (Backend) ← **This is what you need!**
- These start with `sk_test_...` or `sk_live_...`
- Used in backend/API
- **This is what goes in Railway**

### Step 4: Get Live Secret Key

1. Look for **"Secret Keys"** section
2. Find the key that starts with `sk_live_...`
3. If you only see `sk_test_...`:
   - Your app might be in **development mode**
   - You need to **publish your app** to get live keys

---

## How to Enable Live Keys

### Option 1: Publish Your Application

1. In Clerk Dashboard → **"Settings"**
2. Look for **"Publish"** or **"Go Live"** button
3. Click to publish your application
4. This enables live keys

### Option 2: Check Application Status

1. Go to **"Settings"** → **"General"**
2. Check **"Application Status"**
3. If it says "Development", you're in test mode
4. Publish the app to enable live keys

---

## Which Key to Use Where

### Local Development (`apps/api/.env`)

```bash
# Use TEST key for local development
CLERK_SECRET_KEY=sk_test_...
```

### Production (Railway Environment Variables)

```bash
# Use LIVE key for production
CLERK_SECRET_KEY=sk_live_...
```

---

## Important Notes

⚠️ **Security:**
- Never commit secret keys to Git (already in `.gitignore`)
- Use test keys locally, live keys in production
- Rotate keys if compromised

⚠️ **Key Format:**
- Test keys: `sk_test_...`
- Live keys: `sk_live_...`
- Both work, but live keys are for production

---

## Troubleshooting

### I Only See Test Keys

**Solution:**
1. Publish your Clerk application
2. Go to Settings → Publish
3. After publishing, live keys will appear

### Can't Find Secret Keys Section

**Solution:**
1. Make sure you're in the right application
2. Check you have admin access
3. Look under "Configure" → "API Keys"

### Key Doesn't Work in Production

**Check:**
- Are you using `sk_live_...` (not `sk_test_...`)?
- Is the key copied correctly (no extra spaces)?
- Is your Clerk app published?

---

## Quick Checklist

- [ ] Logged into Clerk Dashboard
- [ ] Found "API Keys" section
- [ ] Located "Secret Keys" (not Publishable Keys)
- [ ] Found `sk_live_...` key (or published app to get it)
- [ ] Copied the full key (starts with `sk_live_`)
- [ ] Ready to add to Railway environment variables

---

## Next Steps

1. **Get your live key** (`sk_live_...`)
2. **Add to Railway** → API Service → Variables → `CLERK_SECRET_KEY`
3. **Test** the connection with `/health` endpoint

---

**Need Help?**
- Clerk Docs: https://clerk.com/docs/quickstarts/backend
- Clerk Support: https://clerk.com/support

