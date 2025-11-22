#!/bin/bash

# Troubleshooting script for frozen "Analyzing..." screen
# Usage: ./scripts/troubleshoot-analysis.sh [ANALYSIS_ID]

set -e

API_URL="https://vett-api-production.up.railway.app"

echo "🔍 Vett Analysis Troubleshooting"
echo "================================"
echo ""

# Check if analysis ID provided
if [ -z "$1" ]; then
  echo "❌ Please provide an analysis ID"
  echo "Usage: ./scripts/troubleshoot-analysis.sh [ANALYSIS_ID]"
  exit 1
fi

ANALYSIS_ID="$1"

echo "📋 Checking Analysis: $ANALYSIS_ID"
echo ""

# 1. Check API health
echo "1️⃣ Checking API health..."
HEALTH=$(curl -s "$API_URL/health" | jq -r '.status // "unknown"')
if [ "$HEALTH" != "unknown" ]; then
  echo "   ✅ API is healthy: $HEALTH"
else
  echo "   ❌ API health check failed"
fi
echo ""

# 2. Check API readiness
echo "2️⃣ Checking API readiness..."
READY=$(curl -s "$API_URL/ready" | jq '.')
echo "   Database: $(echo "$READY" | jq -r '.checks.database // "unknown"')"
echo "   Redis: $(echo "$READY" | jq -r '.checks.redis // "unknown"')"
echo ""

# 3. Query analysis status
echo "3️⃣ Querying analysis status..."
ANALYSIS_QUERY='{"query":"query { analysis(id: \"'$ANALYSIS_ID'\") { id status createdAt score verdict } }"}'
ANALYSIS_RESULT=$(curl -s -X POST "$API_URL/graphql" \
  -H "Content-Type: application/json" \
  -d "$ANALYSIS_QUERY")

ANALYSIS_STATUS=$(echo "$ANALYSIS_RESULT" | jq -r '.data.analysis.status // "null"')
ANALYSIS_ERROR=$(echo "$ANALYSIS_RESULT" | jq -r '.errors[0].message // "null"')

if [ "$ANALYSIS_STATUS" != "null" ]; then
  echo "   ✅ Analysis found"
  echo "   Status: $ANALYSIS_STATUS"
  CREATED=$(echo "$ANALYSIS_RESULT" | jq -r '.data.analysis.createdAt // "unknown"')
  echo "   Created: $CREATED"
  
  if [ "$ANALYSIS_STATUS" = "QUEUED" ]; then
    echo "   ⚠️  Analysis is QUEUED - worker may not be processing jobs"
  elif [ "$ANALYSIS_STATUS" = "PROCESSING" ]; then
    echo "   ⚠️  Analysis is PROCESSING - worker is working on it"
  elif [ "$ANALYSIS_STATUS" = "COMPLETED" ]; then
    echo "   ✅ Analysis is COMPLETED"
    SCORE=$(echo "$ANALYSIS_RESULT" | jq -r '.data.analysis.score // "null"')
    VERDICT=$(echo "$ANALYSIS_RESULT" | jq -r '.data.analysis.verdict // "null"')
    echo "   Score: $SCORE"
    echo "   Verdict: $VERDICT"
  elif [ "$ANALYSIS_STATUS" = "FAILED" ]; then
    echo "   ❌ Analysis FAILED"
  fi
elif [ "$ANALYSIS_ERROR" != "null" ]; then
  echo "   ❌ Error querying analysis: $ANALYSIS_ERROR"
else
  echo "   ❌ Analysis not found (returned null)"
fi
echo ""

# 4. Check if analysis exists in database (via full query)
echo "4️⃣ Checking full analysis details..."
FULL_QUERY='{"query":"query { analysis(id: \"'$ANALYSIS_ID'\") { id status createdAt updatedAt score verdict confidence summary recommendation claims { id text verdict } sources { id title url } } }"}'
FULL_RESULT=$(curl -s -X POST "$API_URL/graphql" \
  -H "Content-Type: application/json" \
  -d "$FULL_QUERY")

FULL_ERROR=$(echo "$FULL_RESULT" | jq -r '.errors[0].message // "null"')
if [ "$FULL_ERROR" != "null" ]; then
  echo "   ❌ Error: $FULL_ERROR"
else
  CLAIMS_COUNT=$(echo "$FULL_RESULT" | jq '.data.analysis.claims | length // 0')
  SOURCES_COUNT=$(echo "$FULL_RESULT" | jq '.data.analysis.sources | length // 0')
  echo "   Claims: $CLAIMS_COUNT"
  echo "   Sources: $SOURCES_COUNT"
fi
echo ""

# 5. Recommendations
echo "📋 Recommendations:"
echo ""

if [ "$ANALYSIS_STATUS" = "QUEUED" ]; then
  echo "   ⚠️  Analysis is stuck in QUEUED status"
  echo "   → Check Railway Worker Service logs for:"
  echo "     - '[Startup] ✅ Database connection successful'"
  echo "     - '[Startup] ✅ Worker ready and listening for jobs'"
  echo "     - 'Worker started processing job'"
  echo ""
  echo "   → Verify DATABASE_URL in Railway Worker Service"
  echo "   → Verify REDIS_URL in Railway Worker Service"
  echo "   → Check if worker is running and processing jobs"
elif [ "$ANALYSIS_STATUS" = "PROCESSING" ]; then
  echo "   ⚠️  Analysis is PROCESSING"
  echo "   → This is normal - worker is analyzing"
  echo "   → Wait a few minutes and check again"
  echo "   → Check Railway Worker Service logs for progress"
elif [ "$ANALYSIS_STATUS" = "null" ]; then
  echo "   ❌ Analysis not found"
  echo "   → Verify the analysis ID is correct"
  echo "   → Check if analysis was created successfully"
  echo "   → Check API logs for errors during creation"
fi

echo ""
echo "✅ Troubleshooting complete"

