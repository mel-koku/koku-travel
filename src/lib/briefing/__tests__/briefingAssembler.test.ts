import { describe, it, expect } from "vitest";
import { assembleBriefing, scorePillar } from "../briefingAssembler";
import type { CulturalPillar } from "@/types/culturalBriefing";

const makePillar = (slug: string, behaviors: Array<{ categories: string[]; severity: "critical" | "important" | "nice_to_know" }>): CulturalPillar => ({
  name: slug.charAt(0).toUpperCase() + slug.slice(1),
  japanese: slug,
  slug,
  pronunciation: slug,
  tagline: `${slug} tagline`,
  concept: `${slug} concept`,
  inPractice: `${slug} in practice`,
  forTravelers: `${slug} for travelers`,
  briefIntro: `${slug} brief intro`,
  icon: "test",
  sortOrder: 1,
  behaviors: behaviors.map((b, i) => ({
    situation: `situation-${i}`,
    action: `action-${i}`,
    why: `why-${i}`,
    ...b,
  })),
});

describe("scorePillar", () => {
  it("should score higher when more behaviors match trip categories", () => {
    const pillar = makePillar("wa", [
      { categories: ["temple"], severity: "important" },
      { categories: ["shrine"], severity: "important" },
      { categories: ["restaurant"], severity: "important" },
    ]);
    const highScore = scorePillar(pillar, ["temple", "shrine", "restaurant"]);
    const lowScore = scorePillar(pillar, ["park"]);
    expect(highScore).toBeGreaterThan(lowScore);
  });

  it("should weight critical behaviors higher", () => {
    const criticalPillar = makePillar("kegare", [
      { categories: ["onsen"], severity: "critical" },
    ]);
    const importantPillar = makePillar("wa", [
      { categories: ["onsen"], severity: "important" },
    ]);
    const critScore = scorePillar(criticalPillar, ["onsen"]);
    const impScore = scorePillar(importantPillar, ["onsen"]);
    expect(critScore).toBeGreaterThan(impScore);
  });
});

describe("assembleBriefing", () => {
  const pillars: CulturalPillar[] = [
    makePillar("wa", [
      { categories: ["transit"], severity: "important" },
      { categories: ["restaurant"], severity: "nice_to_know" },
    ]),
    makePillar("kegare", [
      { categories: ["onsen"], severity: "critical" },
      { categories: ["temple"], severity: "critical" },
      { categories: ["shrine"], severity: "important" },
    ]),
    makePillar("meiwaku", [
      { categories: ["market"], severity: "important" },
    ]),
    makePillar("omotenashi", [
      { categories: ["restaurant"], severity: "important" },
    ]),
    makePillar("ma", [
      { categories: ["temple"], severity: "nice_to_know" },
    ]),
  ];

  it("should return all 5 pillars regardless of trip content", () => {
    const result = assembleBriefing(pillars, ["restaurant"]);
    expect(result.pillars).toHaveLength(5);
  });

  it("should order pillars by relevance to trip categories", () => {
    const result = assembleBriefing(pillars, ["onsen", "temple", "shrine"]);
    expect(result.pillars[0].slug).toBe("kegare");
  });

  it("should include all critical behaviors that match", () => {
    const result = assembleBriefing(pillars, ["onsen", "temple"]);
    const kegare = result.pillars.find((p) => p.slug === "kegare");
    const criticals = kegare!.behaviors.filter((b) => b.severity === "critical");
    expect(criticals).toHaveLength(2);
  });

  it("should cap important behaviors at 3 per pillar", () => {
    const manyImportant = makePillar("test", [
      { categories: ["temple"], severity: "important" },
      { categories: ["temple"], severity: "important" },
      { categories: ["temple"], severity: "important" },
      { categories: ["temple"], severity: "important" },
      { categories: ["temple"], severity: "important" },
    ]);
    const result = assembleBriefing([manyImportant], ["temple"]);
    const importants = result.pillars[0].behaviors.filter((b) => b.severity === "important");
    expect(importants.length).toBeLessThanOrEqual(3);
  });

  it("should cap nice_to_know behaviors at 2 per pillar", () => {
    const manyNice = makePillar("test", [
      { categories: ["park"], severity: "nice_to_know" },
      { categories: ["park"], severity: "nice_to_know" },
      { categories: ["park"], severity: "nice_to_know" },
      { categories: ["park"], severity: "nice_to_know" },
    ]);
    const result = assembleBriefing([manyNice], ["park"]);
    const niceToKnow = result.pillars[0].behaviors.filter((b) => b.severity === "nice_to_know");
    expect(niceToKnow.length).toBeLessThanOrEqual(2);
  });

  it("should use fallback intro when none provided", () => {
    const result = assembleBriefing(pillars, ["restaurant"]);
    expect(result.intro).toBeTruthy();
    expect(typeof result.intro).toBe("string");
  });

  it("should use provided intro when given", () => {
    const result = assembleBriefing(pillars, ["restaurant"], "Custom intro text.");
    expect(result.intro).toBe("Custom intro text.");
  });

  it("should include unmatched behaviors when no categories match at all", () => {
    const result = assembleBriefing(pillars, []);
    const totalBehaviors = result.pillars.reduce((sum, p) => sum + p.behaviors.length, 0);
    expect(totalBehaviors).toBeGreaterThan(0);
  });
});
