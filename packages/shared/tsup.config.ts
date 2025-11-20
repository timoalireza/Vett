import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: {
    resolve: true
  },
  clean: true,
  sourcemap: false,
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".js" : ".cjs"
    };
  }
});

