import { describe, it, expect } from "vitest";
import { shouldShow5YenCoinTip, mark5YenCoinTipShown } from "../coinTipTracking";

describe("coinTipTracking", () => {
  describe("shouldShow5YenCoinTip", () => {
    it("shows tip when planningWarnings is undefined", () => {
      expect(shouldShow5YenCoinTip(undefined)).toBe(true);
    });

    it("shows tip when planningWarnings is empty", () => {
      expect(shouldShow5YenCoinTip({})).toBe(true);
    });

    it("shows tip when coinTipShown is false", () => {
      expect(shouldShow5YenCoinTip({ coinTipShown: false })).toBe(true);
    });

    it("suppresses tip when coinTipShown is true", () => {
      expect(shouldShow5YenCoinTip({ coinTipShown: true })).toBe(false);
    });

    it("shows tip when other warnings are present but coinTipShown is not set", () => {
      expect(shouldShow5YenCoinTip({ goshuinShown: true })).toBe(true);
    });
  });

  describe("mark5YenCoinTipShown", () => {
    it("sets coinTipShown to true when warnings is undefined", () => {
      const result = mark5YenCoinTipShown(undefined);
      expect(result.coinTipShown).toBe(true);
    });

    it("sets coinTipShown to true when warnings is empty", () => {
      const result = mark5YenCoinTipShown({});
      expect(result.coinTipShown).toBe(true);
    });

    it("preserves other warnings when setting coinTipShown", () => {
      const result = mark5YenCoinTipShown({ goshuinShown: true, otherWarning: "value" });
      expect(result.coinTipShown).toBe(true);
      expect(result.goshuinShown).toBe(true);
      expect(result.otherWarning).toBe("value");
    });

    it("overwrites coinTipShown when already set to false", () => {
      const result = mark5YenCoinTipShown({ coinTipShown: false });
      expect(result.coinTipShown).toBe(true);
    });
  });
});
