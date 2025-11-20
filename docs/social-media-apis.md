# Social Media API Integration Guide

This document outlines the APIs and services that can enhance social media content extraction for X (Twitter), Instagram Reels, and Threads.

## Current Implementation

The worker pipeline now includes platform-specific extractors that use:
- **X/Twitter**: oEmbed API (free, no auth required) + HTML scraping fallback
- **Instagram**: HTML scraping with enhanced Reel support
- **Threads**: HTML scraping

## Recommended API Integrations

### X (Twitter) / Twitter API v2

**Status**: Currently using oEmbed API (free, limited metadata)

**Recommended**: Twitter API v2 for better extraction

**Benefits**:
- Full tweet text, including threads
- Author metadata, verification status
- Engagement metrics (likes, retweets, replies)
- Media attachments (images, videos)
- Better rate limits

**Setup**:
1. Create a Twitter Developer account: https://developer.twitter.com/
2. Create a new App and Project
3. Generate API keys (Bearer Token or OAuth 1.0a)
4. Add to environment variables:

```env
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_BEARER_TOKEN=
```

**Cost**: Free tier available (limited requests/month), paid plans available

**Implementation Note**: Update `extractors/twitter.ts` to use Twitter API v2 when credentials are available.

---

### Instagram / Instagram Graph API

**Status**: Currently using HTML scraping (fragile, may break)

**Recommended**: Instagram Graph API or Instagram Basic Display API

**Benefits**:
- Reliable content extraction
- Caption text, hashtags, mentions
- Media URLs (images, videos)
- Author information
- Engagement metrics
- Works with Reels, Posts, Stories

**Setup**:
1. Create a Facebook App: https://developers.facebook.com/
2. Add Instagram Basic Display or Instagram Graph API product
3. Configure OAuth redirect URIs
4. Generate access tokens
5. Add to environment variables:

```env
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
INSTAGRAM_ACCESS_TOKEN=
# OR for Basic Display API:
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
```

**Cost**: Free for basic usage, rate limits apply

**Limitations**:
- Requires user authentication for Basic Display API
- Graph API requires business/creator accounts
- Some endpoints require app review

**Alternative**: Third-party APIs like RapidAPI Instagram scraper (paid service)

---

### Threads / Meta Graph API

**Status**: Currently using HTML scraping (fragile)

**Recommended**: Meta Graph API (Threads support)

**Benefits**:
- Official API access
- Reliable content extraction
- Author information
- Engagement metrics

**Setup**:
1. Create a Meta App: https://developers.facebook.com/
2. Add Threads API product (if available)
3. Configure OAuth and permissions
4. Generate access tokens
5. Add to environment variables:

```env
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
THREADS_ACCESS_TOKEN=
```

**Cost**: Free tier available, rate limits apply

**Status**: Threads API is relatively new - check Meta's developer documentation for latest availability

**Alternative**: Third-party APIs like RapidAPI Threads scraper (paid service)

---

## Third-Party API Services

### RapidAPI Social Media Scrapers

**Services Available**:
- Instagram Scraper API
- Twitter Scraper API  
- Threads Scraper API

**Benefits**:
- Unified interface
- No OAuth setup required
- Handles rate limiting
- More reliable than scraping

**Setup**:
1. Sign up at https://rapidapi.com/
2. Subscribe to relevant APIs
3. Get API keys
4. Add to environment variables:

```env
RAPIDAPI_KEY=
RAPIDAPI_INSTAGRAM_HOST=
RAPIDAPI_TWITTER_HOST=
RAPIDAPI_THREADS_HOST=
```

**Cost**: Pay-per-use or subscription plans

---

## Implementation Priority

1. **High Priority**: Twitter API v2 (easiest to implement, free tier available)
2. **Medium Priority**: Instagram Graph API (requires app review but more reliable)
3. **Low Priority**: Threads API (new, may have limited availability)

## Environment Variables Template

Add these to `apps/worker/env.example`:

```env
# Social Media APIs (Optional - enhances extraction quality)
# Twitter API v2
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_BEARER_TOKEN=

# Instagram Graph API
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
INSTAGRAM_ACCESS_TOKEN=

# Meta/Threads API
META_APP_ID=
META_APP_SECRET=
THREADS_ACCESS_TOKEN=

# RapidAPI (Alternative)
RAPIDAPI_KEY=
RAPIDAPI_INSTAGRAM_HOST=
RAPIDAPI_TWITTER_HOST=
RAPIDAPI_THREADS_HOST=
```

## Fallback Strategy

The current implementation uses a fallback strategy:
1. Try platform-specific API extraction (if credentials available)
2. Try platform-specific HTML scraping
3. Fall back to generic HTML extraction

This ensures the pipeline continues to work even without API credentials, though with potentially lower quality extraction.

