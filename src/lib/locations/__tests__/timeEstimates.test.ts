import { describe, it, expect } from "vitest";

import {
  formatMinutesToFitLabel,
  getStaticTimeEstimate,
  resolveTimeEstimate,
} from "../timeEstimates";

describe("formatMinutesToFitLabel", () => {
  it("returns undefined for zero, negative, or non-finite", () => {
    expect(formatMinutesToFitLabel(0)).toBeUndefined();
    expect(formatMinutesToFitLabel(-30)).toBeUndefined();
    expect(formatMinutesToFitLabel(Number.NaN)).toBeUndefined();
    expect(formatMinutesToFitLabel(Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  it("formats sub-hour values in minutes", () => {
    expect(formatMinutesToFitLabel(15)).toBe("15 min");
    expect(formatMinutesToFitLabel(45)).toBe("45 min");
    expect(formatMinutesToFitLabel(59)).toBe("59 min");
  });

  it('formats exactly one hour as "1 hr" (singular)', () => {
    expect(formatMinutesToFitLabel(60)).toBe("1 hr");
  });

  it("rounds to half-hour increments inside the hours band", () => {
    expect(formatMinutesToFitLabel(75)).toBe("1.5 hrs"); // 1.25 → 1.5
    expect(formatMinutesToFitLabel(90)).toBe("1.5 hrs");
    expect(formatMinutesToFitLabel(120)).toBe("2 hrs");
    expect(formatMinutesToFitLabel(135)).toBe("2.5 hrs"); // 2.25 → 2.5
    expect(formatMinutesToFitLabel(180)).toBe("3 hrs");
  });

  it('switches to "Half day" between 240 and 479', () => {
    expect(formatMinutesToFitLabel(240)).toBe("Half day");
    expect(formatMinutesToFitLabel(360)).toBe("Half day");
    expect(formatMinutesToFitLabel(479)).toBe("Half day");
  });

  it('switches to "Full day" at 480+', () => {
    expect(formatMinutesToFitLabel(480)).toBe("Full day");
    expect(formatMinutesToFitLabel(720)).toBe("Full day");
  });
});

describe("getStaticTimeEstimate", () => {
  it("returns the mapped value for known categories", () => {
    expect(getStaticTimeEstimate("temple")).toBe("30–45 min");
    expect(getStaticTimeEstimate("restaurant")).toBe("60–90 min");
  });

  it("is case-insensitive", () => {
    expect(getStaticTimeEstimate("Temple")).toBe("30–45 min");
    expect(getStaticTimeEstimate("RESTAURANT")).toBe("60–90 min");
  });

  it("returns undefined for unknown categories or empty input", () => {
    expect(getStaticTimeEstimate("flying-saucer")).toBeUndefined();
    expect(getStaticTimeEstimate(null)).toBeUndefined();
    expect(getStaticTimeEstimate(undefined)).toBeUndefined();
    expect(getStaticTimeEstimate("")).toBeUndefined();
  });
});

describe("resolveTimeEstimate", () => {
  it("prefers an explicit estimatedDuration over the category fallback", () => {
    expect(resolveTimeEstimate("2 hours", "temple")).toBe("2 hours");
  });

  it("falls back to category when estimatedDuration is empty", () => {
    expect(resolveTimeEstimate("", "temple")).toBe("30–45 min");
    expect(resolveTimeEstimate(undefined, "temple")).toBe("30–45 min");
    expect(resolveTimeEstimate("   ", "temple")).toBe("30–45 min");
  });

  it("returns undefined when neither yields a value", () => {
    expect(resolveTimeEstimate(undefined, "alien-experience")).toBeUndefined();
  });
});
