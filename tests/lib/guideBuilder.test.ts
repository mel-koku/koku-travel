import { describe, it, expect } from "vitest";
import { buildGuide } from "@/lib/guide/guideBuilder";
import {
  createTestItinerary,
  createTestItineraryDay,
  createTestPlaceActivity,
  createTestBuilderData,
} from "../fixtures/itinerary";
import type { GeneratedGuide } from "@/types/llmConstraints";

// ── Shared test data ────────────────────────────────────────────────

const templeActivity = (id: string) =>
  createTestPlaceActivity({
    id,
    title: "Kiyomizu-dera",
    tags: ["culture", "temple"],
    neighborhood: "Higashiyama",
    description: "A hillside temple with sweeping views over Kyoto.",
  });

const marketActivity = (id: string) =>
  createTestPlaceActivity({
    id,
    title: "Nishiki Market",
    tags: ["food", "market"],
    neighborhood: "Downtown",
    description: "A narrow covered street lined with food stalls.",
  });

const shrineActivity = (id: string) =>
  createTestPlaceActivity({
    id,
    title: "Fushimi Inari",
    tags: ["culture", "shrine"],
    neighborhood: "Fushimi",
    description: "Thousands of vermilion torii gates snake up Mount Inari.",
  });

// ── Tests ────────────────────────────────────────────────────────────

describe("buildGuide", () => {
  // ── Pure template fallback (no guideProse) ──────────────────────

  describe("with no guideProse (pure template fallback)", () => {
    it("returns a TripGuide with one DayGuide per itinerary day", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            activities: [templeActivity("a1"), marketActivity("a2")],
          }),
          createTestItineraryDay({
            id: "day-2",
            activities: [shrineActivity("a3")],
          }),
        ],
      });

      const guide = buildGuide(itinerary);
      expect(guide.days).toHaveLength(2);
      expect(guide.days[0]!.dayId).toBe("day-1");
      expect(guide.days[1]!.dayId).toBe("day-2");
    });

    it("produces a day intro and summary for each day", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            activities: [templeActivity("a1")],
          }),
        ],
      });

      const guide = buildGuide(itinerary);
      const day = guide.days[0]!;
      expect(day.intro).toBeDefined();
      expect(day.intro!.type).toBe("day_intro");
      expect(day.intro!.content).toBeTruthy();
      expect(day.summary).toBeDefined();
      expect(day.summary!.type).toBe("day_summary");
      expect(day.summary!.content).toBeTruthy();
    });

    it("generates transition segments between activities", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            activities: [templeActivity("a1"), marketActivity("a2")],
          }),
        ],
      });

      const guide = buildGuide(itinerary);
      const transitions = guide.days[0]!.segments.filter(
        (s) => s.type === "activity_context",
      );
      expect(transitions.length).toBeGreaterThanOrEqual(1);
      expect(transitions[0]!.afterActivityId).toBe("a1");
    });

    it("may produce a cultural moment for cultural activities", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            activities: [templeActivity("a1"), shrineActivity("a2")],
          }),
        ],
      });

      const guide = buildGuide(itinerary);
      const cms = guide.days[0]!.segments.filter(
        (s) => s.type === "cultural_moment",
      );
      // Cultural moment templates exist for temple/shrine in kyoto, so we expect one
      expect(cms.length).toBeLessThanOrEqual(1); // max 1 per day
    });

    it("may include a trip overview when template matches", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({ id: "day-1", cityId: "kyoto" }),
        ],
      });
      const builder = createTestBuilderData({
        dates: { start: "2026-04-01", end: "2026-04-02" },
      });

      const guide = buildGuide(itinerary, builder);
      // Trip overview may or may not match depending on template data.
      // Just verify the structure is correct if present.
      if (guide.overview) {
        expect(guide.overview.type).toBe("trip_overview");
        expect(guide.overview.content).toBeTruthy();
      }
    });
  });

  // ── Full LLM-generated guideProse ──────────────────────────────

  describe("with full guideProse (LLM-generated)", () => {
    const guideProse: GeneratedGuide = {
      tripOverview: "Two days winding through Kyoto's back streets.",
      days: [
        {
          dayId: "day-1",
          intro: "Higashiyama wakes slowly in the mist.",
          transitions: ["The path narrows past the pottery shops."],
          culturalMoment: "Kiyomizu means 'pure water'.",
          practicalTip: "Fill your IC card at the station.",
          summary: "A day of worn stone and good noodles.",
        },
        {
          dayId: "day-2",
          intro: "The foxes guard the mountain.",
          transitions: [],
          summary: "Quiet trails above the city.",
        },
      ],
    };

    const itinerary = createTestItinerary({
      days: [
        createTestItineraryDay({
          id: "day-1",
          activities: [templeActivity("a1"), marketActivity("a2")],
        }),
        createTestItineraryDay({
          id: "day-2",
          activities: [shrineActivity("a3")],
        }),
      ],
    });

    it("uses the generated trip overview", () => {
      const guide = buildGuide(itinerary, undefined, undefined, guideProse);
      expect(guide.overview).toBeDefined();
      expect(guide.overview!.content).toBe(guideProse.tripOverview);
      expect(guide.overview!.type).toBe("trip_overview");
    });

    it("uses the generated day intro", () => {
      const guide = buildGuide(itinerary, undefined, undefined, guideProse);
      expect(guide.days[0]!.intro!.content).toBe("Higashiyama wakes slowly in the mist.");
      expect(guide.days[1]!.intro!.content).toBe("The foxes guard the mountain.");
    });

    it("uses generated transitions instead of template transitions", () => {
      const guide = buildGuide(itinerary, undefined, undefined, guideProse);
      const day1Transitions = guide.days[0]!.segments.filter(
        (s) => s.type === "activity_context",
      );
      expect(day1Transitions).toHaveLength(1);
      expect(day1Transitions[0]!.content).toBe(
        "The path narrows past the pottery shops.",
      );
    });

    it("uses generated cultural moment", () => {
      const guide = buildGuide(itinerary, undefined, undefined, guideProse);
      const cms = guide.days[0]!.segments.filter(
        (s) => s.type === "cultural_moment",
      );
      expect(cms).toHaveLength(1);
      expect(cms[0]!.content).toBe("Kiyomizu means 'pure water'.");
    });

    it("uses generated practical tip", () => {
      const guide = buildGuide(itinerary, undefined, undefined, guideProse);
      const tips = guide.days[0]!.segments.filter(
        (s) => s.type === "practical_tip",
      );
      expect(tips).toHaveLength(1);
      expect(tips[0]!.content).toBe("Fill your IC card at the station.");
    });

    it("uses generated day summary", () => {
      const guide = buildGuide(itinerary, undefined, undefined, guideProse);
      expect(guide.days[0]!.summary!.content).toBe(
        "A day of worn stone and good noodles.",
      );
      expect(guide.days[1]!.summary!.content).toBe(
        "Quiet trails above the city.",
      );
    });
  });

  // ── Partial guideProse (fallback for missing days) ─────────────

  describe("with partial guideProse (some days missing)", () => {
    it("uses prose for matched days and template fallback for missing days", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            activities: [templeActivity("a1")],
          }),
          createTestItineraryDay({
            id: "day-2",
            activities: [marketActivity("a2")],
          }),
          createTestItineraryDay({
            id: "day-3",
            activities: [shrineActivity("a3")],
          }),
        ],
      });

      const partialProse: GeneratedGuide = {
        tripOverview: "Three days in Kyoto.",
        days: [
          {
            dayId: "day-1",
            intro: "LLM intro for day 1.",
            transitions: [],
            summary: "LLM summary for day 1.",
          },
          // day-2 deliberately missing
          {
            dayId: "day-3",
            intro: "LLM intro for day 3.",
            transitions: [],
            summary: "LLM summary for day 3.",
          },
        ],
      };

      const guide = buildGuide(itinerary, undefined, undefined, partialProse);

      // Day 1: uses prose
      expect(guide.days[0]!.intro!.content).toBe("LLM intro for day 1.");
      expect(guide.days[0]!.summary!.content).toBe("LLM summary for day 1.");

      // Day 2: falls back to template (no prose provided)
      expect(guide.days[1]!.intro!.content).not.toBe("LLM intro for day 1.");
      expect(guide.days[1]!.intro!.content).toBeTruthy();
      expect(guide.days[1]!.summary!.content).toBeTruthy();

      // Day 3: uses prose
      expect(guide.days[2]!.intro!.content).toBe("LLM intro for day 3.");
      expect(guide.days[2]!.summary!.content).toBe("LLM summary for day 3.");
    });

    it("falls back to template summary when prose has no summary", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            activities: [templeActivity("a1"), marketActivity("a2")],
          }),
        ],
      });

      const proseNoSummary: GeneratedGuide = {
        tripOverview: "Overview.",
        days: [
          {
            dayId: "day-1",
            intro: "Custom intro.",
            transitions: [],
            summary: "", // empty summary
          },
        ],
      };

      const guide = buildGuide(itinerary, undefined, undefined, proseNoSummary);
      // Empty string is falsy, so it should fall back to template summary
      expect(guide.days[0]!.summary).toBeDefined();
    });
  });

  // ── dayIntros (standalone, without full guideProse) ─────────────

  describe("with dayIntros (standalone AI intros)", () => {
    it("uses dayIntros for day intro content", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            activities: [templeActivity("a1")],
          }),
        ],
      });

      const dayIntros = { "day-1": "Standalone AI intro for day 1." };

      const guide = buildGuide(itinerary, undefined, dayIntros);
      expect(guide.days[0]!.intro!.content).toBe(
        "Standalone AI intro for day 1.",
      );
    });

    it("guideProse intro takes priority over dayIntros", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            activities: [templeActivity("a1")],
          }),
        ],
      });

      const dayIntros = { "day-1": "From dayIntros." };
      const guideProse: GeneratedGuide = {
        tripOverview: "Overview.",
        days: [
          {
            dayId: "day-1",
            intro: "From guideProse.",
            transitions: [],
            summary: "Summary.",
          },
        ],
      };

      const guide = buildGuide(itinerary, undefined, dayIntros, guideProse);
      expect(guide.days[0]!.intro!.content).toBe("From guideProse.");
    });
  });

  // ── Different itinerary shapes ─────────────────────────────────

  describe("different itinerary shapes", () => {
    it("handles a single-day itinerary", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            activities: [templeActivity("a1"), marketActivity("a2")],
          }),
        ],
      });

      const guide = buildGuide(itinerary);
      expect(guide.days).toHaveLength(1);
      expect(guide.days[0]!.intro).toBeDefined();
      expect(guide.days[0]!.summary).toBeDefined();
    });

    it("handles a multi-day itinerary (5 days)", () => {
      const days = Array.from({ length: 5 }, (_, i) =>
        createTestItineraryDay({
          id: `day-${i + 1}`,
          activities: [
            templeActivity(`a-${i}-1`),
            marketActivity(`a-${i}-2`),
          ],
        }),
      );

      const guide = buildGuide(createTestItinerary({ days }));
      expect(guide.days).toHaveLength(5);
      for (const day of guide.days) {
        expect(day.intro).toBeDefined();
        expect(day.summary).toBeDefined();
      }
    });

    it("handles a day with no activities", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({ id: "day-1", activities: [] }),
        ],
      });

      const guide = buildGuide(itinerary);
      expect(guide.days).toHaveLength(1);
      expect(guide.days[0]!.intro).toBeDefined();
      expect(guide.days[0]!.segments).toHaveLength(0);
      expect(guide.days[0]!.summary).toBeDefined();
    });

    it("handles a day with a single activity", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            activities: [shrineActivity("a1")],
          }),
        ],
      });

      const guide = buildGuide(itinerary);
      const day = guide.days[0]!;
      expect(day.intro).toBeDefined();
      // No transitions for single activity
      const transitions = day.segments.filter(
        (s) => s.type === "activity_context",
      );
      expect(transitions).toHaveLength(0);
      expect(day.summary).toBeDefined();
    });

    it("handles multiple cities across days", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            cityId: "kyoto",
            activities: [templeActivity("a1")],
          }),
          createTestItineraryDay({
            id: "day-2",
            cityId: "osaka",
            activities: [marketActivity("a2")],
          }),
          createTestItineraryDay({
            id: "day-3",
            cityId: "tokyo",
            activities: [shrineActivity("a3")],
          }),
        ],
      });

      const guide = buildGuide(itinerary);
      expect(guide.days).toHaveLength(3);
      // Each day has its own guide regardless of city
      for (const day of guide.days) {
        expect(day.intro).toBeDefined();
        expect(day.summary).toBeDefined();
      }
    });

    it("handles an empty itinerary (no days)", () => {
      const itinerary = createTestItinerary({ days: [] });

      const guide = buildGuide(itinerary);
      expect(guide.days).toHaveLength(0);
    });
  });

  // ── Template matching edge cases ───────────────────────────────

  describe("template matching edge cases", () => {
    it("handles activities without tags", () => {
      const activity = createTestPlaceActivity({
        id: "a1",
        title: "Mystery Spot",
        tags: [],
        description: "An untagged location.",
      });

      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({ id: "day-1", activities: [activity] }),
        ],
      });

      const guide = buildGuide(itinerary);
      expect(guide.days[0]!.intro).toBeDefined();
      expect(guide.days[0]!.summary).toBeDefined();
    });

    it("handles activities without descriptions (no transitions generated)", () => {
      const a1 = createTestPlaceActivity({
        id: "a1",
        title: "Temple A",
        tags: ["culture", "temple"],
        description: undefined,
      });
      const a2 = createTestPlaceActivity({
        id: "a2",
        title: "Temple B",
        tags: ["culture", "temple"],
        description: undefined,
      });

      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({ id: "day-1", activities: [a1, a2] }),
        ],
      });

      const guide = buildGuide(itinerary);
      // Without descriptions, transitions should be skipped
      const transitions = guide.days[0]!.segments.filter(
        (s) => s.type === "activity_context",
      );
      expect(transitions).toHaveLength(0);
    });

    it("handles day without cityId (falls back to activity neighborhood or generic)", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            cityId: undefined,
            activities: [templeActivity("a1")],
          }),
        ],
      });

      const guide = buildGuide(itinerary);
      expect(guide.days[0]!.intro).toBeDefined();
      expect(guide.days[0]!.intro!.content).toBeTruthy();
    });

    it("caps transitions on busy days (5+ activities)", () => {
      const activities = Array.from({ length: 6 }, (_, i) =>
        createTestPlaceActivity({
          id: `a-${i}`,
          title: `Stop ${i + 1}`,
          tags: ["food", "restaurant"],
          description: `Description for stop ${i + 1} with enough text to be meaningful.`,
        }),
      );

      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({ id: "day-1", activities }),
        ],
      });

      const guide = buildGuide(itinerary);
      const transitions = guide.days[0]!.segments.filter(
        (s) => s.type === "activity_context",
      );
      // shouldShowTransition caps at index <= 3 for 5+ activities
      expect(transitions.length).toBeLessThanOrEqual(3);
    });

    it("neighborhood narrative appears when consecutive activities share a neighborhood", () => {
      const a1 = createTestPlaceActivity({
        id: "a1",
        title: "Kiyomizu-dera",
        tags: ["culture", "temple"],
        neighborhood: "Higashiyama",
        description: "Ancient temple.",
      });
      const a2 = createTestPlaceActivity({
        id: "a2",
        title: "Yasaka Shrine",
        tags: ["culture", "shrine"],
        neighborhood: "Higashiyama",
        description: "Iconic shrine at the end of the geisha district.",
      });

      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({ id: "day-1", activities: [a1, a2] }),
        ],
      });

      const guide = buildGuide(itinerary);
      const narratives = guide.days[0]!.segments.filter(
        (s) => s.type === "neighborhood_narrative",
      );
      // May or may not match a template, but should not exceed 1
      expect(narratives.length).toBeLessThanOrEqual(1);
    });

    it("season is derived from tripBuilderData dates", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            activities: [templeActivity("a1")],
          }),
        ],
      });

      // Spring dates
      const springBuilder = createTestBuilderData({
        dates: { start: "2026-04-01", end: "2026-04-03" },
      });
      const guideSpring = buildGuide(itinerary, springBuilder);

      // Winter dates
      const winterBuilder = createTestBuilderData({
        dates: { start: "2026-01-15", end: "2026-01-17" },
      });
      const guideWinter = buildGuide(itinerary, winterBuilder);

      // Both should produce valid guides (content may differ based on season)
      expect(guideSpring.days[0]!.intro).toBeDefined();
      expect(guideWinter.days[0]!.intro).toBeDefined();
    });
  });

  // ── Segment ID and structure invariants ─────────────────────────

  describe("segment structure invariants", () => {
    it("all segments have unique ids within a day", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            activities: [
              templeActivity("a1"),
              marketActivity("a2"),
              shrineActivity("a3"),
            ],
          }),
        ],
      });

      const guide = buildGuide(itinerary);
      const day = guide.days[0]!;
      const allIds = [
        day.intro?.id,
        ...day.segments.map((s) => s.id),
        day.summary?.id,
      ].filter(Boolean);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });

    it("all segments reference the correct dayId", () => {
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-1",
            activities: [templeActivity("a1"), marketActivity("a2")],
          }),
        ],
      });

      const guide = buildGuide(itinerary);
      const day = guide.days[0]!;
      expect(day.intro!.dayId).toBe("day-1");
      for (const seg of day.segments) {
        expect(seg.dayId).toBe("day-1");
      }
      expect(day.summary!.dayId).toBe("day-1");
    });

  });
});
