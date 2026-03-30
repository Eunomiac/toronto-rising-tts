import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const bridgeRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: bridgeRoot,
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    fileParallelism: false,
  },
});
