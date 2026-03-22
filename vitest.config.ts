import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        ".next/**",
        "coverage/**",
        "**/*.d.ts",
        "**/*.config.ts",
        "**/dist/**",
        "**/e2e/**",
        "**/__tests__/**",
        "test-setup.ts",
      ],
      include: ["lib/**/*.ts", "store/slices/**/*.ts"],
      provider: "istanbul",
      reporter: ["text", "json", "html"],
    },
    environment: "jsdom",
    exclude: [".next/**", "e2e/**", "node_modules/**"],
    include: ["lib/__tests__/**/*.test.ts", "store/slices/__tests__/**/*.test.ts"],
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
