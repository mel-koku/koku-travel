import { describe, it, expect } from "vitest";
import {
  formatTime,
  parseEstimatedDuration,
  evaluateOperatingWindow,
  getOperatingPeriodForDay,
} from "@/lib/itineraryPlanner";
import type { LocationOperatingHours, LocationOperatingPeriod } from "@/types/location";

describe("itineraryPlanner pure helpers", () => {
  // ── formatTime ──────────────────────────────────────────────────────

  describe("formatTime", () => {
    it("formats 0 minutes as 00:00", () => {
      expect(formatTime(0)).toBe("00:00");
    });

    it("formats morning time correctly", () => {
      expect(formatTime(540)).toBe("09:00"); // 9 * 60
    });

    it("formats afternoon time correctly", () => {
      expect(formatTime(810)).toBe("13:30"); // 13*60 + 30
    });

    it("formats midnight (1440) wrapping to 00:00", () => {
      expect(formatTime(1440)).toBe("00:00");
    });

    it("wraps values beyond 24h", () => {
      expect(formatTime(1500)).toBe("01:00"); // 25 * 60
    });

    it("handles negative values by wrapping", () => {
      // -60 minutes → 23:00 (wraps backward)
      expect(formatTime(-60)).toBe("23:00");
    });

    it("pads single-digit hours and minutes", () => {
      expect(formatTime(65)).toBe("01:05");
    });
  });

  // ── parseEstimatedDuration ──────────────────────────────────────────

  describe("parseEstimatedDuration", () => {
    it('parses "1-2 hours" matching first number', () => {
      // Regex matches "2 hours" (greedy) → 120 min
      const result = parseEstimatedDuration("1-2 hours");
      expect(result).toBe(120);
    });

    it('parses "2 hours" to 120 minutes', () => {
      expect(parseEstimatedDuration("2 hours")).toBe(120);
    });

    it('parses "90 min" to 90 minutes', () => {
      expect(parseEstimatedDuration("90 min")).toBe(90);
    });

    it('parses "1.5 hours" to 90 minutes', () => {
      expect(parseEstimatedDuration("1.5 hours")).toBe(90);
    });

    it('parses "1 hour 30 min" to 90 minutes', () => {
      expect(parseEstimatedDuration("1 hour 30 min")).toBe(90);
    });

    it("returns null for null input", () => {
      expect(parseEstimatedDuration(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(parseEstimatedDuration(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parseEstimatedDuration("")).toBeNull();
    });

    it("returns null for unparseable text", () => {
      expect(parseEstimatedDuration("a nice walk")).toBeNull();
    });
  });

  // ── getOperatingPeriodForDay ────────────────────────────────────────

  describe("getOperatingPeriodForDay", () => {
    const hours: LocationOperatingHours = {
      periods: [
        { day: "monday", open: "09:00", close: "17:00" },
        { day: "tuesday", open: "10:00", close: "18:00" },
        { day: "saturday", open: "10:00", close: "20:00" },
      ],
    };

    it("returns the correct period for a weekday", () => {
      const period = getOperatingPeriodForDay(hours, "monday");
      expect(period).toEqual({ day: "monday", open: "09:00", close: "17:00" });
    });

    it("returns a different period for another weekday", () => {
      const period = getOperatingPeriodForDay(hours, "tuesday");
      expect(period?.open).toBe("10:00");
    });

    it("returns null for a day with no period defined", () => {
      expect(getOperatingPeriodForDay(hours, "wednesday")).toBeNull();
    });

    it("returns null when hours is undefined", () => {
      expect(getOperatingPeriodForDay(undefined, "monday")).toBeNull();
    });

    it("returns null when weekday is undefined", () => {
      expect(getOperatingPeriodForDay(hours, undefined)).toBeNull();
    });

    it("returns null when periods array is missing", () => {
      expect(getOperatingPeriodForDay({} as LocationOperatingHours, "monday")).toBeNull();
    });
  });

  // ── evaluateOperatingWindow ─────────────────────────────────────────

  describe("evaluateOperatingWindow", () => {
    const period: LocationOperatingPeriod = {
      day: "monday",
      open: "09:00",
      close: "17:00",
    };

    it("returns scheduled when arriving within hours", () => {
      // Arrive at 10:00 (600), duration 60 min
      const result = evaluateOperatingWindow(period, 600, 60);
      expect(result.status).toBe("scheduled");
      expect(result.adjustedArrival).toBe(600);
      expect(result.adjustedDeparture).toBe(660);
      expect(result.effectiveVisitMinutes).toBe(60);
      expect(result.window?.status).toBe("within");
    });

    it("adjusts arrival to opening time when arriving early", () => {
      // Arrive at 08:00 (480), opens at 09:00 (540)
      const result = evaluateOperatingWindow(period, 480, 60);
      expect(result.adjustedArrival).toBe(540); // Shifted to opening
      expect(result.arrivalBuffer).toBe(60); // 60 min wait
      expect(result.adjustedDeparture).toBe(600);
      expect(result.status).toBe("scheduled");
    });

    it("returns closed when arriving at or after close", () => {
      // Arrive at 17:00 (1020), closes at 17:00 (1020)
      const result = evaluateOperatingWindow(period, 1020, 60);
      expect(result.status).toBe("closed");
      expect(result.window?.status).toBe("outside");
    });

    it("returns out-of-hours when visit extends past close", () => {
      // Arrive at 16:30 (990), duration 60 → extends to 17:30 past 17:00
      const result = evaluateOperatingWindow(period, 990, 60);
      expect(result.status).toBe("out-of-hours");
      expect(result.adjustedDeparture).toBe(1020); // Clamped to close
      expect(result.effectiveVisitMinutes).toBe(30);
      expect(result.departureBuffer).toBe(30);
    });

    it("returns tentative when period is null", () => {
      const result = evaluateOperatingWindow(null, 600, 60);
      expect(result.status).toBe("tentative");
      expect(result.adjustedArrival).toBe(600);
      expect(result.adjustedDeparture).toBe(660);
      expect(result.effectiveVisitMinutes).toBe(60);
      expect(result.window).toBeUndefined();
    });

    it("handles overnight periods", () => {
      const overnight: LocationOperatingPeriod = {
        day: "friday",
        open: "18:00",
        close: "02:00",
        isOvernight: true,
      };
      // Arrive at 20:00 (1200), duration 120 → departs 22:00
      // Close at 02:00 = 120 min → overnight → 1440+120 = 1560
      const result = evaluateOperatingWindow(overnight, 1200, 120);
      expect(result.status).toBe("scheduled");
      expect(result.adjustedDeparture).toBe(1320);
    });

    it("marks as closed when arriving after closing time", () => {
      // Arrive at 18:20 (1100), closes at 17:00 (1020)
      const result = evaluateOperatingWindow(period, 1100, 60);
      expect(result.status).toBe("closed");
      expect(result.window?.status).toBe("outside");
      // effectiveVisitMinutes still computed (caller checks status)
      expect(result.effectiveVisitMinutes).toBe(60);
    });
  });
});
