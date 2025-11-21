# Where to Put DATABASE_URL

## Two Places: Local Development vs Production

### 1. Local Development (`.env` file)

**Location:** `apps/api/.env`

**For local testing/development:**

```bash
# apps/api/.env
DATABASE_URL=postgresql://postgres.rqliizpjhxiiulrckzgu:oEP4JtGshGqDuiU6@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

**Steps:**
1. Open `apps/api/.env` file
2. Add or update `DATABASE_URL` line
3. Save the file
4. Restart your local API server

**Note:** `.env` files are already in `.gitignore` - they won't be committed to Git.

---

### 2. Production (Railway Environment Variables)

**Location:** Railway Dashboard → Service → Settings → Variables

**For production deployment:**

1. Go to Railway Dashboard
2. Select your API service
3. Go to **Settings** → **Variables**
4. Click **"New Variable"**
5. Name: `DATABASE_URL`
6. Value: `postgresql://postgres.rqliizpjhxiiulrckzgu:oEP4JtGshGqDuiU6@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`
7. Click **"Add"**

**Do NOT put it in a `.env` file that gets committed!**

---

## Quick Setup Guide

### For Local Development:

```bash
# Navigate to API directory
cd apps/api

# Edit .env file (create if doesn't exist)
# Add this line:
DATABASE_URL=postgresql://postgres.rqliizpjhxiiulrckzgu:oEP4JtGshGqDuiU6@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

### For Production (Railway):

1. Railway Dashboard → Your Project → API Service
2. Settings → Variables
3. Add `DATABASE_URL` with your connection string
4. Railway will automatically restart the service

---

## File Structure

```
Vett/
├── apps/
│   ├── api/
│   │   ├── .env              ← Local development (NOT committed)
│   │   ├── env.example       ← Template (committed)
│   │   └── env.production.example  ← Production template (committed)
│   └── worker/
│       ├── .env              ← Local development (NOT committed)
│       └── env.example        ← Template (committed)
└── .gitignore                 ← Ensures .env files are NOT committed
```

---

## Security Checklist

- [x] `.env` files are in `.gitignore` ✅
- [ ] Never commit `.env` files ✅
- [ ] Use Railway environment variables for production ✅
- [ ] Keep connection strings secret ✅

---

## Summary

| Environment | Where to Put | File/Platform |
|------------|--------------|--------------|
| **Local Dev** | `.env` file | `apps/api/.env` |
| **Production** | Railway Variables | Railway Dashboard |

---

**Next:** Update your local `.env` file for development, then configure Railway for production!

