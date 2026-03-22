import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: [".next/**", "e2e/**", "node_modules/**"],
    include: ["lib/__tests__/**/*.test.ts"],
    fileParallelism: false,
    globals: true,
    maxWorkers: 1,
    pool: "threads",
    setupFiles: ["./test-setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
