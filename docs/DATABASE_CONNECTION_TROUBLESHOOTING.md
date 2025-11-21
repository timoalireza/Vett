# Database Connection Troubleshooting

## Error: `getaddrinfo ENOTFOUND db.xxx.supabase.co`

This error means the system cannot resolve the Supabase database hostname. Here's how to fix it:

## Common Causes & Solutions

### 1. Database Paused (Free Tier)

**Problem**: Supabase free tier databases pause after 7 days of inactivity.

**Solution**:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click "Restore" or "Resume" if the database is paused
4. Wait 1-2 minutes for the database to come online

### 2. Incorrect DATABASE_URL

**Problem**: The connection string might be incorrect or outdated.

**Solution**:
1. Go to Supabase Dashboard → Project Settings → Database
2. Find "Connection string" → "URI"
3. Copy the connection string
4. Update your `.env` file:
   ```bash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```

### 3. Database Deleted

**Problem**: The database project might have been deleted.

**Solution**:
- Check Supabase Dashboard to see if project exists
- If deleted, create a new project and update DATABASE_URL

### 4. Network/DNS Issues

**Problem**: DNS resolution failing.

**Solution**:
```bash
# Test DNS resolution
nslookup db.rqliizpjhxiiulrckzgu.supabase.co

# Test connectivity
ping db.rqliizpjhxiiulrckzgu.supabase.co

# If DNS fails, try:
# - Check internet connection
# - Try different DNS server (8.8.8.8)
# - Check firewall/VPN settings
```

## Verify Database Connection

### Check Current DATABASE_URL

```bash
# In apps/api directory
grep DATABASE_URL .env
```

### Test Connection Manually

```bash
# Using psql
psql "postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres"

# Or using connection pooling URL (recommended)
psql "postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:6543/postgres?pgbouncer=true"
```

### Test from Node.js

```bash
cd apps/api
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()').then(r => console.log('Connected:', r.rows[0])).catch(e => console.error('Error:', e.message));
"
```

## Supabase Connection String Format

### Standard Connection (Port 5432)
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Connection Pooling (Port 6543) - Recommended
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Benefits of Connection Pooling**:
- Better for serverless/server applications
- Handles connection limits better
- More efficient connection management

## Quick Fix Steps

1. **Check Supabase Dashboard**
   - Is project active?
   - Is database paused?
   - Copy fresh connection string

2. **Update .env File**
   ```bash
   cd apps/api
   # Edit .env and update DATABASE_URL
   ```

3. **Restart Server**
   ```bash
   pnpm dev:api
   ```

4. **Verify Connection**
   - Check server logs for connection success
   - Test a simple query

## Still Having Issues?

1. **Check Supabase Status**: https://status.supabase.com
2. **Verify Project Settings**: Database → Connection info
3. **Check Password**: Ensure password is correct (no special character issues)
4. **Try Connection Pooling URL**: Use port 6543 instead of 5432
5. **Check Firewall**: Ensure port 5432/6543 is not blocked

---

**Need Help?** Check Supabase docs: https://supabase.com/docs/guides/database/connecting-to-postgres

