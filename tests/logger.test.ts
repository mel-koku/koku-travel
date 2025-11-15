import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
// Unmock the logger to test actual implementation
vi.unmock("@/lib/logger");
import { logger, sanitizeContext } from "../src/lib/logger";

describe("Logger", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set to development for tests that need it
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalEnv) {
      // Use type assertion to allow assignment for test cleanup
      (process.env as { NODE_ENV?: string }).NODE_ENV = originalEnv;
    }
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

    it("should sanitize keys containing sensitive words", () => {
      const context = {
        userPassword: "secret123",
        apiToken: "abc123",
        secretKey: "key123",
        authorizationHeader: "Bearer token",
        cookieValue: "session123",
        normalData: "safe",
      };
      const sanitized = sanitizeContext(context);
      expect(sanitized.userPassword).toBe("[REDACTED]");
      expect(sanitized.apiToken).toBe("[REDACTED]");
      expect(sanitized.secretKey).toBe("[REDACTED]");
      expect(sanitized.authorizationHeader).toBe("[REDACTED]");
      expect(sanitized.cookieValue).toBe("[REDACTED]");
      expect(sanitized.normalData).toBe("safe");
    });

    it("should handle null and undefined values", () => {
      const context = {
        password: null,
        token: undefined,
        normalData: "safe",
      };
      const sanitized = sanitizeContext(context);
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.token).toBe("[REDACTED]");
      expect(sanitized.normalData).toBe("safe");
    });

    it("should preserve non-sensitive data types", () => {
      const context = {
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: "value" },
        password: "secret",
      };
      const sanitized = sanitizeContext(context);
      expect(sanitized.number).toBe(123);
      expect(sanitized.boolean).toBe(true);
      expect(sanitized.array).toEqual([1, 2, 3]);
      expect(sanitized.object).toEqual({ nested: "value" });
      expect(sanitized.password).toBe("[REDACTED]");
    });
  });
});

