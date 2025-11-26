# Instaloader Integration

This worker service integrates [Instaloader](https://instaloader.github.io) for extracting Instagram content including media, captions, and metadata.

## Setup

### 1. Install Python Dependencies

```bash
cd apps/worker
pip3 install -r scripts/requirements.txt
```

Or install directly:
```bash
pip3 install instaloader
```

### 2. Environment Variables (Optional)

For private Instagram posts, add credentials to `.env`:

```bash
INSTAGRAM_USERNAME=your_username
INSTAGRAM_PASSWORD=your_password
```

**Note:** Using credentials allows access to private posts you follow, but Instagram may require 2FA. For production, consider using Instagram Basic Display API or Instagram Graph API instead.

### 3. Verify Installation

Test the Python script:
```bash
python3 apps/worker/scripts/instaloader_extract.py "https://www.instagram.com/p/SHORTCODE/"
```

## How It Works

1. **Primary Method: Instaloader**
   - Extracts post/reel metadata, captions, hashtags, author info
   - Downloads media files (images/videos) temporarily
   - Processes media through OpenAI Vision API for analysis
   - Returns structured data with text and media descriptions

2. **Fallback: HTML Scraping**
   - If Instaloader fails or is unavailable, falls back to HTML scraping
   - Uses multiple extraction strategies for reliability

## Features

- ✅ Extracts captions, hashtags, author information
- ✅ Downloads and processes images through OpenAI Vision API
- ✅ Handles both posts and reels
- ✅ Supports carousel posts (multiple images)
- ✅ Automatic cleanup of temporary media files
- ✅ Graceful fallback to HTML scraping

## Limitations

- **Video Analysis**: Videos are downloaded but only thumbnails can be analyzed (OpenAI Vision API doesn't support full video analysis)
- **Private Posts**: Requires Instagram credentials and may need 2FA
- **Rate Limiting**: Instagram may rate limit requests - Instaloader handles this automatically
- **Python Dependency**: Requires Python 3 and Instaloader installed

## Troubleshooting

**Error: "Python 3 or Instaloader not found"**
- Install Python 3: `brew install python3` (macOS) or `apt-get install python3` (Linux)
- Install Instaloader: `pip3 install instaloader`

**Error: "Two-factor authentication required"**
- Instagram requires 2FA for some accounts
- Consider using Instagram Basic Display API instead
- Or disable Instaloader and use HTML scraping fallback

**Error: "Post not found"**
- Post may be private or deleted
- If private, ensure credentials are set and you follow the account

## Production Recommendations

For production use, consider:
1. **Instagram Basic Display API** - Official API for accessing user content
2. **Instagram Graph API** - For business accounts and pages
3. **Rate Limiting** - Implement proper rate limiting to avoid Instagram blocks
4. **Caching** - Cache extracted content to reduce API calls

