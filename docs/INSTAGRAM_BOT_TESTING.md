# Instagram DM Bot Testing Guide

## Prerequisites

### 1. Environment Variables Setup

Ensure these environment variables are set in Railway (or your `.env` file):

```bash
# Instagram API Configuration
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your_random_verify_token  # Generate a random string
INSTAGRAM_PAGE_ACCESS_TOKEN=your_page_access_token
INSTAGRAM_PAGE_ID=your_page_id

# Base URLs
APP_BASE_URL=https://app.vett.xyz
API_BASE_URL=https://api.vett.xyz
```

### 2. Meta App Configuration

1. **Go to [Meta for Developers](https://developers.facebook.com/)**
2. **Select your app** → Instagram Messaging → Settings
3. **Configure Webhook:**
   - Callback URL: `https://api.vett.xyz/webhooks/instagram`
   - Verify Token: Use the same value as `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`
   - Subscription Fields: Enable `messages`
4. **Get Page Access Token:**
   - Go to Instagram Messaging → Settings
   - Generate a Page Access Token with `instagram_basic`, `pages_messaging`, and `pages_read_engagement` permissions
   - Set this as `INSTAGRAM_PAGE_ACCESS_TOKEN`
5. **Get Page ID:**
   - Go to Instagram Messaging → Settings
   - Copy the Page ID (not Instagram Business Account ID)
   - Set this as `INSTAGRAM_PAGE_ID`

## Testing Steps

### Step 1: Verify Webhook Endpoint

Test that the webhook verification endpoint works:

```bash
# Replace YOUR_VERIFY_TOKEN with your actual verify token
curl "https://api.vett.xyz/webhooks/instagram?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
```

**Expected Response:** `test123`

If you get `403 Forbidden`, check:
- The verify token matches `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`
- The webhook URL is correct in Meta Developer Console

### Step 2: Subscribe to Webhook in Meta

1. In Meta Developer Console → Instagram Messaging → Settings
2. Click "Test" or "Subscribe" button next to your webhook URL
3. Meta will send a GET request to verify the webhook
4. You should see a success message

### Step 3: Test Basic DM Flow

**Send a test message to your Instagram account:**

1. Open Instagram app/web
2. Go to your Instagram Business Account (the one connected to your Meta app)
3. Send a DM to your account with a simple text message like: `Hello, test message`

**Check API logs:**
- You should see webhook POST requests in Railway logs
- Look for `[Instagram]` log entries
- Check for any errors

### Step 4: Test Analysis via DM

**Test 1: Send a link for analysis**

Send a DM with a URL:
```
https://example.com/article
```

**Expected behavior:**
- Bot should acknowledge receipt
- Analysis should be queued
- Bot should send analysis results when complete
- Results should include a link to `app.vett.xyz/result/{analysisId}`

**Test 2: Send text for analysis**

Send a DM with text:
```
This is a test claim that needs fact-checking
```

**Expected behavior:**
- Bot should process the text
- Analysis should be queued
- Results should be sent via DM

**Test 3: Send image for analysis**

Send a DM with an image attachment

**Expected behavior:**
- Bot should extract image URL
- Analysis should be queued with image input
- Results should be sent via DM

### Step 5: Test Rate Limiting

**Test free tier limit (3 analyses):**

1. Send 3 DMs with different content for analysis
2. All 3 should succeed
3. Send a 4th DM

**Expected behavior:**
- Bot should respond with rate limit message
- Message should prompt user to download app
- Should include link to `app.vett.xyz`

### Step 6: Test Account Linking

**Test linking Instagram account to app user:**

1. **In the mobile app:**
   - Go to Settings → Linked Accounts
   - Click "Link" next to Instagram
   - Copy the verification code (e.g., `ABC123`)

2. **Send verification code via Instagram DM:**
   - Send the code to your Instagram account: `ABC123`

3. **Back in the mobile app:**
   - The account should show as linked
   - Refresh the linked accounts screen

**Expected behavior:**
- Verification code should be accepted
- Account should link successfully
- User should now have unlimited analyses via DM (if PRO plan)

### Step 7: Test PRO Plan Benefits

**After linking account:**

1. Send multiple DMs for analysis (more than 3)
2. All should succeed without rate limiting

**Expected behavior:**
- No rate limit errors
- All analyses should process successfully
- Results should be sent via DM

## Monitoring & Debugging

### Check API Logs

In Railway, check logs for:
- `[Instagram]` prefixed messages
- Webhook POST requests
- DM sending errors
- Analysis processing errors

### Common Issues

**Issue: Webhook not receiving events**
- Check webhook URL is correct in Meta Developer Console
- Verify webhook is subscribed (green checkmark)
- Check API logs for webhook verification errors
- Ensure `INSTAGRAM_PAGE_ID` matches the recipient ID in webhook events

**Issue: "Failed to send DM" errors**
- Verify `INSTAGRAM_PAGE_ACCESS_TOKEN` is valid
- Check token hasn't expired
- Ensure token has required permissions:
  - `instagram_basic`
  - `pages_messaging`
  - `pages_read_engagement`

**Issue: Rate limiting not working**
- Check `instagramDmUsage` table in database
- Verify usage tracking is incrementing
- Check subscription tier detection logic

**Issue: Account linking not working**
- Verify verification code is being sent to Instagram
- Check `socialAccounts` table for verification codes
- Ensure `linkInstagramAccount` mutation is called after sending code

### Database Queries for Debugging

```sql
-- Check Instagram DM usage
SELECT * FROM instagram_dm_usage ORDER BY updated_at DESC LIMIT 10;

-- Check social account linking
SELECT * FROM social_accounts WHERE platform = 'INSTAGRAM' ORDER BY created_at DESC;

-- Check analyses created via Instagram DM
SELECT id, instagram_user_id, topic, status, created_at 
FROM analyses 
WHERE instagram_user_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;
```

## Testing Checklist

- [ ] Webhook verification endpoint responds correctly
- [ ] Webhook subscribed successfully in Meta Developer Console
- [ ] Can receive DMs via webhook
- [ ] Can send DMs via API
- [ ] Text analysis works via DM
- [ ] Link analysis works via DM
- [ ] Image analysis works via DM
- [ ] Rate limiting works (3 free analyses)
- [ ] Rate limit message includes app download link
- [ ] Account linking works (verification code flow)
- [ ] Linked accounts show unlimited analyses (PRO plan)
- [ ] Analyses created via DM appear in app history
- [ ] Analysis links in DM responses work correctly

## Next Steps After Testing

1. **Monitor production usage:**
   - Set up alerts for webhook errors
   - Monitor DM sending success rate
   - Track analysis completion rate

2. **User onboarding:**
   - Create Instagram post/story promoting DM bot
   - Add instructions in app for linking Instagram account
   - Document DM bot usage in help docs

3. **Optimization:**
   - Adjust rate limits based on usage
   - Optimize DM response formatting
   - Add more content type support if needed

