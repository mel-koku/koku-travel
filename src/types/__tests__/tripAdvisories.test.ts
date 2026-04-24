import { describe, it, expect } from "vitest";
import { buildAdvisoryKey } from "@/types/tripAdvisories";

describe("buildAdvisoryKey", () => {
  it("returns kind alone when no context provided", () => {
    expect(buildAdvisoryKey("prep-checklist")).toBe("prep-checklist");
  });

  it("concatenates kind and context with a colon", () => {
    expect(buildAdvisoryKey("day-trip-festival", "sensoji:2026-04-24")).toBe(
      "day-trip-festival:sensoji:2026-04-24",
    );
  });
});
