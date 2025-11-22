import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: false, // Disable DTS generation to avoid cross-package import issues
  splitting: false,
  sourcemap: true,
  clean: true,
  // Ensure all files are included in the build
  noExternal: [],
  // Resolve .js imports to .ts files
  esbuildOptions(options) {
    options.resolveExtensions = [".ts", ".tsx", ".js", ".jsx"];
  },
});
