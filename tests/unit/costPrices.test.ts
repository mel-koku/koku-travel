import { describe, it, expect } from "vitest";
import { estimateCostTenthsCent, MODEL_PRICES_PER_MILLION_TENTHS_CENT } from "@/lib/api/costPrices";

describe("costPrices", () => {
  it("computes cost for known model with flash-lite rates", () => {
    const cost = estimateCostTenthsCent("gemini-2.5-flash-lite", 1_000_000, 1_000_000);
    expect(cost).toBe(500);
  });

  it("computes cost for known model with flash rates", () => {
    const cost = estimateCostTenthsCent("gemini-2.5-flash", 1_000_000, 1_000_000);
    expect(cost).toBe(300 + 2500);
  });

  it("scales proportionally for partial-million token counts", () => {
    const cost = estimateCostTenthsCent("gemini-2.5-flash-lite", 500_000, 0);
    expect(cost).toBe(50);
  });

  it("falls back to flash pricing for unknown model", () => {
    const unknown = estimateCostTenthsCent("gemini-99-ultra", 1_000_000, 1_000_000);
    const flash = estimateCostTenthsCent("gemini-2.5-flash", 1_000_000, 1_000_000);
    expect(unknown).toBe(flash);
  });

  it("rounds up to avoid under-charging", () => {
    const cost = estimateCostTenthsCent("gemini-2.5-flash-lite", 1, 0);
    expect(cost).toBe(1);
  });

  it("exports price table for reference", () => {
    expect(MODEL_PRICES_PER_MILLION_TENTHS_CENT["gemini-2.5-flash-lite"]).toEqual({
      input: 100,
      output: 400,
    });
  });
});
