import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const polyfillPath = join(dirname(fileURLToPath(import.meta.url)), "drizzle-polyfill.mjs");
const cliPath = join(dirname(fileURLToPath(import.meta.url)), "../node_modules/drizzle-kit/bin.cjs");

const [command, ...args] = process.argv.slice(2);

const child = spawn(
  process.execPath,
  ["--import", polyfillPath, cliPath, command, ...args],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_NO_WARNINGS: "1"
    }
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

