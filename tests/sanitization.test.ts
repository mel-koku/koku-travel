import { describe, it, expect } from "vitest";
import {
  sanitizePath,
  sanitizeRedirectUrl,
  sanitizeString,
  isSafeIdentifier,
} from "../src/lib/api/sanitization";

describe("Sanitization Utilities", () => {
  describe("sanitizePath", () => {
    it("should sanitize valid paths", () => {
      expect(sanitizePath("/guides")).toBe("/guides");
      expect(sanitizePath("/guides/tokyo")).toBe("/guides/tokyo");
      expect(sanitizePath("guides/tokyo")).toBe("guides/tokyo");
      expect(sanitizePath("  /guides  ")).toBe("/guides");
    });

    it("should reject path traversal attempts", () => {
      expect(sanitizePath("../etc/passwd")).toBe(null);
      expect(sanitizePath("..")).toBe(null);
      expect(sanitizePath("/path/../traversal")).toBe(null);
      expect(sanitizePath("path//double")).toBe(null);
      expect(sanitizePath("path\\backslash")).toBe(null);
    });

    it("should reject paths with dangerous characters", () => {
      expect(sanitizePath("/path@with#special")).toBe(null);
      expect(sanitizePath("/path with spaces")).toBe(null);
      expect(sanitizePath("/path<script>")).toBe(null);
    });

    it("should reject empty or invalid inputs", () => {
      expect(sanitizePath("")).toBe(null);
      expect(sanitizePath("   ")).toBe(null);
      expect(sanitizePath(null as unknown as string)).toBe(null);
      expect(sanitizePath(123 as unknown as string)).toBe(null);
    });

    it("should reject paths that are too long", () => {
      const longPath = "/" + "a".repeat(501);
      expect(sanitizePath(longPath)).toBe(null);
    });
  });

  describe("sanitizeRedirectUrl", () => {
    it("should sanitize relative URLs", () => {
      expect(sanitizeRedirectUrl("/guides")).toBe("/guides");
      expect(sanitizeRedirectUrl("/guides/tokyo")).toBe("/guides/tokyo");
    });

    it("should reject protocol-relative URLs", () => {
      expect(sanitizeRedirectUrl("//evil.com")).toBe(null);
      expect(sanitizeRedirectUrl("//example.com/path")).toBe(null);
    });

    it("should reject dangerous protocols", () => {
      expect(sanitizeRedirectUrl("javascript:alert(1)")).toBe(null);
      expect(sanitizeRedirectUrl("data:text/html,<script>")).toBe(null);
      expect(sanitizeRedirectUrl("vbscript:alert(1)")).toBe(null);
      expect(sanitizeRedirectUrl("file:///etc/passwd")).toBe(null);
    });

    it("should validate same-origin URLs when origin provided", () => {
      const origin = "https://example.com";
      expect(sanitizeRedirectUrl("https://example.com/path", origin)).toBe("/path");
      expect(sanitizeRedirectUrl("https://evil.com/path", origin)).toBe(null);
      expect(sanitizeRedirectUrl("http://example.com/path", origin)).toBe(null); // Different protocol
    });

    it("should reject absolute URLs when no origin provided", () => {
      expect(sanitizeRedirectUrl("https://example.com/path")).toBe(null);
    });

    it("should reject URLs that are too long", () => {
      const longUrl = "/" + "a".repeat(2049);
      expect(sanitizeRedirectUrl(longUrl)).toBe(null);
    });

    it("should reject empty or invalid inputs", () => {
      expect(sanitizeRedirectUrl("")).toBe(null);
      expect(sanitizeRedirectUrl(null as unknown as string)).toBe(null);
    });
  });

  describe("sanitizeString", () => {
    it("should sanitize valid strings", () => {
      expect(sanitizeString("hello")).toBe("hello");
      expect(sanitizeString("  hello  ")).toBe("hello");
      expect(sanitizeString("test123")).toBe("test123");
    });

    it("should remove control characters", () => {
      expect(sanitizeString("hello\x00world")).toBe("helloworld");
      expect(sanitizeString("test\x01\x02\x03test")).toBe("testtest");
    });

    it("should respect maxLength parameter", () => {
      const longString = "a".repeat(1001);
      expect(sanitizeString(longString, 1000)).toBe(null);
      expect(sanitizeString("a".repeat(1000), 1000)).toBe("a".repeat(1000));
    });

    it("should reject empty strings", () => {
      expect(sanitizeString("")).toBe(null);
      expect(sanitizeString("   ")).toBe(null);
    });

    it("should reject invalid inputs", () => {
      expect(sanitizeString(null as unknown as string)).toBe(null);
      expect(sanitizeString(123 as unknown as string)).toBe(null);
    });
  });

  describe("isSafeIdentifier", () => {
    it("should accept safe identifiers", () => {
      expect(isSafeIdentifier("tokyo")).toBe(true);
      expect(isSafeIdentifier("location-123")).toBe(true);
      expect(isSafeIdentifier("test_location")).toBe(true);
      expect(isSafeIdentifier("a.b-c_d")).toBe(true);
    });

    it("should reject unsafe identifiers", () => {
      expect(isSafeIdentifier("")).toBe(false);
      expect(isSafeIdentifier("path with spaces")).toBe(false);
      expect(isSafeIdentifier("path@special")).toBe(false);
      expect(isSafeIdentifier("path#hash")).toBe(false);
    });

    it("should respect maxLength parameter", () => {
      const longId = "a".repeat(256);
      expect(isSafeIdentifier(longId, 255)).toBe(false);
      expect(isSafeIdentifier("a".repeat(255), 255)).toBe(true);
    });

    it("should reject invalid inputs", () => {
      expect(isSafeIdentifier(null as unknown as string)).toBe(false);
      expect(isSafeIdentifier(123 as unknown as string)).toBe(false);
    });
  });
});

