# How to Find Analysis ID

The analysis ID is needed to troubleshoot frozen "Analyzing..." screens. Here are all the ways to find it:

---

## 📱 Method 1: From Mobile App URL

When you're on the "Analyzing..." screen, the analysis ID is in the URL:

**URL Format:**
```
/result/[ANALYSIS_ID]
```

**Example:**
- If URL is `/result/abc123-def456-ghi789`
- Then analysis ID is: `abc123-def456-ghi789`

**How to see it:**
1. Look at the URL bar (if using web version)
2. Check the navigation state in React Native debugger
3. Check Expo dev tools URL

---

## 📱 Method 2: From Mobile App Logs

When you submit an analysis, the app logs the analysis ID:

**Look for:**
- Console logs showing `analysisId: ...`
- React Query logs showing the mutation response
- Network logs showing the GraphQL response

**Example log:**
```
submitAnalysis response: { analysisId: "abc123-def456-ghi789" }
```

---

## 🌐 Method 3: From GraphQL Response

When you submit an analysis, the GraphQL mutation returns the analysis ID:

**Test it:**
```bash
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { submitAnalysis(input: { text: \"test\", mediaType: \"text/plain\" }) { analysisId status } }"
  }'
```

**Response:**
```json
{
  "data": {
    "submitAnalysis": {
      "analysisId": "abc123-def456-ghi789",
      "status": "QUEUED"
    }
  }
}
```

The `analysisId` field contains the ID you need.

---

## 🔍 Method 4: From React Native Debugger

If you're using React Native debugger or Expo dev tools:

1. **Open React Native Debugger**
2. **Go to Network tab**
3. **Find the `submitAnalysis` GraphQL request**
4. **Check the response** - it will contain `analysisId`

---

## 📋 Method 5: Check Recent Analyses

If you have access to the collections/history screen:

1. **Go to Collections/History screen**
2. **Find the analysis you just submitted**
3. **Click on it** - the URL will show the analysis ID
4. **Or check the analysis card** - it might display the ID

---

## 🛠️ Method 6: Add Temporary Logging

If you can't find it, add temporary logging to the mobile app:

**In `apps/mobile/app/(tabs)/analyze.tsx`:**

```typescript
onSuccess: ({ analysisId }) => {
  console.log("🔍 ANALYSIS ID:", analysisId); // Add this line
  setSheetVisible(false);
  setErrorMessage(null);
  router.push({
    pathname: `/result/${analysisId}`
  });
},
```

Then check the console/logs when you submit an analysis.

---

## 📱 Method 7: From Result Screen Component

The analysis ID is stored in the component state. You can add temporary logging:

**In `apps/mobile/app/result/[jobId].tsx`:**

```typescript
const analysisId = useMemo(() => (typeof jobId === "string" ? jobId : ""), [jobId]);

// Add this temporarily:
useEffect(() => {
  console.log("🔍 CURRENT ANALYSIS ID:", analysisId);
}, [analysisId]);
```

---

## 🔧 Quick Test: Submit New Analysis

If you can't find the old analysis ID, submit a new one and capture the ID:

```bash
# Submit a test analysis
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { submitAnalysis(input: { text: \"test find id\", mediaType: \"text/plain\" }) { analysisId status } }"
  }' | jq -r '.data.submitAnalysis.analysisId'
```

This will output just the analysis ID.

---

## 📋 Analysis ID Format

Analysis IDs are UUIDs, typically formatted like:
- `550e8400-e29b-41d4-a716-446655440000`
- Or shorter format: `abc123-def456-ghi789`

They're unique identifiers for each analysis.

---

## ✅ Once You Have the ID

Use it to troubleshoot:

```bash
# Check analysis status
curl -X POST https://vett-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { analysis(id: \"YOUR_ANALYSIS_ID\") { id status createdAt updatedAt } }"
  }'

# Or use the troubleshooting script
./scripts/troubleshoot-analysis.sh YOUR_ANALYSIS_ID
```

---

**The easiest way is usually Method 1 (check the URL) or Method 3 (submit a new test analysis and capture the ID).**

