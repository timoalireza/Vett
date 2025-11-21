# How to Get Supabase Connection Pooling URL

## Step-by-Step Instructions

### 1. Log in to Supabase Dashboard

1. Go to https://app.supabase.com
2. Log in with your account

### 2. Select Your Project

1. Click on your project from the dashboard
2. Make sure the project is **Active** (not paused)

### 3. Navigate to Database Settings

1. In the left sidebar, click **"Settings"** (gear icon at the bottom)
2. Click **"Database"** from the settings menu

### 4. Find Connection String Section

1. Scroll down to find **"Connection string"** section
2. You'll see multiple tabs:
   - **URI** (what we need)
   - **JDBC**
   - **Golang**
   - **Python**
   - **Node.js**
   - **etc.**

### 5. Select Connection Pooling

**Important**: Look for **"Connection Pooling"** section (usually below the regular connection strings)

You should see:
- **Session mode** (recommended)
- **Transaction mode**

### 6. Copy Connection Pooling URL

1. Click on the **"URI"** tab under **"Connection Pooling"**
2. You'll see a connection string like:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
3. Click the **copy icon** (📋) next to the connection string
4. **Save this somewhere safe!** You'll need it for Railway environment variables

---

## Visual Guide

```
Supabase Dashboard
├── Settings (gear icon) ← Click here
    └── Database ← Click here
        └── Connection string section
            └── Connection Pooling ← Look for this section
                └── URI tab ← Click here
                    └── Copy the connection string
```

---

## Connection String Format

### Connection Pooling URL (Port 6543) - ✅ Recommended
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Example:**
```
postgresql://postgres.abcdefghijklmnop:MyPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Standard URL (Port 5432) - Alternative
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

## Why Connection Pooling?

- ✅ **Better Performance**: Handles many concurrent connections efficiently
- ✅ **Serverless-Friendly**: Works better with Railway/Render deployments
- ✅ **Connection Limits**: Avoids hitting PostgreSQL connection limits
- ✅ **Recommended**: Supabase recommends this for production applications

---

## What Each Part Means

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
│          │      │              │           │              │                    │    │
│          │      │              │           │              │                    │    └─ Database name
│          │      │              │           │              │                    └─ Port (6543 = pooling)
│          │      │              │           │              └─ Hostname (pooler)
│          │      │              │           └─ Region (e.g., us-east-1)
│          │      │              └─ Password
│          │      └─ Project reference
│          └─ Username
└─ Protocol
```

---

## Troubleshooting

### Can't Find Connection Pooling Section?

**Option 1**: Look for "Connection Pooling" tab or section
- It might be in a separate tab
- Scroll down further in the Database settings

**Option 2**: Use Standard Connection String
- If Connection Pooling isn't available, use the standard URI (port 5432)
- Still works, but Connection Pooling is recommended

**Option 3**: Check Your Plan
- Connection Pooling is available on all plans
- If you don't see it, try refreshing the page

### Password Has Special Characters?

If your password contains special characters (like `@`, `#`, `%`, etc.), they need to be URL-encoded:

- `@` becomes `%40`
- `#` becomes `%23`
- `%` becomes `%25`
- `&` becomes `%26`
- etc.

**Example:**
```
Password: MyP@ss#123
Encoded:  MyP%40ss%23123
```

### Don't See Your Password?

The connection string shows `[YOUR-PASSWORD]` as a placeholder. You need to:

1. **If you know your password**: Replace `[YOUR-PASSWORD]` with your actual password
2. **If you forgot your password**: 
   - Go to Settings → Database
   - Click "Reset database password"
   - Generate a new password
   - Update the connection string with the new password

---

## Security Notes

⚠️ **Never commit this to Git!**
- Connection strings contain sensitive credentials
- Already in `.gitignore` for safety
- Store in Railway environment variables only

⚠️ **Keep it Secret**
- Don't share connection strings publicly
- Use environment variables in Railway
- Rotate passwords regularly

---

## Quick Copy Checklist

- [ ] Logged into Supabase Dashboard
- [ ] Selected your project
- [ ] Went to Settings → Database
- [ ] Found Connection Pooling section
- [ ] Clicked URI tab
- [ ] Copied connection string (port 6543)
- [ ] Saved it securely (for Railway setup)

---

## Next Step

Once you have the Connection Pooling URL, you'll use it in:
- **Railway Environment Variables** as `DATABASE_URL`
- See `docs/QUICK_START_PRODUCTION.md` for next steps

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
- Support: https://supabase.com/support

