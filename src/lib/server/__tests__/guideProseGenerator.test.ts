import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { scanForDenyListViolations } from "../guideProseGenerator";

describe("scanForDenyListViolations", () => {
  const makeGuide = (overview: string) => ({
    tripOverview: overview,
    days: [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  it("should catch 'explore'", () => {
    const violations = scanForDenyListViolations(makeGuide("Explore the streets of Kyoto."));
    expect(violations.length).toBeGreaterThan(0);
  });

  it("should catch 'discover'", () => {
    const violations = scanForDenyListViolations(makeGuide("Discover the local culture."));
    expect(violations.length).toBeGreaterThan(0);
  });

  it("should catch 'wander'", () => {
    const violations = scanForDenyListViolations(makeGuide("Wander through the backstreets."));
    expect(violations.length).toBeGreaterThan(0);
  });

  it("should catch standalone 'gem'", () => {
    const violations = scanForDenyListViolations(makeGuide("This place is a real gem."));
    expect(violations.length).toBeGreaterThan(0);
  });

  it("should return empty array for clean text", () => {
    const violations = scanForDenyListViolations(makeGuide("Arrive at Kyoto Station by 9 AM. Head straight to Fushimi Inari."));
    expect(violations).toHaveLength(0);
  });
});
