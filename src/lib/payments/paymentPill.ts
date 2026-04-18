import type { Location, PaymentType } from "@/types/location";

export type PaymentPill = {
  label: "Cash only" | "IC card" | "Cards accepted";
  tone: "warning" | "neutral";
};

const INTERNATIONAL_BRANDS: readonly PaymentType[] = [
  "visa",
  "mastercard",
  "jcb",
  "amex",
];

/**
 * Derives a single payment pill from a location's payment data.
 * Returns null when unknown (neither paymentTypes nor cashOnly is set).
 * Priority: international cards > IC card > cash only.
 * Unknown strings in paymentTypes are inert (do not crash, do not render).
 */
export function derivePaymentPill(location: Location): PaymentPill | null {
  const types = location.paymentTypes;

  if (types && types.length > 0) {
    if (types.some((t) => INTERNATIONAL_BRANDS.includes(t as PaymentType))) {
      return { label: "Cards accepted", tone: "neutral" };
    }
    if (types.includes("ic_card")) {
      return { label: "IC card", tone: "neutral" };
    }
    if (types.includes("cash") && types.length === 1) {
      return { label: "Cash only", tone: "warning" };
    }
    return null;
  }

  if (location.cashOnly) {
    return { label: "Cash only", tone: "warning" };
  }

  return null;
}
