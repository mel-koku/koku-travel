import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import { travelDatesSchema } from "@/lib/api/schemas";

describe("travelDatesSchema", () => {
  beforeEach(() => {
    // Freeze time to 2026-04-15T12:00:00Z for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("start date past-date validation", () => {
    it("rejects a start date more than 1 day in the past", () => {
      // 2026-04-13 is 2 days before 2026-04-15 -- beyond the 1-day grace
      const result = travelDatesSchema.safeParse({
        start: "2026-04-13",
        end: "2026-04-20",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const startIssue = result.error.issues.find((i) =>
          i.path.includes("start"),
        );
        expect(startIssue).toBeDefined();
        expect(startIssue!.message).toContain("past");
      }
    });

    it("accepts a start date equal to yesterday (timezone grace)", () => {
      // 2026-04-14 is exactly yesterday when today is 2026-04-15
      const result = travelDatesSchema.safeParse({
        start: "2026-04-14",
        end: "2026-04-20",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a start date equal to today", () => {
      const result = travelDatesSchema.safeParse({
        start: "2026-04-15",
        end: "2026-04-20",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a future start date", () => {
      const result = travelDatesSchema.safeParse({
        start: "2026-06-01",
        end: "2026-06-10",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("end date validation (no 0-day trips)", () => {
    it("rejects end date equal to start date (0-day trip)", () => {
      const result = travelDatesSchema.safeParse({
        start: "2026-04-20",
        end: "2026-04-20",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const endIssue = result.error.issues.find((i) =>
          i.path.includes("end"),
        );
        expect(endIssue).toBeDefined();
        expect(endIssue!.message).toContain("after");
      }
    });

    it("accepts end date strictly after start date", () => {
      const result = travelDatesSchema.safeParse({
        start: "2026-04-20",
        end: "2026-04-21",
      });
      expect(result.success).toBe(true);
    });

    it("rejects end date before start date", () => {
      const result = travelDatesSchema.safeParse({
        start: "2026-04-20",
        end: "2026-04-19",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("optional fields", () => {
    it("accepts when both dates are omitted", () => {
      const result = travelDatesSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts when only start is provided", () => {
      const result = travelDatesSchema.safeParse({
        start: "2026-04-20",
      });
      expect(result.success).toBe(true);
    });

    it("accepts when only end is provided", () => {
      const result = travelDatesSchema.safeParse({
        end: "2026-04-20",
      });
      expect(result.success).toBe(true);
    });
  });
});
