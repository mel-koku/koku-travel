/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { derivePaymentPill } from "../paymentPill";
import type { Location } from "@/types/location";

function loc(partial: Partial<Location>): Location {
  // Minimal Location stub for the helper. The helper only reads
  // paymentTypes and cashOnly, so unused required fields get placeholders.
  return {
    id: "test",
    name: "Test",
    region: "kanto",
    city: "tokyo",
    category: "restaurant",
    image: "",
    shortDescription: "",
    ...partial,
  } as Location;
}

describe("derivePaymentPill", () => {
  it("returns null when both paymentTypes and cashOnly are absent", () => {
    expect(derivePaymentPill(loc({}))).toBeNull();
  });

  it("returns Cash only (legacy) when cashOnly=true and paymentTypes absent", () => {
    expect(derivePaymentPill(loc({ cashOnly: true }))).toEqual({
      label: "Cash only",
      tone: "warning",
    });
  });

  it("returns Cash only when paymentTypes is exactly ['cash']", () => {
    expect(derivePaymentPill(loc({ paymentTypes: ["cash"] }))).toEqual({
      label: "Cash only",
      tone: "warning",
    });
  });

  it("IC card beats cash when both present", () => {
    expect(
      derivePaymentPill(loc({ paymentTypes: ["cash", "ic_card"] })),
    ).toEqual({ label: "IC card", tone: "neutral" });
  });

  it("international brand beats IC card and cash", () => {
    expect(
      derivePaymentPill(
        loc({ paymentTypes: ["cash", "ic_card", "visa", "mastercard"] }),
      ),
    ).toEqual({ label: "Cards accepted", tone: "neutral" });
  });

  it("returns Cards accepted when amex alone is present", () => {
    expect(derivePaymentPill(loc({ paymentTypes: ["amex"] }))).toEqual({
      label: "Cards accepted",
      tone: "neutral",
    });
  });

  it("returns null for an empty paymentTypes array", () => {
    expect(derivePaymentPill(loc({ paymentTypes: [] }))).toBeNull();
  });

  it("returns null when only unknown values are present (forward-compat)", () => {
    expect(
      derivePaymentPill(
        loc({ paymentTypes: ["paypay" as any, "line_pay" as any] }),
      ),
    ).toBeNull();
  });

  it("ignores unknown values when a known brand is mixed in", () => {
    expect(
      derivePaymentPill(loc({ paymentTypes: ["paypay" as any, "visa"] })),
    ).toEqual({ label: "Cards accepted", tone: "neutral" });
  });

  it("prefers paymentTypes over legacy cashOnly when both set", () => {
    // paymentTypes explicitly says cards are accepted; legacy cashOnly must not win.
    expect(
      derivePaymentPill(loc({ cashOnly: true, paymentTypes: ["visa"] })),
    ).toEqual({ label: "Cards accepted", tone: "neutral" });
  });
});
