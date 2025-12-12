#!/bin/bash
# Script to apply the complexity migration to Railway database
# Usage: ./apply-complexity-migration.sh

set -e

echo "🔧 Applying complexity migration to Railway database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set it with: export DATABASE_URL='postgresql://...'"
    exit 1
fi

# Get the migration file path
MIGRATION_FILE="apps/api/drizzle/0009_add_complexity_to_analyses.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ ERROR: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Running migration: $MIGRATION_FILE"

# Run the migration using psql
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

echo "✅ Migration applied successfully!"
echo ""
echo "Verifying migration..."
psql "$DATABASE_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'analyses' AND column_name IN ('complexity', 'title');"

