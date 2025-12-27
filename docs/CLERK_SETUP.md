# Clerk Authentication Setup Guide

This guide explains how to configure Clerk authentication for the Vett mobile app with email and Apple sign-in options.

## Prerequisites

1. A Clerk account (sign up at [clerk.com](https://clerk.com))
2. Clerk application created in your Clerk dashboard

## Step 1: Configure Clerk Dashboard

### 1.1 Enable Authentication Methods

1. Go to your Clerk Dashboard → **User & Authentication** → **Email, Phone, Username**
2. Enable **Email address** as a sign-in method
3. Configure email verification settings (recommended: require email verification)

### 1.2 Enable OAuth Providers

#### Google OAuth (coming soon)

Google is currently **disabled in the app UI** until it’s configured in Clerk and the Google developer console.

#### Apple OAuth

1. Go to **User & Authentication** → **Social Connections**
2. Click **Add connection** → Select **Apple**
3. Follow the setup instructions:
   - Create a Service ID in [Apple Developer Portal](https://developer.apple.com/)
   - Configure Sign in with Apple
   - Add redirect URIs:
     - `https://your-clerk-domain.clerk.accounts.dev/v1/oauth_callback`
     - `vett://onboarding/trust`
     - `vett://analyze`
   - Copy the Client ID and Client Secret to Clerk

### 1.3 Configure Application Settings

1. Go to **Settings** → **Domains**
2. Note your Clerk domain (e.g., `your-app.clerk.accounts.dev`)

3. Go to **Settings** → **API Keys**
4. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
5. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

## Step 2: Configure Mobile App

### 2.1 Set Environment Variables

Create a `.env` file in `apps/mobile/` or set environment variables:

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Or add to `app.json`:

```json
{
  "expo": {
    "extra": {
      "clerkPublishableKey": "pk_test_..."
    }
  }
}
```

### 2.2 Configure Deep Linking (for OAuth)

The app is already configured with the scheme `vett://` in `app.json`. Make sure your Clerk OAuth redirect URIs include:

- `vett://onboarding/trust`
- `vett://analyze`

## Step 3: Configure API Server

### 3.1 Set Railway Environment Variables

In your Railway API service, add:

```
CLERK_SECRET_KEY=sk_test_... (or sk_live_... for production)
```

### 3.2 Verify API Configuration

The API already has Clerk authentication configured in `apps/api/src/plugins/auth.ts`. It will:

- Verify JWT tokens from Clerk
- Extract user information from tokens
- Set `request.userId` and `request.user` for authenticated requests

## Step 4: Test Authentication

### 4.1 Test Email Sign-Up

1. Open the mobile app
2. Tap "Sign Up"
3. Enter email and password
4. Check email for verification code
5. Enter code to complete sign-up

### 4.2 Test Apple Sign-In

1. Open the mobile app
2. Tap "Continue with Apple"
3. Complete Apple Sign-In flow
4. Should redirect back to app and sign in

## Step 5: Production Setup

### 5.1 Switch to Production Keys

1. In Clerk Dashboard, go to **Settings** → **API Keys**
2. Copy your **Production Publishable Key** (`pk_live_...`)
3. Copy your **Production Secret Key** (`sk_live_...`)
4. Update environment variables:
   - Mobile app: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - API: `CLERK_SECRET_KEY`

### 5.2 Configure Production OAuth

1. Update OAuth redirect URIs in Google/Apple developer consoles to include production URLs
2. Update Clerk OAuth settings with production credentials

## Troubleshooting

### Issue: "Clerk publishable key not found"

**Solution**: Make sure `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is set in your environment or `app.json`

### Issue: OAuth redirect not working

**Solution**: 
1. Verify redirect URIs match in Clerk dashboard and OAuth provider settings
2. Ensure app scheme (`vett://`) is configured correctly
3. Check that `expo-linking` is properly installed

### Issue: API authentication failing

**Solution**:
1. Verify `CLERK_SECRET_KEY` is set in Railway
2. Check API logs for authentication errors
3. Ensure the secret key matches the publishable key (both test or both live)

### Issue: Email verification not working

**Solution**:
1. Check Clerk email settings
2. Verify email templates are configured
3. Check spam folder for verification emails

## Additional Resources

- [Clerk React Native Documentation](https://clerk.com/docs/quickstarts/expo)
- [Clerk OAuth Setup](https://clerk.com/docs/authentication/social-connections/overview)
- [Expo Deep Linking](https://docs.expo.dev/guides/linking/)


