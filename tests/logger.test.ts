import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { logger, sanitizeContext } from "../src/lib/logger";

describe("Logger", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set to development for tests that need it
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe("debug", () => {
    it("should have debug method", () => {
      expect(typeof logger.debug).toBe("function");
      // Just verify it doesn't throw
      expect(() => logger.debug("Test debug message", { test: true })).not.toThrow();
    });
  });

  describe("info", () => {
    it("should have info method", () => {
      expect(typeof logger.info).toBe("function");
      // Just verify it doesn't throw
      expect(() => logger.info("Test info message", { test: true })).not.toThrow();
    });
  });

  describe("warn", () => {
    it("should log warning messages", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      logger.warn("Test warning message", { test: true });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("error", () => {
    it("should log error messages", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const testError = new Error("Test error");
      logger.error("Test error message", testError, { test: true });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should handle non-Error objects", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.error("Test error message", "string error", { test: true });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("sanitizeContext", () => {
    it("should sanitize sensitive keys", () => {
      const context = {
        password: "secret123",
        token: "abc123",
        apiKey: "key123",
        normalData: "safe",
      };
      const sanitized = sanitizeContext(context);
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.token).toBe("[REDACTED]");
      expect(sanitized.apiKey).toBe("[REDACTED]");
      expect(sanitized.normalData).toBe("safe");
    });

    it("should handle case-insensitive matching", () => {
      const context = {
        Password: "secret123",
        TOKEN: "abc123",
        normalData: "safe",
      };
      const sanitized = sanitizeContext(context);
      expect(sanitized.Password).toBe("[REDACTED]");
      expect(sanitized.TOKEN).toBe("[REDACTED]");
      expect(sanitized.normalData).toBe("safe");
    });

    it("should handle empty context", () => {
      const sanitized = sanitizeContext({});
      expect(sanitized).toEqual({});
    });
  });
});

