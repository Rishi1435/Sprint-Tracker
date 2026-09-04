import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Mirrors the `@/*` alias from tsconfig.json so tests import the same way the
  // app does.
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // Playwright specs live under tests/e2e and are run by `npm run test:e2e`.
    exclude: ["node_modules/**", "tests/e2e/**", ".next/**"],
  },
});
