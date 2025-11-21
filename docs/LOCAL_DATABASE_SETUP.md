# Local PostgreSQL Database Setup

## Quick Setup

PostgreSQL@15 has been installed and configured for local development.

## Database Status

- **Database Name**: `vett`
- **Host**: `localhost`
- **Port**: `5432`
- **Service**: Running via Homebrew

## Useful Commands

### Start/Stop PostgreSQL

```bash
# Start PostgreSQL
brew services start postgresql@15

# Stop PostgreSQL
brew services stop postgresql@15

# Check status
brew services list | grep postgresql
```

### Connect to Database

```bash
# Using psql (add to PATH first)
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
psql -h localhost -d vett

# Or use full path
/opt/homebrew/opt/postgresql@15/bin/psql -h localhost -d vett
```

### Check Database Connection

```bash
# Check if PostgreSQL is accepting connections
/opt/homebrew/opt/postgresql@15/bin/pg_isready -h localhost -p 5432

# List databases
/opt/homebrew/opt/postgresql@15/bin/psql -h localhost -l
```

### Run Migrations

```bash
cd apps/api
pnpm db:migrate
```

## Adding PostgreSQL to PATH (Optional)

To use `psql`, `pg_isready`, etc. without full paths, add to your `~/.zshrc`:

```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Environment Configuration

Your `.env` file should have:

```bash
DATABASE_URL=postgres://postgres:[PASSWORD]@localhost:5432/vett
```

**Note**: PostgreSQL@15 installed via Homebrew typically doesn't require a password for local connections. If you get authentication errors, check PostgreSQL configuration.

## Troubleshooting

### Database Connection Fails

1. **Check if PostgreSQL is running**:
   ```bash
   brew services list | grep postgresql
   ```

2. **Check if database exists**:
   ```bash
   /opt/homebrew/opt/postgresql@15/bin/psql -h localhost -l | grep vett
   ```

3. **Create database if missing**:
   ```bash
   /opt/homebrew/opt/postgresql@15/bin/createdb vett
   ```

### Authentication Errors

If you get password authentication errors, you may need to configure PostgreSQL authentication. Check:

```bash
# View PostgreSQL config
cat /opt/homebrew/var/postgresql@15/pg_hba.conf
```

For local development, you can set authentication to `trust` for localhost connections.

---

**For Production**: Use Supabase or another managed PostgreSQL service. See `PRODUCTION_DATABASE_SETUP.md`.

