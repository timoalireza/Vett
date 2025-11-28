# SocialKit Integration Setup Guide

SocialKit has been integrated into the Vett analysis pipeline to extract transcriptions from TikTok and YouTube Shorts videos.

## Overview

When a user submits a TikTok or YouTube Shorts URL, the pipeline will:
1. Detect the platform (TikTok or YouTube Shorts)
2. Extract transcription using SocialKit API
3. Format transcription with video metadata (title, author, description)
4. Feed transcription to the analysis pipeline for claim extraction and verification

## Prerequisites

1. **SocialKit Account**: Sign up at [socialkit.dev](https://socialkit.dev)
2. **API Key**: Get your API access key from SocialKit dashboard

## Step 1: Configure Environment Variable

Add your SocialKit API key to your `.env` file:

```bash
SOCIALKIT_API_KEY=your_api_key_here
```

## Step 2: Supported URLs

The integration automatically detects and processes:

### TikTok URLs:
- `https://www.tiktok.com/@username/video/1234567890`
- `https://vm.tiktok.com/ABC123/`
- `https://tiktok.com/@username/video/1234567890`

### YouTube Shorts URLs:
- `https://www.youtube.com/shorts/VIDEO_ID`
- `https://youtu.be/VIDEO_ID` (if detected as Shorts)
- `https://www.youtube.com/watch?v=VIDEO_ID` (if detected as Shorts)

## Step 3: How It Works

### Platform Detection
The system automatically detects TikTok and YouTube Shorts URLs using pattern matching:
- TikTok: Detects `tiktok.com` or `vm.tiktok.com` domains
- YouTube Shorts: Detects `/shorts/` path or standard YouTube URLs (for Shorts)

### Transcription Extraction
1. **TikTok**: Calls SocialKit TikTok Transcript API
2. **YouTube Shorts**: Calls SocialKit YouTube Transcript API

### Content Formatting
The transcription is formatted with metadata:
```
Title: Video Title
Author: @username
Description: Video description

Transcript: Full transcription text...
```

### Analysis Pipeline
The formatted transcription is then fed into the standard analysis pipeline:
- Topic classification
- Claim extraction
- Evidence retrieval
- Verdict reasoning

## Step 4: Error Handling

If SocialKit transcription fails:
- The system falls back to generic HTML scraping
- A warning is logged but doesn't block the analysis
- The user will see a lower quality extraction

## Step 5: Quality Assessment

Transcriptions are assessed for quality:
- **Excellent**: 50+ words, good diversity
- **Good**: 30+ words
- **Fair**: 15+ words
- **Poor**: 8+ words
- **Insufficient**: <8 words

Low-quality transcriptions may trigger recommendations for alternative input methods.

## API Endpoints Used

### TikTok Transcript
- **Endpoint**: `GET https://api.socialkit.dev/tiktok/transcript`
- **Parameters**:
  - `access_key`: Your SocialKit API key
  - `url`: TikTok video URL

### YouTube Transcript
- **Endpoint**: `GET https://api.socialkit.dev/youtube/transcript`
- **Parameters**:
  - `access_key`: Your SocialKit API key
  - `url`: YouTube video URL

## Response Format

SocialKit returns JSON with:
```json
{
  "transcript": "Full transcription text...",
  "language": "en",
  "duration": 60,
  "segments": [
    {
      "text": "Segment text",
      "start": 0,
      "end": 5
    }
  ],
  "title": "Video Title",
  "author": "username",
  "description": "Video description",
  "views": 1000000,
  "likes": 50000
}
```

## Troubleshooting

### Transcription Not Working

1. **Check API Key**: Verify `SOCIALKIT_API_KEY` is set correctly
2. **Check URL Format**: Ensure URL is a valid TikTok or YouTube Shorts link
3. **Check API Limits**: Verify your SocialKit account has available credits
4. **Check Logs**: Look for `[SocialKit]` log messages in worker logs

### Empty Transcripts

- Some videos may not have transcripts (no captions available)
- Private or deleted videos will fail
- Videos in unsupported languages may return empty results

### Fallback Behavior

If SocialKit fails, the system:
1. Logs a warning
2. Falls back to generic HTML scraping
3. Attempts to extract any available text from the page
4. Continues with analysis using whatever content is found

## Testing

Test the integration:

1. **TikTok Test**:
   ```bash
   # Submit a TikTok URL through the API
   curl -X POST http://localhost:4000/graphql \
     -H "Content-Type: application/json" \
     -d '{
       "query": "mutation { submitAnalysis(input: { text: \"https://www.tiktok.com/@username/video/1234567890\", mediaType: \"text\" }) { analysisId } }"
     }'
   ```

2. **YouTube Shorts Test**:
   ```bash
   # Submit a YouTube Shorts URL
   curl -X POST http://localhost:4000/graphql \
     -H "Content-Type: application/json" \
     -d '{
       "query": "mutation { submitAnalysis(input: { text: \"https://www.youtube.com/shorts/VIDEO_ID\", mediaType: \"text\" }) { analysisId } }"
     }'
   ```

## Files Modified/Created

### Created
- `apps/worker/src/pipeline/ingestion/extractors/socialkit.ts` - SocialKit API integration
- `apps/worker/SOCIALKIT_SETUP.md` - This setup guide

### Modified
- `apps/worker/src/env.ts` - Added `SOCIALKIT_API_KEY` environment variable
- `apps/worker/src/pipeline/ingestion/platforms.ts` - Added TikTok and YouTube platform detection
- `apps/worker/src/pipeline/ingestion/link-fetcher.ts` - Integrated SocialKit transcription extraction
- `apps/worker/src/pipeline/ingestion/quality.ts` - Added TikTok/YouTube quality assessment

## Next Steps

1. ✅ Add SocialKit API key to environment
2. ✅ Test with sample TikTok and YouTube Shorts URLs
3. ✅ Monitor transcription quality and success rates
4. ⏳ Consider adding rate limiting for SocialKit API calls
5. ⏳ Add caching for frequently analyzed videos
6. ⏳ Add support for regular YouTube videos (not just Shorts)

## Related Documentation

- [SocialKit API Documentation](https://docs.socialkit.dev)
- [TikTok Transcript API](https://docs.socialkit.dev/api-reference/tiktok-transcript-api)
- [YouTube Transcript API](https://docs.socialkit.dev/api-reference/youtube-transcript-api)

