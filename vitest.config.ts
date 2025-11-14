import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}", "src/**/__tests__/**/*.test.{ts,tsx}"],
    testTimeout: 10000,
    hookTimeout: 10000,
    setupFiles: ["./tests/setup.ts"],
  },
});

