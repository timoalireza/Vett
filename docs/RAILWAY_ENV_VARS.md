# Railway Environment Variables - Copy & Paste

## API Service Variables

Copy these into Railway → API Service → Variables:

```bash
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

DATABASE_URL=postgresql://postgres.rqliizpjhxiiulrckzgu:oEP4JtGshGqDuiU6@aws-1-eu-west-1.pooler.supabase.com:5432/postgres

REDIS_URL=redis://default:[PASSWORD]@[HOST]:[PORT]

CLERK_SECRET_KEY=sk_live_[YOUR_KEY]

ALLOWED_ORIGINS=

OPENAI_API_KEY=sk-[YOUR_KEY]
ANTHROPIC_API_KEY=sk-ant-[YOUR_KEY]
BRAVE_API_KEY=[YOUR_KEY]
SERPER_API_KEY=[YOUR_KEY]

SENTRY_DSN=https://[YOUR_DSN]
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

## Worker Service Variables

Copy these into Railway → Worker Service → Variables:

```bash
NODE_ENV=production
LOG_LEVEL=info

DATABASE_URL=postgresql://postgres.rqliizpjhxiiulrckzgu:oEP4JtGshGqDuiU6@aws-1-eu-west-1.pooler.supabase.com:5432/postgres

REDIS_URL=redis://default:[PASSWORD]@[HOST]:[PORT]

OPENAI_API_KEY=sk-[YOUR_KEY]
ANTHROPIC_API_KEY=sk-ant-[YOUR_KEY]
BRAVE_API_KEY=[YOUR_KEY]
SERPER_API_KEY=[YOUR_KEY]

SENTRY_DSN=https://[YOUR_DSN]
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

**Note:** Worker doesn't need `PORT` or `ALLOWED_ORIGINS`

---

## Quick Setup Steps

1. **Railway Dashboard** → Your Project → API Service
2. **Variables** tab → **"New Variable"**
3. Add each variable one by one (copy from above)
4. Repeat for Worker Service

---

## Required vs Optional

### Required (Must Have)
- ✅ `NODE_ENV`
- ✅ `DATABASE_URL` (you have this!)
- ✅ `REDIS_URL` (get from Upstash)
- ✅ `CLERK_SECRET_KEY` (API only)
- ✅ `OPENAI_API_KEY`
- ✅ `ANTHROPIC_API_KEY`
- ✅ `BRAVE_API_KEY` or `SERPER_API_KEY` (at least one)

### Optional (Can Add Later)
- `ALLOWED_ORIGINS` (leave empty for now)
- `SENTRY_DSN` (add if using Sentry)
- `LOG_LEVEL` (defaults to `info`)

---

## Replace These Values

- `[PASSWORD]` → Your Redis password
- `[HOST]` → Your Redis hostname
- `[PORT]` → Your Redis port
- `[YOUR_KEY]` → Your actual API keys
- `[YOUR_DSN]` → Your Sentry DSN (if using)

---

**Your DATABASE_URL is already filled in!** ✅

