import { describe, it, expect } from "vitest";
import { stripStationReferences } from "@/components/features/itinerary/activityUtils";

describe("stripStationReferences", () => {
  it("returns null for null/empty summary", () => {
    expect(stripStationReferences(null, "Kitaoji Station")).toBeNull();
    expect(stripStationReferences("", "Kitaoji Station")).toBeNull();
    expect(stripStationReferences(undefined, null)).toBeNull();
  });

  it("removes the exact nearestStation substring", () => {
    const out = stripStationReferences(
      "A quiet shrine near Kitaoji Station (20 min walk) with cedar gardens.",
      "Kitaoji Station (20 min walk)",
    );
    expect(out).not.toContain("Kitaoji Station");
    expect(out).toContain("cedar gardens");
  });

  it("removes generic Station (N min walk) fragments when no nearestStation supplied", () => {
    const out = stripStationReferences(
      "Temple dating to the 16th century. Kyoto Station (15 min walk).",
      null,
    );
    expect(out).not.toMatch(/station/i);
    expect(out).toContain("16th century");
  });

  it("cleans dangling 'near ,' fragments after removal", () => {
    const out = stripStationReferences(
      "A small shrine near Kitaoji Station, tucked into the hills.",
      "Kitaoji Station",
    );
    expect(out).not.toMatch(/near\s*,/i);
    expect(out).toContain("tucked into the hills");
  });

  it("collapses double spaces and stray punctuation", () => {
    const out = stripStationReferences(
      "Visit  Kitaoji Station   during cherry season.",
      "Kitaoji Station",
    );
    expect(out).not.toMatch(/\s{2,}/);
    expect(out).toContain("cherry season");
  });

  it("returns null when the entire summary was station text", () => {
    expect(
      stripStationReferences("Kitaoji Station (20 min walk)", "Kitaoji Station (20 min walk)"),
    ).toBeNull();
  });

  it("leaves summaries without station references untouched", () => {
    const original = "A sanctuary of Zen Buddhism set in cedar forest.";
    expect(stripStationReferences(original, "Kitaoji Station")).toBe(original);
  });

  it("handles regex special chars in nearestStation safely", () => {
    const out = stripStationReferences(
      "Near Shin-Ōsaka Station (rapid line) you'll find the shop.",
      "Shin-Ōsaka Station (rapid line)",
    );
    expect(out).not.toContain("Shin-Ōsaka");
    expect(out).toContain("you'll find the shop");
  });
});
