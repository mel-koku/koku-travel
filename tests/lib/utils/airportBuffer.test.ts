import { describe, it, expect } from "vitest";
import {
  LATE_ARRIVAL_THRESHOLD,
  computeRawEffectiveArrival,
  computeEffectiveArrivalStart,
  computeEffectiveDepartureEnd,
  getArrivalProcessing,
  getDepartureProcessing,
  getArrivalBuffer,
  getDepartureBuffer,
} from "@/lib/utils/airportBuffer";

describe("airportBuffer", () => {
  describe("getArrivalProcessing", () => {
    it("returns 60min for international airports", () => {
      expect(getArrivalProcessing("NRT")).toBe(60);
      expect(getArrivalProcessing("KIX")).toBe(60);
      expect(getArrivalProcessing("HND")).toBe(60);
      expect(getArrivalProcessing("CTS")).toBe(60);
      expect(getArrivalProcessing("FUK")).toBe(60);
    });

    it("returns 20min for domestic airports", () => {
      expect(getArrivalProcessing("HKD")).toBe(20);
      expect(getArrivalProcessing("KMJ")).toBe(20);
      expect(getArrivalProcessing("ASJ")).toBe(20);
    });

    it("returns 60min when IATA code is missing (assume international)", () => {
      expect(getArrivalProcessing()).toBe(60);
      expect(getArrivalProcessing(undefined)).toBe(60);
    });

    it("is case-insensitive for IATA codes", () => {
      expect(getArrivalProcessing("nrt")).toBe(60);
      expect(getArrivalProcessing("Nrt")).toBe(60);
    });
  });

  describe("getDepartureProcessing", () => {
    it("returns 120min for international airports", () => {
      expect(getDepartureProcessing("NRT")).toBe(120);
      expect(getDepartureProcessing("HND")).toBe(120);
    });

    it("returns 60min for domestic airports", () => {
      expect(getDepartureProcessing("HKD")).toBe(60);
    });
  });

  describe("getArrivalBuffer", () => {
    it("adds processing + transit time", () => {
      // NRT: 60 processing + 60 Narita Express = 120
      expect(getArrivalBuffer("NRT")).toBe(120);
      // HND: 60 processing + 25 monorail = 85
      expect(getArrivalBuffer("HND")).toBe(85);
      // KIX: 60 + 50 = 110
      expect(getArrivalBuffer("KIX")).toBe(110);
    });
  });

  describe("getDepartureBuffer", () => {
    it("adds processing + transit time", () => {
      // NRT: 120 + 60 = 180
      expect(getDepartureBuffer("NRT")).toBe(180);
      // HND: 120 + 25 = 145
      expect(getDepartureBuffer("HND")).toBe(145);
    });
  });

  describe("computeRawEffectiveArrival", () => {
    it("returns null for undefined or invalid input", () => {
      expect(computeRawEffectiveArrival(undefined)).toBeNull();
      expect(computeRawEffectiveArrival("")).toBeNull();
      expect(computeRawEffectiveArrival("not a time")).toBeNull();
    });

    it("adds processing + transit to the landing time in minutes", () => {
      // 10:00 + 120 (NRT buffer) = 12:00 = 720 minutes
      expect(computeRawEffectiveArrival("10:00", "NRT")).toBe(720);
      // 14:30 + 85 (HND buffer) = 15:55 = 955 minutes
      expect(computeRawEffectiveArrival("14:30", "HND")).toBe(955);
    });

    it("is uncapped — does not clamp to MAX_EFFECTIVE_START", () => {
      // 22:00 + 120 (NRT) = 00:00 next day = 1440 minutes
      // computeEffectiveArrivalStart caps at 21:00 (1260) but raw doesn't
      const raw = computeRawEffectiveArrival("22:00", "NRT");
      expect(raw).toBe(1440);
    });
  });

  describe("LATE_ARRIVAL_THRESHOLD behavior", () => {
    it("threshold is 19:00 (1140 minutes)", () => {
      expect(LATE_ARRIVAL_THRESHOLD).toBe(19 * 60);
      expect(LATE_ARRIVAL_THRESHOLD).toBe(1140);
    });

    it("late arrival: 22:00 NRT flight triggers (raw effective = 24:00)", () => {
      const raw = computeRawEffectiveArrival("22:00", "NRT");
      expect(raw).not.toBeNull();
      expect(raw!).toBeGreaterThanOrEqual(LATE_ARRIVAL_THRESHOLD);
    });

    it("late arrival: 18:00 NRT flight triggers (raw effective = 20:00)", () => {
      // 18:00 + 120 = 20:00 = 1200 >= 1140
      const raw = computeRawEffectiveArrival("18:00", "NRT");
      expect(raw).toBe(1200);
      expect(raw!).toBeGreaterThanOrEqual(LATE_ARRIVAL_THRESHOLD);
    });

    it("not late: 16:00 NRT flight stays under threshold", () => {
      // 16:00 + 120 = 18:00 = 1080 < 1140
      const raw = computeRawEffectiveArrival("16:00", "NRT");
      expect(raw).toBe(1080);
      expect(raw!).toBeLessThan(LATE_ARRIVAL_THRESHOLD);
    });

    it("not late: 17:00 HND flight stays under threshold (less transit)", () => {
      // 17:00 + 85 = 18:25 = 1105 < 1140
      const raw = computeRawEffectiveArrival("17:00", "HND");
      expect(raw).toBe(1105);
      expect(raw!).toBeLessThan(LATE_ARRIVAL_THRESHOLD);
    });

    it("late at 17:30 HND (just over threshold)", () => {
      // 17:30 + 85 = 18:55 = 1135 < 1140 (still under)
      expect(computeRawEffectiveArrival("17:30", "HND")).toBe(1135);
      // 17:35 + 85 = 19:00 = 1140 (at threshold)
      expect(computeRawEffectiveArrival("17:35", "HND")).toBe(1140);
    });
  });

  describe("computeEffectiveArrivalStart", () => {
    it("returns null for missing arrival time", () => {
      expect(computeEffectiveArrivalStart(undefined)).toBeNull();
    });

    it("caps late arrivals at 21:00 so Day 1 bounds don't go past midnight", () => {
      // 22:00 + 120 = 00:00 raw → capped at 21:00
      expect(computeEffectiveArrivalStart("22:00", "NRT")).toBe("21:00");
    });

    it("does not cap arrivals that fit within the day", () => {
      // 10:00 + 120 = 12:00
      expect(computeEffectiveArrivalStart("10:00", "NRT")).toBe("12:00");
    });
  });

  describe("computeEffectiveDepartureEnd", () => {
    it("returns null for missing departure time", () => {
      expect(computeEffectiveDepartureEnd(undefined)).toBeNull();
    });

    it("floors early departures at 08:00 so last-day bounds stay positive", () => {
      // 07:00 − 180 = 04:00 raw → floored at 08:00
      expect(computeEffectiveDepartureEnd("07:00", "NRT")).toBe("08:00");
    });

    it("subtracts buffer from flight time for normal departures", () => {
      // 18:00 − 180 = 15:00
      expect(computeEffectiveDepartureEnd("18:00", "NRT")).toBe("15:00");
    });
  });
});
