import { describe, it, expect } from "vitest";
import type {
  CulturalPillar,
  PillarBehavior,
  AssembledPillar,
  CulturalBriefing,
} from "@/types/culturalBriefing";

describe("CulturalBriefing types", () => {
  it("should allow constructing a valid CulturalBriefing", () => {
    const behavior: PillarBehavior = {
      situation: "On the train",
      action: "Keep your phone on silent and avoid calls",
      why: "Public spaces prioritize collective comfort over individual convenience",
      categories: ["transit"],
      severity: "important",
    };

    const pillar: AssembledPillar = {
      slug: "wa",
      name: "Wa",
      japanese: "\u548C",
      pronunciation: "wah",
      tagline: "Harmony is the highest value",
      concept: "Wa means maintaining group harmony.",
      inPractice: "You'll notice it in how people queue, how trains run silently.",
      forTravelers: "Your awareness of shared space is the simplest form of respect.",
      briefIntro: "The principle that shapes every public interaction in Japan.",
      icon: "\u2728",
      behaviors: [behavior],
    };

    const briefing: CulturalBriefing = {
      intro: "Your Kyoto temple-heavy itinerary means purification rituals daily.",
      pillars: [pillar],
    };

    expect(briefing.pillars).toHaveLength(1);
    expect(briefing.pillars[0].slug).toBe("wa");
    expect(briefing.pillars[0].behaviors[0].severity).toBe("important");
  });

  it("should allow all severity levels", () => {
    const severities = ["critical", "important", "nice_to_know"] as const;
    for (const severity of severities) {
      const b: PillarBehavior = {
        situation: "test",
        action: "test",
        why: "test",
        categories: [],
        severity,
      };
      expect(b.severity).toBe(severity);
    }
  });
});
