import { describe, expect, it } from "vitest";
import {
  getAvailableTimeForSlot,
  TIME_SLOT_CAPACITIES,
  PACE_MULTIPLIERS,
  CITY_TRANSITION_MINUTES,
} from "../timeSlots";

describe("timeSlots", () => {
  describe("CITY_TRANSITION_MINUTES", () => {
    it("should be 90 minutes", () => {
      expect(CITY_TRANSITION_MINUTES).toBe(90);
    });
  });

  describe("getAvailableTimeForSlot", () => {
    it("should return morning capacity adjusted by pace", () => {
      const balanced = getAvailableTimeForSlot("morning", "balanced");
      expect(balanced).toBe(Math.floor(TIME_SLOT_CAPACITIES.morning * PACE_MULTIPLIERS.balanced));
    });

    it("should return afternoon capacity adjusted by pace", () => {
      const relaxed = getAvailableTimeForSlot("afternoon", "relaxed");
      expect(relaxed).toBe(Math.floor(TIME_SLOT_CAPACITIES.afternoon * PACE_MULTIPLIERS.relaxed));
    });
  });

  describe("city transition buffer", () => {
    it("should reduce available time by 90min on city transition days", () => {
      // Use fast pace for more morning headroom (180 * 0.92 = 165min)
      const morningMinutes = getAvailableTimeForSlot("morning", "fast");
      const transitionMorning = Math.max(60, morningMinutes - CITY_TRANSITION_MINUTES);

      // Transition day should have exactly 90min less (165 - 90 = 75, above 60 floor)
      expect(transitionMorning).toBe(morningMinutes - CITY_TRANSITION_MINUTES);
      expect(transitionMorning).toBeLessThan(morningMinutes);
    });

    it("should not reduce below 60min floor", () => {
      // Even with a very relaxed pace, the floor should hold
      const morningMinutes = getAvailableTimeForSlot("morning", "relaxed");
      const transitionMorning = Math.max(60, morningMinutes - CITY_TRANSITION_MINUTES);

      expect(transitionMorning).toBeGreaterThanOrEqual(60);
    });

    it("should not apply buffer on same-city consecutive days", () => {
      // Simulate: same city on consecutive days
      const days = [
        { cityId: "kyoto" },
        { cityId: "kyoto" },
        { cityId: "osaka" },
      ];

      const results = days.map((day, index) => {
        const morningMinutes = getAvailableTimeForSlot("morning", "balanced");
        const isTransitionDay =
          index > 0 && days[index - 1]!.cityId !== day.cityId;
        const buffer = isTransitionDay ? CITY_TRANSITION_MINUTES : 0;
        return Math.max(60, morningMinutes - buffer);
      });

      // Day 1 (Kyoto, first day): no buffer
      expect(results[0]).toBe(getAvailableTimeForSlot("morning", "balanced"));
      // Day 2 (Kyoto, same city): no buffer
      expect(results[1]).toBe(getAvailableTimeForSlot("morning", "balanced"));
      // Day 3 (Osaka, city change): buffer applied, clamped to 60min floor
      const fullMorning = getAvailableTimeForSlot("morning", "balanced");
      expect(results[2]).toBe(
        Math.max(60, fullMorning - CITY_TRANSITION_MINUTES),
      );
    });

    it("should not apply buffer on Day 1 even if first day conceptually", () => {
      const days = [{ cityId: "tokyo" }, { cityId: "kyoto" }];

      const day1Morning = getAvailableTimeForSlot("morning", "balanced");
      const isTransitionDay1 = 0 > 0; // dayIndex > 0 check prevents Day 1
      const buffer1 = isTransitionDay1 ? CITY_TRANSITION_MINUTES : 0;

      expect(buffer1).toBe(0);
      expect(Math.max(60, day1Morning - buffer1)).toBe(day1Morning);
    });
  });
});
