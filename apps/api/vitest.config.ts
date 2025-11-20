import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/__tests__/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/dist/",
        "**/build/"
      ],
      thresholds: {
        // Start with lower thresholds, increase as we add more tests
        lines: 50,        // Current: 50% - increase to 70% as we add tests
        functions: 30,    // Current: 31.88% - increase to 70% as we add tests
        branches: 50,     // Current: 54.7% - increase to 70% as we add tests
        statements: 50    // Current: 50% - increase to 70% as we add tests
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src")
    }
  }
});

