import { describe, it, expect } from "vitest";
import { buildGuide } from "../guideBuilder";
import type { Itinerary, ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { GeneratedGuide } from "@/types/llmConstraints";

function makeActivity(id: string, title: string, tags?: string[]): Extract<ItineraryActivity, { kind: "place" }> {
  return {
    kind: "place",
    id,
    title,
    locationId: id,
    category: "temple",
    tags,
    estimatedDuration: 60,
  } as Extract<ItineraryActivity, { kind: "place" }>;
}

function makeDay(id: string, activities: ItineraryActivity[]): ItineraryDay {
  return {
    id,
    cityId: "kyoto",
    activities,
  } as ItineraryDay;
}

function makeItinerary(days: ItineraryDay[]): Itinerary {
  return {
    days,
    timezone: "Asia/Tokyo",
  } as Itinerary;
}

describe("buildGuide prose merge", () => {
  it("replaces only provided prose segments, keeps template for the rest", () => {
    const activities = [
      makeActivity("act-1", "Fushimi Inari", ["shrine"]),
      makeActivity("act-2", "Kinkakuji", ["temple"]),
      makeActivity("act-3", "Arashiyama", ["nature"]),
    ];
    const day = makeDay("day-1", activities);
    const itinerary = makeItinerary([day]);

    const guideProse: GeneratedGuide = {
      tripOverview: "A day in Kyoto.",
      days: [{
        dayId: "day-1",
        intro: "Starting with shrines.",
        transitions: ["Walking north to the golden pavilion."],
        culturalMoment: "The torii gates represent transition between worlds.",
        // No practicalTip -- should keep template version
        summary: "A temple-filled day.",
      }],
    };

    const guide = buildGuide(itinerary, undefined, undefined, guideProse);
    const dayGuide = guide.days[0]!;

    // LLM cultural moment should be present
    const cmSegment = dayGuide.segments.find((s) => s.type === "cultural_moment");
    expect(cmSegment?.content).toBe("The torii gates represent transition between worlds.");

    // LLM transition should be present
    const transitionSegments = dayGuide.segments.filter((s) => s.type === "activity_context");
    expect(transitionSegments.length).toBeGreaterThan(0);
    const lllmTransition = transitionSegments.find((s) => s.content === "Walking north to the golden pavilion.");
    expect(lllmTransition).toBeDefined();
  });

  it("triggers a cultural moment for landmark activities", () => {
    // Before landmark was added to CULTURAL_SUBCATEGORIES, existing templates
    // like landmark:osaka (cm-33) and landmark:tokyo (cm-34) sat dormant.
    // This guards the activation path.
    const day: ItineraryDay = {
      id: "day-1",
      cityId: "osaka",
      activities: [makeActivity("act-1", "Osaka Castle", ["landmark"])],
    } as ItineraryDay;
    const itinerary = makeItinerary([day]);

    const guide = buildGuide(itinerary);
    const cmSegment = guide.days[0]!.segments.find((s) => s.type === "cultural_moment");

    expect(cmSegment).toBeDefined();
    // The matcher should prefer landmark:osaka (cm-33) over landmark:any (cm-47).
    expect(cmSegment?.content.toLowerCase()).toMatch(/osaka castle|toyotomi|hideyoshi/);
  });

  it("preserves template segment order after merge", () => {
    const activities = [
      makeActivity("act-1", "Fushimi Inari", ["shrine"]),
      makeActivity("act-2", "Kinkakuji", ["temple"]),
    ];
    const day = makeDay("day-1", activities);
    const itinerary = makeItinerary([day]);

    // Build WITHOUT prose to get template order
    const templateGuide = buildGuide(itinerary);
    const templateOrder = templateGuide.days[0]!.segments.map((s) => s.type);

    // Build WITH prose
    const guideProse: GeneratedGuide = {
      tripOverview: "Overview.",
      days: [{
        dayId: "day-1",
        intro: "Intro.",
        transitions: ["Transition."],
        culturalMoment: "Cultural moment.",
        practicalTip: "Practical tip.",
        summary: "Summary.",
      }],
    };

    const mergedGuide = buildGuide(itinerary, undefined, undefined, guideProse);
    const mergedOrder = mergedGuide.days[0]!.segments.map((s) => s.type);

    // Template segment types should appear in the same order in merged output.
    // Additional prose transitions may be appended at the end (no template match).
    const templateTypesInMerged = mergedOrder.filter((t) =>
      templateOrder.includes(t),
    );
    expect(templateTypesInMerged).toEqual(templateOrder);

    // Verify LLM content is present
    const cm = mergedGuide.days[0]!.segments.find((s) => s.type === "cultural_moment");
    expect(cm?.content).toBe("Cultural moment.");

    const tip = mergedGuide.days[0]!.segments.find((s) => s.type === "practical_tip");
    expect(tip?.content).toBe("Practical tip.");
  });
});
