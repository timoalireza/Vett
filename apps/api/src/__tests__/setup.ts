import { beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { config } from "dotenv";

// Load test environment variables
config({ path: ".env.test" });

// Mock environment variables for testing
process.env.NODE_ENV = "test";

// Use test database if specified, otherwise fall back to main database (tests will clean up)
// For production tests, always use a separate test database!
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/vett";
process.env.REDIS_URL = process.env.TEST_REDIS_URL || process.env.REDIS_URL || "redis://localhost:6379/1"; // Use DB 1 for tests
process.env.CLERK_SECRET_KEY = process.env.TEST_CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY || "sk_test_mock_key_for_testing";
// Disable Sentry in tests (don't set it, or set to undefined)
delete process.env.SENTRY_DSN;

// Mock Sentry to prevent errors in tests
vi.mock("@sentry/node", () => {
  const mockScope = {
    setTag: vi.fn(),
    setContext: vi.fn()
  };
  
  return {
    default: {
      init: vi.fn(),
      captureException: vi.fn(),
      setUser: vi.fn(),
      flush: vi.fn(),
      configureScope: vi.fn((callback) => callback(mockScope))
    },
    init: vi.fn(),
    configureScope: vi.fn((callback) => callback(mockScope)),
    captureException: vi.fn(),
    setUser: vi.fn(),
    flush: vi.fn()
  };
});

// Global test setup
beforeAll(async () => {
  // Setup runs before all tests
  console.log("🧪 Test environment initialized");
});

afterAll(async () => {
  // Cleanup runs after all tests
  console.log("🧹 Test cleanup completed");
});

beforeEach(async () => {
  // Setup before each test
});

afterEach(async () => {
  // Cleanup after each test
});

