# Railway Environment Variables Setup

The API service requires the following environment variables to be set in Railway:

## Required Environment Variables

### 1. `DATABASE_URL`
- **Description**: PostgreSQL connection string for Supabase
- **Format**: `postgresql://postgres.[project-ref]:[password]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`
- **Where to find**: Supabase Dashboard → Project Settings → Database → Connection Pooling URL
- **Example**: `postgresql://postgres.rqliizpjhxiiulrckzgu:oEP4JtGshGqDuiU6@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`

### 2. `REDIS_URL`
- **Description**: Redis connection string for Upstash
- **Format**: `redis://default:[password]@[hostname]:6379` or `rediss://default:[password]@[hostname]:6379` (TLS)
- **Where to find**: Upstash Dashboard → Your Redis Database → REST API → Redis URL
- **Example**: `redis://default:AZrBAAIncDI4NTFhNTljYmI3MmE0YjI1OWZhOGMzYzJlM2Q1NGU4M3AyMzk2MTc@modern-swan-39617.upstash.io:6379`

### 3. `CLERK_SECRET_KEY`
- **Description**: Clerk secret key for authentication
- **Format**: `sk_test_...` (test) or `sk_live_...` (production)
- **Where to find**: Clerk Dashboard → API Keys → Secret Key
- **Note**: Use `sk_live_...` for production, `sk_test_...` for testing

## How to Set Environment Variables in Railway

### For API Service:

1. Go to Railway Dashboard → Your Project → API Service
2. Click on the **Variables** tab
3. Click **+ New Variable** for each variable
4. Add:
   - **Name**: `DATABASE_URL`
   - **Value**: Your Supabase connection string
5. Repeat for `REDIS_URL` and `CLERK_SECRET_KEY`

### For Worker Service:

The worker service also needs these variables:
- `DATABASE_URL`
- `REDIS_URL`
- `CLERK_SECRET_KEY` (if worker needs to access user data)

### Optional Environment Variables:

- `NODE_ENV`: Set to `production` (usually set automatically)
- `PORT`: Set to `8080` (Railway sets this automatically)
- `SENTRY_DSN`: For error tracking (optional)
- `SENTRY_ENVIRONMENT`: Set to `production` (optional)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins (optional)

## Verification

After setting the variables:

1. Railway will automatically redeploy the service
2. Check the logs to verify:
   - ✅ `Redis connected for rate limiting`
   - ✅ `Database connection established`
   - ✅ `Clerk connection verified`
   - ✅ `Server listening at http://0.0.0.0:8080`

## Troubleshooting

### Error: `Invalid environment configuration`
- **Cause**: Missing required environment variables
- **Fix**: Ensure all three required variables are set in Railway

### Error: `MaxRetriesPerRequestError` or `ECONNRESET` (Redis)
- **Cause**: TLS configuration issue with Upstash
- **Fix**: Ensure `REDIS_URL` uses `redis://` or `rediss://` protocol and points to `upstash.io` hostname. TLS is automatically enabled for Upstash.

### Error: `getaddrinfo ENOTFOUND` (Database)
- **Cause**: Invalid `DATABASE_URL` or Supabase project is paused
- **Fix**: 
  1. Verify Supabase project is active (not paused)
  2. Get a fresh connection string from Supabase Dashboard
  3. Ensure you're using the **Connection Pooling URL**, not the direct connection URL

## Security Notes

- **Never commit** `.env` files to Git
- Railway environment variables are encrypted at rest
- Use different `CLERK_SECRET_KEY` for production vs. development
- Rotate secrets regularly

