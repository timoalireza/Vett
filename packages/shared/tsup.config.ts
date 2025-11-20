import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: false,
  skipNodeModulesBundle: true,
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".js" : ".cjs"
    };
  }
});

