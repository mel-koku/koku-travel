import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "src/**/__tests__/**/*.test.ts"],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});

