import type { Location } from "@/types/location";

/**
 * The closed union of facts that may promote to a beat-level chip on the spine.
 *
 * Adding a new fact here is a spec-level decision, not a component-level one.
 * Anything outside this union routes to the expand-on-click body or to the edit
 * drawer — it does NOT render on the default beat card.
 */
export type PromotableFact =
  | "reservation-required"
  | "cash-only"
  | "closed-on-date"
  | "outside-hours-on-arrival"
  | "last-entry-within-1h";

/**
 * Inputs for deciding whether a chip renders on a beat.
 *
 * `isClosedOnDate`, `isOutsideHoursOnArrival`, and `lastEntryWithin1h` are NOT
 * fields on Location — they are pre-computed by the beat's parent (e.g.
 * closure detection, the active clock in day-of mode) and passed as context.
 * Keep the gate pure.
 */
export type ChipContext = {
  beatTime: string; // ISO with Asia/Tokyo offset
  isDayOfMode: boolean;
  dayDate: string; // YYYY-MM-DD Asia/Tokyo
  isClosedOnDate: boolean;
  isOutsideHoursOnArrival: boolean;
  lastEntryWithin1h: boolean;
  location: Pick<Location, "id" | "reservationInfo" | "cashOnly">;
};

export function shouldPromoteToBeatChip(
  fact: PromotableFact,
  ctx: ChipContext,
): boolean {
  switch (fact) {
    case "reservation-required":
      return ctx.location.reservationInfo === "required";
    case "cash-only":
      return ctx.location.cashOnly === true;
    case "closed-on-date":
      return ctx.isClosedOnDate === true;
    case "outside-hours-on-arrival":
      return ctx.isDayOfMode && ctx.isOutsideHoursOnArrival === true;
    case "last-entry-within-1h":
      return ctx.isDayOfMode && ctx.lastEntryWithin1h === true;
    default: {
      // Exhaustive-check: if PromotableFact gains a new member, this line errors.
      const _exhaustive: never = fact;
      return _exhaustive;
    }
  }
}
