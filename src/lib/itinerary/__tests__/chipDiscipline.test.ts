import { describe, it, expect } from "vitest";
import {
  shouldPromoteToBeatChip,
  type ChipContext,
} from "@/lib/itinerary/chipDiscipline";
import type { Location } from "@/types/location";

const ctx = (overrides: Partial<ChipContext> = {}): ChipContext => ({
  beatTime: "2026-04-23T08:00:00+09:00",
  isDayOfMode: false,
  dayDate: "2026-04-23",
  isClosedOnDate: false,
  isOutsideHoursOnArrival: false,
  lastEntryWithin1h: false,
  location: {
    id: "a",
    reservationInfo: undefined,
    cashOnly: false,
  } as unknown as Location,
  ...overrides,
});

describe("shouldPromoteToBeatChip", () => {
  it("promotes reservation-required when location.reservationInfo === 'required'", () => {
    expect(
      shouldPromoteToBeatChip(
        "reservation-required",
        ctx({ location: { id: "a", reservationInfo: "required" } as unknown as Location }),
      ),
    ).toBe(true);
  });

  it("does not promote reservation-required when reservationInfo is 'recommended'", () => {
    expect(
      shouldPromoteToBeatChip(
        "reservation-required",
        ctx({ location: { id: "a", reservationInfo: "recommended" } as unknown as Location }),
      ),
    ).toBe(false);
  });

  it("does not promote reservation-required when reservationInfo is undefined", () => {
    expect(shouldPromoteToBeatChip("reservation-required", ctx())).toBe(false);
  });

  it("promotes cash-only only when location.cashOnly is true", () => {
    expect(shouldPromoteToBeatChip("cash-only", ctx())).toBe(false);
    expect(
      shouldPromoteToBeatChip(
        "cash-only",
        ctx({ location: { id: "a", cashOnly: true } as unknown as Location }),
      ),
    ).toBe(true);
  });

  it("promotes closed-on-date when isClosedOnDate context flag is true", () => {
    expect(shouldPromoteToBeatChip("closed-on-date", ctx({ isClosedOnDate: true }))).toBe(true);
    expect(shouldPromoteToBeatChip("closed-on-date", ctx({ isClosedOnDate: false }))).toBe(false);
  });

  it("only promotes outside-hours-on-arrival in day-of mode AND when flag is true", () => {
    expect(shouldPromoteToBeatChip("outside-hours-on-arrival", ctx({ isDayOfMode: false, isOutsideHoursOnArrival: true }))).toBe(false);
    expect(shouldPromoteToBeatChip("outside-hours-on-arrival", ctx({ isDayOfMode: true, isOutsideHoursOnArrival: false }))).toBe(false);
    expect(shouldPromoteToBeatChip("outside-hours-on-arrival", ctx({ isDayOfMode: true, isOutsideHoursOnArrival: true }))).toBe(true);
  });

  it("only promotes last-entry-within-1h in day-of mode AND when flag is true", () => {
    expect(shouldPromoteToBeatChip("last-entry-within-1h", ctx({ isDayOfMode: false, lastEntryWithin1h: true }))).toBe(false);
    expect(shouldPromoteToBeatChip("last-entry-within-1h", ctx({ isDayOfMode: true, lastEntryWithin1h: false }))).toBe(false);
    expect(shouldPromoteToBeatChip("last-entry-within-1h", ctx({ isDayOfMode: true, lastEntryWithin1h: true }))).toBe(true);
  });
});
