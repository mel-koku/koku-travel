import { describe, it, expect } from "vitest";
import { scoreGroupFit } from "@/lib/scoring/groupScoring";
import type { Location } from "@/types/location";

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: "loc-1",
    name: "Test Location",
    region: "kansai",
    city: "kyoto",
    category: "park",
    image: "",
    ...overrides,
  };
}

describe("groupScoring", () => {
  describe("scoreGroupFit", () => {
    it("returns 0 when no group info provided", () => {
      const loc = makeLocation();
      const result = scoreGroupFit(loc);
      expect(result.scoreAdjustment).toBe(0);
      expect(result.reasoning).toContain("No group information");
    });

    it("returns 0 when group is empty object", () => {
      const loc = makeLocation();
      const result = scoreGroupFit(loc, {});
      expect(result.scoreAdjustment).toBe(0);
    });

    describe("group type preferences", () => {
      it("boosts solo-preferred categories", () => {
        const loc = makeLocation({ category: "museum" });
        const result = scoreGroupFit(loc, { type: "solo" });
        expect(result.scoreAdjustment).toBeGreaterThan(0);
      });

      it("penalizes solo-avoided categories", () => {
        const loc = makeLocation({ category: "bar" });
        const result = scoreGroupFit(loc, { type: "solo" });
        expect(result.scoreAdjustment).toBeLessThan(0);
      });

      it("boosts couple-preferred categories", () => {
        const loc = makeLocation({ category: "garden" });
        const result = scoreGroupFit(loc, { type: "couple" });
        expect(result.scoreAdjustment).toBeGreaterThan(0);
      });

      it("boosts family-preferred categories", () => {
        const loc = makeLocation({ category: "entertainment" });
        const result = scoreGroupFit(loc, { type: "family" });
        expect(result.scoreAdjustment).toBeGreaterThan(0);
      });

      it("penalizes family-avoided categories", () => {
        const loc = makeLocation({ category: "bar" });
        const result = scoreGroupFit(loc, { type: "family" });
        expect(result.scoreAdjustment).toBeLessThan(0);
      });

      it("boosts friends-preferred categories", () => {
        const loc = makeLocation({ category: "restaurant" });
        const result = scoreGroupFit(loc, { type: "friends" });
        expect(result.scoreAdjustment).toBeGreaterThan(0);
      });

      it("boosts business-preferred categories", () => {
        const loc = makeLocation({ category: "landmark" });
        const result = scoreGroupFit(loc, { type: "business" });
        expect(result.scoreAdjustment).toBeGreaterThan(0);
      });

      it("penalizes business-avoided categories", () => {
        const loc = makeLocation({ category: "entertainment" });
        const result = scoreGroupFit(loc, { type: "business" });
        expect(result.scoreAdjustment).toBeLessThan(0);
      });
    });

    describe("group size", () => {
      it("returns 0 for solo traveler (size 1)", () => {
        const loc = makeLocation({ category: "restaurant" });
        const result = scoreGroupFit(loc, { size: 1 });
        expect(result.scoreAdjustment).toBe(0);
      });

      it("boosts large-group-friendly categories for 6+ people", () => {
        const loc = makeLocation({ category: "restaurant" });
        const result = scoreGroupFit(loc, { size: 6 });
        expect(result.scoreAdjustment).toBeGreaterThan(0);
      });

      it("penalizes small-group-preferred categories for 6+ people", () => {
        const loc = makeLocation({ category: "shrine" });
        const result = scoreGroupFit(loc, { size: 6 });
        expect(result.scoreAdjustment).toBeLessThan(0);
      });

      it("uses goodForGroups flag for medium groups (4+)", () => {
        const loc = makeLocation({ category: "restaurant", goodForGroups: true });
        const result = scoreGroupFit(loc, { size: 4 });
        expect(result.scoreAdjustment).toBeGreaterThan(0);
      });

      it("penalizes notGoodForGroups for medium groups", () => {
        const loc = makeLocation({ category: "restaurant", goodForGroups: false });
        const result = scoreGroupFit(loc, { size: 5 });
        expect(result.scoreAdjustment).toBeLessThan(0);
      });

      it("uses goodForGroups for small groups with smaller adjustment", () => {
        const loc = makeLocation({ category: "restaurant", goodForGroups: true });
        const result = scoreGroupFit(loc, { size: 2 });
        expect(result.scoreAdjustment).toBe(2);
      });
    });

    describe("children ages", () => {
      it("returns 0 when no children", () => {
        const loc = makeLocation();
        const result = scoreGroupFit(loc, { childrenAges: [] });
        expect(result.scoreAdjustment).toBe(0);
      });

      it("boosts child-friendly categories for young children", () => {
        const loc = makeLocation({ category: "park" });
        const result = scoreGroupFit(loc, { childrenAges: [3, 5] });
        expect(result.scoreAdjustment).toBeGreaterThan(0);
      });

      it("penalizes adult-focused categories for young children", () => {
        const loc = makeLocation({ category: "bar" });
        const result = scoreGroupFit(loc, { childrenAges: [4, 6] });
        expect(result.scoreAdjustment).toBeLessThan(0);
      });

      it("uses goodForChildren flag when available", () => {
        const loc = makeLocation({ category: "restaurant", goodForChildren: true });
        const result = scoreGroupFit(loc, { childrenAges: [5] });
        expect(result.scoreAdjustment).toBeGreaterThan(0);
      });

      it("penalizes notGoodForChildren for young children", () => {
        const loc = makeLocation({ category: "restaurant", goodForChildren: false });
        const result = scoreGroupFit(loc, { childrenAges: [3, 4] });
        expect(result.scoreAdjustment).toBeLessThan(0);
      });

      it("gives smaller adjustment for teenagers", () => {
        const loc = makeLocation({ category: "park" });
        const youngResult = scoreGroupFit(loc, { childrenAges: [5] });
        const teenResult = scoreGroupFit(loc, { childrenAges: [15] });
        expect(youngResult.scoreAdjustment).toBeGreaterThan(teenResult.scoreAdjustment);
      });
    });

    describe("capping", () => {
      it("caps combined score at 10", () => {
        // Combine type preferred + goodForChildren + goodForGroups
        const loc = makeLocation({
          category: "park",
          goodForChildren: true,
          goodForGroups: true,
        });
        const result = scoreGroupFit(loc, {
          type: "family",
          size: 6,
          childrenAges: [4, 5],
        });
        expect(result.scoreAdjustment).toBeLessThanOrEqual(10);
      });

      it("caps combined score at -5", () => {
        // Combine type avoided + notGoodForChildren + notGoodForGroups
        const loc = makeLocation({
          category: "bar",
          goodForChildren: false,
          goodForGroups: false,
        });
        const result = scoreGroupFit(loc, {
          type: "family",
          size: 5,
          childrenAges: [3, 4],
        });
        expect(result.scoreAdjustment).toBeGreaterThanOrEqual(-5);
      });
    });
  });
});
