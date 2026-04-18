/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { deriveDietaryPills } from "../dietaryPills";
import type { Location } from "@/types/location";

function loc(partial: Partial<Location>): Location {
  // Minimal Location stub for the helper. The helper reads category,
  // dietaryFlags, and dietaryOptions.servesVegetarianFood. Other fields are placeholders.
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

describe("deriveDietaryPills", () => {
  it("returns [] when no flags and no vegetarian backstop", () => {
    expect(deriveDietaryPills(loc({}))).toEqual([]);
  });

  it("returns [] when category is not restaurant/cafe/bar (category gate)", () => {
    expect(
      deriveDietaryPills(loc({ category: "landmark", dietaryFlags: ["vegan"] })),
    ).toEqual([]);
  });

  it("returns [Vegan friendly] for single flag ['vegan']", () => {
    expect(deriveDietaryPills(loc({ dietaryFlags: ["vegan"] }))).toEqual([
      { label: "Vegan friendly", flag: "vegan", tone: "neutral" },
    ]);
  });

  it("returns [Halal, Vegan friendly] for all four flags (priority + cap drops gluten_free and vegetarian)", () => {
    expect(
      deriveDietaryPills(
        loc({ dietaryFlags: ["halal", "vegan", "gluten_free", "vegetarian"] }),
      ),
    ).toEqual([
      { label: "Halal", flag: "halal", tone: "neutral" },
      { label: "Vegan friendly", flag: "vegan", tone: "neutral" },
    ]);
  });

  it("returns [Halal, Gluten-free] for ['halal','gluten_free','vegetarian'] (vegetarian dropped by cap, not subsumption)", () => {
    expect(
      deriveDietaryPills(
        loc({ dietaryFlags: ["halal", "gluten_free", "vegetarian"] }),
      ),
    ).toEqual([
      { label: "Halal", flag: "halal", tone: "neutral" },
      { label: "Gluten-free", flag: "gluten_free", tone: "neutral" },
    ]);
  });

  it("Google backstop: dietaryFlags=null + servesVegetarianFood=true renders vegetarian", () => {
    expect(
      deriveDietaryPills(
        loc({ dietaryOptions: { servesVegetarianFood: true } }),
      ),
    ).toEqual([
      { label: "Vegetarian friendly", flag: "vegetarian", tone: "neutral" },
    ]);
  });

  it("backstop is no-op when editorial already contradicts (no duplicate vegetarian)", () => {
    expect(
      deriveDietaryPills(
        loc({
          dietaryFlags: ["vegan"],
          dietaryOptions: { servesVegetarianFood: true },
        }),
      ),
    ).toEqual([{ label: "Vegan friendly", flag: "vegan", tone: "neutral" }]);
  });

  it("subsumption: ['vegan','vegetarian'] renders only [Vegan friendly]", () => {
    expect(
      deriveDietaryPills(loc({ dietaryFlags: ["vegan", "vegetarian"] })),
    ).toEqual([{ label: "Vegan friendly", flag: "vegan", tone: "neutral" }]);
  });

  it("backstop does not apply to non-vegetarian flags", () => {
    // servesVegetarianFood=false must NOT produce a halal or vegan pill.
    expect(
      deriveDietaryPills(
        loc({ dietaryOptions: { servesVegetarianFood: false } }),
      ),
    ).toEqual([]);
  });

  it("unknown flag ['kosher'] is inert", () => {
    expect(
      deriveDietaryPills(loc({ dietaryFlags: ["kosher" as any] })),
    ).toEqual([]);
  });

  it("unknown + known: ['kosher','vegan'] renders only [Vegan friendly]", () => {
    expect(
      deriveDietaryPills(loc({ dietaryFlags: ["kosher" as any, "vegan"] })),
    ).toEqual([{ label: "Vegan friendly", flag: "vegan", tone: "neutral" }]);
  });

  it("bar category with ['gluten_free'] renders [Gluten-free] (bar is in the gate)", () => {
    expect(
      deriveDietaryPills(
        loc({ category: "bar", dietaryFlags: ["gluten_free"] }),
      ),
    ).toEqual([
      { label: "Gluten-free", flag: "gluten_free", tone: "neutral" },
    ]);
  });
});
