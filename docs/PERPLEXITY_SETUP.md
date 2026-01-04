# Perplexity AI Integration

This document explains how Perplexity AI is integrated into Vett for real-time fact verification and evidence retrieval.

## Overview

Perplexity AI provides real-time web search with automatic citation extraction, making it ideal for:

1. **Evidence Retrieval** - Finding and citing current sources for claims
2. **Vett Chat** - Providing research-based responses with live citations
3. **Real-Time Verification** - Quick fact-checking with current information

## Features

### 1. Evidence Retrieval with Perplexity

Perplexity is now the **primary evidence retriever** in the analysis pipeline. It automatically:

- Searches the web for relevant, current information
- Provides automatic citations for all sources
- Filters by recency (day, week, month, year)
- Returns structured results with reliability scores

**Benefits over traditional search APIs:**
- Single API call for search + reasoning + citations
- Better source quality and relevance
- Real-time information (updated daily)
- Automatic citation management

### 2. Vett Chat with Citations

Vett Chat now intelligently chooses between Perplexity and OpenAI based on the query:

**Uses Perplexity for:**
- Research questions ("what is...", "who is...", "explain...")
- Requests for recent information ("latest", "recent", "update")
- Explicit requests for sources or evidence

**Uses OpenAI for:**
- Simple clarifications about existing analysis
- Questions that don't require new information

**Chat responses now include:**
- Clickable source links in the mobile UI
- Numbered citations [1], [2], etc.
- Domain names for easy source identification

### 3. Real-Time Fact Verification

New GraphQL mutation: `verifyClaimRealtime`

```graphql
mutation VerifyClaimRealtime($input: RealtimeVerificationInput!) {
  verifyClaimRealtime(input: $input) {
    summary
    verdict
    confidence
    citations
    reasoning
  }
}
```

**Input:**
```graphql
{
  claim: "The claim to verify"
  context: "Optional context for better verification"
}
```

**Response:**
```graphql
{
  summary: "2-3 sentence summary of findings"
  verdict: "VERIFIED | PARTIALLY_VERIFIED | UNVERIFIED | FALSE | NEEDS_CONTEXT"
  confidence: 85  # 0-100
  citations: ["https://source1.com", "https://source2.com"]
  reasoning: "Detailed explanation referencing sources"
}
```

## Setup

### 1. Get Perplexity API Key

1. Go to [Perplexity API Settings](https://www.perplexity.ai/settings/api)
2. Sign up or log in
3. Generate a new API key
4. Copy the key (starts with `pplx-`)

### 2. Configure Environment Variables

**API Service (`apps/api/.env`):**
```bash
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxx
```

**Worker Service (`apps/worker/.env`):**
```bash
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxx
```

### 3. Verify Configuration

The services will automatically detect if Perplexity is configured:

```typescript
// Worker will log on startup:
"[perplexity] API key configured - real-time search enabled"

// Or if not configured:
"[perplexity] API key not configured, using fallback retrievers"
```

## API Details

### Models

Vett uses the **Sonar Large** model with online search:

- **Model:** `llama-3.1-sonar-large-128k-online`
- **Context Window:** 128,000 tokens
- **Features:** Real-time web search, citations, high accuracy

### Pricing (as of January 2025)

- **Sonar Large Online:** $1 per 1M input tokens, $1 per 1M output tokens
- Includes web search and citations at no extra cost
- More cost-effective than OpenAI + separate search APIs

### Rate Limits

- **Free Tier:** 50 requests/day
- **Pro Tier:** 5,000 requests/day
- **Enterprise:** Custom limits

## Implementation Details

### Evidence Retrieval Flow

```typescript
// 1. Perplexity searches web for claim
const result = await perplexity.searchEvidence(claim, topic, {
  recencyFilter: "month"
});

// 2. Returns summary + citations
// {
//   summary: "Analysis with inline citations [1][2]",
//   citations: ["https://source1.com", "https://source2.com"]
// }

// 3. Parsed into evidence results with reliability scores
const evidenceResults = citations.map((url, i) => ({
  provider: "Perplexity",
  url,
  summary: extractedSnippet,
  reliability: calculateReliability(url)
}));
```

### Vett Chat Citation Rendering

Mobile app renders citations as clickable buttons:

```tsx
<TouchableOpacity onPress={() => Linking.openURL(citation)}>
  <Text>[1] reuters.com</Text>
  <Icon name="open-outline" />
</TouchableOpacity>
```

### Recency Filters

Automatically applied based on topic:

- **Politics/Current Events:** `week`
- **Health/Science/Technology:** `month`
- **General:** `year`

## Monitoring

### Metrics

Track Perplexity usage via existing metrics:

```typescript
// Worker logs
"[perplexity] Found 5 evidence results"
"[perplexity] Search failed: [error]"

// API logs
"[VettChat] Using Perplexity for research query"
"[VettChat] Perplexity response generated with 3 citations"
```

### Fallback Behavior

If Perplexity fails or is unavailable:

1. **Evidence Retrieval:** Falls back to Brave Search → Serper → Google Fact Check
2. **Vett Chat:** Falls back to OpenAI with existing context
3. **Real-Time Verification:** Returns error (no fallback for this feature)

## Best Practices

### 1. Query Optimization

- Keep claims concise and specific
- Provide topic context when available
- Use appropriate recency filters

### 2. Citation Management

- Always display citations to users
- Make citations clickable in UI
- Show domain names for easy identification

### 3. Cost Optimization

- Cache evidence results (already implemented)
- Use Perplexity for research, OpenAI for simple clarifications
- Monitor usage via logs

## Troubleshooting

### "Perplexity API key not configured"

**Solution:** Add `PERPLEXITY_API_KEY` to your `.env` file and restart the service.

### "Perplexity API error (401)"

**Solution:** Check that your API key is valid and hasn't expired.

### "No citations returned"

**Causes:**
- Query too vague or abstract
- No recent sources found
- API temporarily unavailable

**Solution:** 
- Make query more specific
- Adjust recency filter
- Check Perplexity API status

### Citations not clickable in mobile app

**Solution:** Ensure you're running the latest version of the mobile app with the updated `VettAIChat` component.

## Migration Notes

### From Previous Version

If upgrading from a version without Perplexity:

1. Add `PERPLEXITY_API_KEY` to environment variables
2. Restart API and Worker services
3. Update mobile app to latest version for clickable citations
4. No database migrations required

### Removing Old Search APIs (Optional)

Perplexity can replace:
- Brave Search API
- Serper.dev API
- Google Fact Check API (for general claims)

To migrate fully:
1. Ensure Perplexity is working
2. Remove old API keys if desired
3. Keep as fallbacks for redundancy (recommended)

## Related Documentation

- [Vett Chat Setup](./VETTAI_SETUP.md)
- [Evidence Pipeline](./worker-pipeline.md)
- [API Reference](./API_REFERENCE.md)

