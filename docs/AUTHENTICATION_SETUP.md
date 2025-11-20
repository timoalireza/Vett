# Clerk Authentication Setup Guide

This document explains how Clerk.dev authentication has been integrated into Vett.

## ✅ Implementation Complete

### Backend (API)

1. **Authentication Plugin** (`apps/api/src/plugins/auth.ts`)
   - Uses `@clerk/backend` to verify JWT tokens from Authorization headers
   - Extracts user ID and email from Clerk tokens
   - Sets user context on Fastify requests
   - Allows unauthenticated requests for development (can be made stricter)

2. **User Service** (`apps/api/src/services/user-service.ts`)
   - Syncs Clerk users to local database
   - Creates/updates user records when authenticated
   - Provides helper methods to get users by ID

3. **GraphQL Integration**
   - Auth context passed to all resolvers
   - `submitAnalysis` mutation associates analyses with authenticated users
   - `analysis` query includes authorization check (users can only access their own analyses)

4. **Analysis Service Updates**
   - `enqueueAnalysis` now accepts optional `userId` parameter
   - Analyses are associated with users when created
   - `getAnalysisSummary` includes `userId` in response

### Mobile App

1. **GraphQL Client** (`apps/mobile/src/api/graphql.ts`)
   - Updated to include Authorization header when token is available
   - Placeholder for Clerk token retrieval (needs Clerk React Native SDK)

## 🔧 Setup Instructions

### 1. Get Clerk API Keys

1. Sign up at https://clerk.com
2. Create a new application
3. Go to **API Keys** in the dashboard
4. Copy your **Secret Key** (starts with `sk_`)

### 2. Configure Backend

1. Add `CLERK_SECRET_KEY` to `apps/api/.env`:
   ```
   CLERK_SECRET_KEY=sk_test_...
   ```

2. The auth plugin is already registered in `apps/api/src/index.ts`

### 3. Configure Mobile App (TODO)

The mobile app needs Clerk React Native SDK integration:

```bash
# Install Clerk React Native SDK
pnpm --filter mobile add @clerk/clerk-react-native
```

Then update `apps/mobile/src/api/graphql.ts` to use Clerk:

```typescript
import { useAuth } from "@clerk/clerk-react-native";

async function getAuthToken(): Promise<string | null> {
  const { getToken } = useAuth();
  return await getToken();
}
```

## 🔒 Authorization Rules

- **Analyses**: Users can only access their own analyses
- **Collections**: Users can only access their own collections (to be implemented)
- **Public Collections**: Future feature - allow public read access

## 🧪 Testing

### Test Authentication Flow

1. **Get Clerk Token** (from mobile app or Postman):
   - Sign in via Clerk
   - Get session token from Clerk

2. **Make Authenticated Request**:
   ```bash
   curl -X POST http://localhost:4000/graphql \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
     -d '{"query": "mutation { submitAnalysis(input: { mediaType: \"text\", text: \"test\" }) { analysisId } }"}'
   ```

3. **Verify User Association**:
   - Check database: `analyses` table should have `user_id` set
   - Query analysis: should only return if you're the owner

## 📝 Environment Variables

### API (`apps/api/.env`)
```env
CLERK_SECRET_KEY=sk_test_...  # Required
```

### Mobile (Future - via EAS or env file)
```env
CLERK_PUBLISHABLE_KEY=pk_test_...  # For Clerk React Native SDK
```

## 🚨 Production Checklist

Before going to production:

- [ ] Create production Clerk instance
- [ ] Update `CLERK_SECRET_KEY` to production key
- [ ] Enable stricter auth requirements (remove unauthenticated fallback)
- [ ] Test authentication flow end-to-end
- [ ] Set up Clerk webhooks for user sync (optional)
- [ ] Configure CORS to allow Clerk domains
- [ ] Test authorization checks

## 🔗 Related Files

- `apps/api/src/plugins/auth.ts` - Authentication plugin
- `apps/api/src/services/user-service.ts` - User sync service
- `apps/api/src/resolvers/index.ts` - GraphQL resolvers with auth
- `apps/api/src/services/analysis-service.ts` - Analysis service with user association
- `apps/mobile/src/api/graphql.ts` - Mobile GraphQL client

## 📚 Clerk Documentation

- [Clerk Backend SDK](https://clerk.com/docs/backend-requests/overview)
- [Clerk React Native](https://clerk.com/docs/quickstarts/expo)
- [Clerk Production Guide](https://clerk.com/docs/deployments/overview)

