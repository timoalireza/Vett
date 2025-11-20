# Testing Guide

## Overview

Vett uses **Vitest** for testing. This guide covers how to write and run tests.

## Quick Start

### Run Tests

```bash
# Run all tests
pnpm --filter vett-api test

# Run tests in watch mode
pnpm --filter vett-api test:watch

# Run tests with UI
pnpm --filter vett-api test:ui

# Run tests with coverage
pnpm --filter vett-api test:coverage
```

---

## Test Structure

```
apps/api/src/
├── __tests__/
│   ├── setup.ts              # Global test setup
│   ├── unit/                 # Unit tests
│   │   └── subscription-service.test.ts
│   ├── integration/          # Integration tests
│   │   └── health.test.ts
│   └── helpers/             # Test utilities
│       ├── test-server.ts
│       └── db.ts
```

---

## Writing Tests

### Unit Tests

Test individual functions/services in isolation:

```typescript
import { describe, it, expect } from "vitest";
import { subscriptionService } from "../../services/subscription-service.js";

describe("SubscriptionService", () => {
  it("should create FREE subscription", async () => {
    const subscription = await subscriptionService.getOrCreateSubscription(userId);
    expect(subscription.plan).toBe("FREE");
  });
});
```

### Integration Tests

Test API endpoints and full request/response cycles:

```typescript
import { describe, it, expect } from "vitest";
import { createTestServer } from "../helpers/test-server.js";

describe("Health Endpoints", () => {
  it("should return health status", async () => {
    const server = await createTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/health"
    });
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
  });
});
```

---

## Test Helpers

### Database Helpers

```typescript
import { createTestUser, cleanupTestData } from "../helpers/db.js";

beforeEach(async () => {
  await cleanupTestData();
});

it("should create user", async () => {
  const user = await createTestUser("test_user_123");
  expect(user).toBeDefined();
});
```

### Server Helpers

```typescript
import { createTestServer, closeTestServer } from "../helpers/test-server.js";

let server;

beforeAll(async () => {
  server = await createTestServer();
});

afterAll(async () => {
  await closeTestServer();
});
```

---

## Test Coverage

### Current Coverage Goals

- **Lines:** 70%
- **Functions:** 70%
- **Branches:** 70%
- **Statements:** 70%

### View Coverage

```bash
# Generate coverage report
pnpm --filter vett-api test:coverage

# Open HTML report
open coverage/index.html
```

---

## Critical Test Areas

### Priority 1: Authentication & Authorization

- [ ] Clerk token verification
- [ ] User context in requests
- [ ] Protected routes

### Priority 2: Subscription Limits

- [ ] FREE tier: 10 analyses/month
- [ ] PLUS tier: Unlimited analyses
- [ ] Usage tracking
- [ ] Watermark logic

### Priority 3: Analysis Flow

- [ ] Submit analysis → Queue job
- [ ] Get analysis results
- [ ] Error handling

### Priority 4: GraphQL Resolvers

- [ ] Query resolvers
- [ ] Mutation resolvers
- [ ] Error handling
- [ ] Authorization checks

---

## Test Database Setup

### Option 1: Separate Test Database (Recommended)

```bash
# Create test database
createdb vett_test

# Set in .env.test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vett_test
```

### Option 2: Use Test Containers

```typescript
// Use Docker containers for isolated test environment
import { PostgreSqlContainer } from "@testcontainers/postgresql";
```

---

## Running Tests in CI/CD

### GitHub Actions Example

```yaml
- name: Run tests
  run: |
    pnpm --filter vett-api test:coverage
    
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./apps/api/coverage/lcov.info
```

---

## Best Practices

### 1. Isolate Tests

- Each test should be independent
- Clean up test data between tests
- Use `beforeEach`/`afterEach` for setup/teardown

### 2. Use Descriptive Names

```typescript
// Good
it("should prevent analysis when FREE user exceeds monthly limit", ...)

// Bad
it("test limit", ...)
```

### 3. Test Behavior, Not Implementation

```typescript
// Good - tests behavior
expect(subscription.plan).toBe("FREE");

// Bad - tests implementation details
expect(subscription._internalState).toBe("initialized");
```

### 4. Use Test Fixtures

```typescript
const testUser = {
  externalId: "test_user_123",
  email: "test@example.com"
};
```

### 5. Mock External Services

```typescript
import { vi } from "vitest";

vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn().mockResolvedValue({ sub: "user_123" })
}));
```

---

## Example Tests

### Service Test

```typescript
describe("SubscriptionService", () => {
  it("should create FREE subscription for new user", async () => {
    const user = await createTestUser("test_user");
    const subscription = await subscriptionService.getOrCreateSubscription(user.id);
    
    expect(subscription.plan).toBe("FREE");
    expect(subscription.status).toBe("ACTIVE");
  });
});
```

### API Endpoint Test

```typescript
describe("POST /graphql", () => {
  it("should execute GraphQL query", async () => {
    const server = await createTestServer();
    const response = await server.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query: "{ health { status } }"
      }
    });
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.health.status).toBe("Vett API online");
  });
});
```

---

## Troubleshooting

### Tests Failing Due to Database

**Problem:** Tests fail with database connection errors

**Solution:**
1. Ensure test database exists: `createdb vett_test`
2. Run migrations on test database
3. Check `TEST_DATABASE_URL` in `.env.test`

### Tests Hanging

**Problem:** Tests hang and never complete

**Solution:**
1. Check for unclosed database connections
2. Ensure `afterAll` hooks close servers
3. Increase timeout: `testTimeout: 30000`

### Coverage Not Generating

**Problem:** Coverage report not created

**Solution:**
1. Install coverage provider: `pnpm add -D @vitest/coverage-v8`
2. Check `vitest.config.ts` has coverage configured
3. Run with `--coverage` flag

---

## Next Steps

1. ✅ Test infrastructure set up
2. [ ] Write tests for subscription service
3. [ ] Write tests for analysis service
4. [ ] Write tests for GraphQL resolvers
5. [ ] Write tests for API endpoints
6. [ ] Set up CI/CD test runs

---

**Need Help?**
- Vitest Docs: https://vitest.dev/
- Fastify Testing: https://www.fastify.io/docs/latest/Guides/Testing/

