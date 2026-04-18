import { describe, it, expect } from "vitest";
import { shouldSuppressDurationTip } from "../durationGating";

describe("shouldSuppressDurationTip", () => {
  it("shows tip for short activities (45 min)", () => {
    expect(shouldSuppressDurationTip(45)).toBe(false);
  });

  it("suppresses tip at lower boundary (60 min)", () => {
    expect(shouldSuppressDurationTip(60)).toBe(true);
  });

  it("suppresses tip in middle of dead band (90 min)", () => {
    expect(shouldSuppressDurationTip(90)).toBe(true);
  });

  it("suppresses tip at upper boundary (180 min)", () => {
    expect(shouldSuppressDurationTip(180)).toBe(true);
  });

  it("shows tip for long activities (181 min)", () => {
    expect(shouldSuppressDurationTip(181)).toBe(false);
  });

  it("shows tip for very long activities (300 min)", () => {
    expect(shouldSuppressDurationTip(300)).toBe(false);
  });

  it("shows tip for very short activities (1 min)", () => {
    expect(shouldSuppressDurationTip(1)).toBe(false);
  });
});
