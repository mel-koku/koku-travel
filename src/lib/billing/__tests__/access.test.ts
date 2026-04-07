import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

describe("billing/access", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getTripTier", () => {
    it("returns short for 1-4 day trips", async () => {
      const { getTripTier } = await import("@/lib/billing/access");
      expect(getTripTier(1)).toBe("short");
      expect(getTripTier(4)).toBe("short");
    });

    it("returns standard for 5-9 day trips", async () => {
      const { getTripTier } = await import("@/lib/billing/access");
      expect(getTripTier(5)).toBe("standard");
      expect(getTripTier(9)).toBe("standard");
    });

    it("returns long for 10+ day trips", async () => {
      const { getTripTier } = await import("@/lib/billing/access");
      expect(getTripTier(10)).toBe("long");
      expect(getTripTier(21)).toBe("long");
    });
  });

  describe("getTierPrice", () => {
    it("returns correct cents for each tier", async () => {
      const { getTierPrice } = await import("@/lib/billing/access");
      expect(getTierPrice("short")).toBe(1900);
      expect(getTierPrice("standard")).toBe(2900);
      expect(getTierPrice("long")).toBe(3900);
    });
  });

  describe("isTripUnlocked", () => {
    it("returns false when unlockedAt is null", async () => {
      const { isTripUnlocked } = await import("@/lib/billing/access");
      expect(isTripUnlocked({ unlockedAt: null })).toBe(false);
    });

    it("returns true when unlockedAt is set", async () => {
      const { isTripUnlocked } = await import("@/lib/billing/access");
      expect(isTripUnlocked({ unlockedAt: "2026-04-07T00:00:00Z" })).toBe(true);
    });
  });

  describe("isFullAccessEnabled", () => {
    it("returns true when FREE_FULL_ACCESS env is true", async () => {
      vi.stubEnv("FREE_FULL_ACCESS", "true");
      const mod = await import("@/lib/billing/accessServer");
      expect(await mod.isFullAccessEnabled()).toBe(true);
    });

    it("returns false when no override is set", async () => {
      vi.stubEnv("FREE_FULL_ACCESS", "");
      // Mock the dynamic import of contentService to avoid Sanity deps
      vi.mock("@/lib/sanity/contentService", () => ({
        getTripBuilderConfig: vi.fn().mockResolvedValue(null),
      }));
      const mod = await import("@/lib/billing/accessServer");
      expect(await mod.isFullAccessEnabled()).toBe(false);
    });
  });

  describe("isDayAccessible", () => {
    it("Day 1 (index 0) is always accessible", async () => {
      const { isDayAccessible } = await import("@/lib/billing/access");
      expect(isDayAccessible(0, false, false)).toBe(true);
    });

    it("Day 2+ is not accessible when locked and no full access", async () => {
      const { isDayAccessible } = await import("@/lib/billing/access");
      expect(isDayAccessible(1, false, false)).toBe(false);
    });

    it("Day 2+ is accessible when trip is unlocked", async () => {
      const { isDayAccessible } = await import("@/lib/billing/access");
      expect(isDayAccessible(1, true, false)).toBe(true);
    });

    it("Day 2+ is accessible when full access is enabled", async () => {
      const { isDayAccessible } = await import("@/lib/billing/access");
      expect(isDayAccessible(1, false, true)).toBe(true);
    });
  });
});
