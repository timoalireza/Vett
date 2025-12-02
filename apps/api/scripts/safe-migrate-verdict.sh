#!/bin/bash
# Safe migration script to convert verdict columns from text to enum without data loss
# This script should be run BEFORE using Drizzle push

set -e

echo "🔍 Checking database state..."

# Check if verdict columns are text type
ANALYSES_TYPE=$(psql $DATABASE_URL -t -c "SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analyses' AND column_name = 'verdict';" | xargs)
CLAIMS_TYPE=$(psql $DATABASE_URL -t -c "SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'claims' AND column_name = 'verdict';" | xargs)

echo "  analyses.verdict type: $ANALYSES_TYPE"
echo "  claims.verdict type: $CLAIMS_TYPE"

if [ "$ANALYSES_TYPE" = "text" ] || [ "$CLAIMS_TYPE" = "text" ]; then
  echo "⚠️  Verdict columns are text type. Running safe conversion migration..."
  psql $DATABASE_URL -f apps/api/drizzle/0008_safe_convert_verdict_to_enum.sql
  echo "✅ Safe conversion completed"
else
  echo "✅ Verdict columns are already enum type. No conversion needed."
fi

echo ""
echo "📊 Current data counts:"
ANALYSES_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM analyses;" | xargs)
CLAIMS_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM claims;" | xargs)
echo "  Analyses: $ANALYSES_COUNT"
echo "  Claims: $CLAIMS_COUNT"

echo ""
echo "✅ Safe migration check complete. You can now run: pnpm --filter vett-api db:migrate"

