import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("printToken", () => {
  beforeEach(() => {
    vi.stubEnv("PDF_TOKEN_SECRET", "a".repeat(64));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs and verifies a token for a given tripId and userId", async () => {
    const { signPrintToken, verifyPrintToken } = await import("../printToken");
    const token = signPrintToken("trip-123", "user-abc");
    const payload = verifyPrintToken(token);
    expect(payload).toEqual({ tripId: "trip-123", userId: "user-abc" });
  });

  it("rejects a token signed with a different secret", async () => {
    const { signPrintToken } = await import("../printToken");
    const token = signPrintToken("trip-123", "user-abc");

    vi.resetModules();
    vi.stubEnv("PDF_TOKEN_SECRET", "b".repeat(64));
    const { verifyPrintToken } = await import("../printToken");
    expect(verifyPrintToken(token)).toBeNull();
  });

  it("rejects a tampered token", async () => {
    const { signPrintToken, verifyPrintToken } = await import("../printToken");
    const token = signPrintToken("trip-123", "user-abc");
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(verifyPrintToken(tampered)).toBeNull();
  });

  it("rejects an expired token", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T12:00:00Z"));
    const { signPrintToken, verifyPrintToken } = await import("../printToken");
    const token = signPrintToken("trip-123", "user-abc");
    vi.setSystemTime(new Date("2026-04-16T12:02:00Z")); // +120s, past 60s TTL
    expect(verifyPrintToken(token)).toBeNull();
    vi.useRealTimers();
  });

  it("throws when PDF_TOKEN_SECRET is unset", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("PDF_TOKEN_SECRET", "");
    vi.resetModules();
    const { signPrintToken } = await import("../printToken");
    expect(() => signPrintToken("trip-123", "user-abc")).toThrow(/PDF_TOKEN_SECRET/);
  });
});
