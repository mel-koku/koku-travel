import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  initLLMMocks,
  setupLLMEnv,
  teardownLLMEnv,
  mockGenerateObjectSuccess,
  mockGenerateObjectFailure,
  mockGenerateObjectTimeout,
} from "../../fixtures/llmMocks";
import {
  createTestItinerary,
  createTestItineraryDay,
  createTestPlaceActivity,
  createTestNoteActivity,
  createTestBuilderData,
} from "../../fixtures/itinerary";
import { createTestLocation } from "../../fixtures/locations";
import type { RefinementPatch } from "@/types/llmConstraints";
import type { Location } from "@/types/location";

// Mock server-only and AI SDK
vi.mock("server-only", () => ({}));
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@/lib/server/llmProvider", () => ({
  getModel: vi.fn().mockReturnValue("mock-model"),
  VERTEX_PROVIDER_OPTIONS: { google: { streamFunctionCallArguments: false } },
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks
const { refineDays, applyPatches } = await import(
  "@/lib/server/dayRefinement"
);

const locA = createTestLocation({ id: "loc-a", name: "Location A" });
const locB = createTestLocation({ id: "loc-b", name: "Location B" });
const locReplacement = createTestLocation({
  id: "loc-replacement",
  name: "Replacement Location",
});
const allLocations: Location[] = [locA, locB, locReplacement];

describe("refineDays", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initLLMMocks();
  });
  afterEach(() => {
    teardownLLMEnv();
  });

  describe("graceful degradation", () => {
    it("returns original itinerary when API key missing", async () => {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const itinerary = createTestItinerary();
      const result = await refineDays(
        itinerary,
        createTestBuilderData(),
        allLocations,
      );
      expect(result).toBe(itinerary);
    });

    it("returns original itinerary on Gemini error", async () => {
      setupLLMEnv();
      mockGenerateObjectFailure();
      const itinerary = createTestItinerary();
      const result = await refineDays(
        itinerary,
        createTestBuilderData(),
        allLocations,
      );
      // Should be the original (not a new object)
      expect(result.days).toEqual(itinerary.days);
    });

    it("returns original itinerary on timeout", async () => {
      setupLLMEnv();
      mockGenerateObjectTimeout();
      vi.useFakeTimers();
      const itinerary = createTestItinerary();
      const promise = refineDays(
        itinerary,
        createTestBuilderData(),
        allLocations,
      );
      vi.advanceTimersByTime(9000);
      const result = await promise;
      expect(result.days).toEqual(itinerary.days);
      vi.useRealTimers();
    });

    it("returns original itinerary when no patches returned", async () => {
      setupLLMEnv();
      mockGenerateObjectSuccess({
        patches: [],
        qualityScore: 9,
        summary: "Looks good",
      });
      const itinerary = createTestItinerary();
      const result = await refineDays(
        itinerary,
        createTestBuilderData(),
        allLocations,
      );
      expect(result).toBe(itinerary);
    });

    it("returns original itinerary when days are empty", async () => {
      setupLLMEnv();
      const itinerary = createTestItinerary({ days: [] });
      const result = await refineDays(
        itinerary,
        createTestBuilderData(),
        allLocations,
      );
      expect(result).toBe(itinerary);
    });
  });
});

describe("applyPatches", () => {
  const actA = createTestPlaceActivity({
    id: "act-a",
    title: "Activity A",
    locationId: "loc-a",
    timeOfDay: "morning",
    durationMin: 60,
  });
  const actB = createTestPlaceActivity({
    id: "act-b",
    title: "Activity B",
    locationId: "loc-b",
    timeOfDay: "afternoon",
    durationMin: 90,
  });
  const noteAct = createTestNoteActivity({ id: "note-1" });

  function makeItinerary() {
    return createTestItinerary({
      days: [
        createTestItineraryDay({
          id: "day-0",
          activities: [actA, actB, noteAct],
        }),
      ],
    });
  }

  describe("swap patches", () => {
    it("replaces activity with valid replacement", () => {
      const patches: RefinementPatch[] = [
        {
          type: "swap",
          dayIndex: 0,
          targetActivityId: "act-a",
          replacementLocationId: "loc-replacement",
          reason: "Better fit",
        },
      ];
      const result = applyPatches(makeItinerary(), patches, allLocations);
      const swapped = result.days[0]!.activities.find(
        (a) => a.id === "loc-replacement-refined",
      );
      expect(swapped).toBeDefined();
      expect(swapped?.kind).toBe("place");
      if (swapped?.kind === "place") {
        expect(swapped.title).toBe("Replacement Location");
        expect(swapped.timeOfDay).toBe("morning"); // Preserved from original
      }
    });

    it("preserves schedule from original activity on swap", () => {
      const actWithSchedule = {
        ...actA,
        schedule: {
          arrivalTime: "09:00",
          departureTime: "10:00",
          status: "scheduled" as const,
        },
      };
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-0",
            activities: [actWithSchedule, actB],
          }),
        ],
      });
      const patches: RefinementPatch[] = [
        {
          type: "swap",
          dayIndex: 0,
          targetActivityId: "act-a",
          replacementLocationId: "loc-replacement",
          reason: "test",
        },
      ];
      const result = applyPatches(itinerary, patches, allLocations);
      const swapped = result.days[0]!.activities[0]!;
      if (swapped.kind === "place") {
        expect(swapped.schedule?.arrivalTime).toBe("09:00");
      }
    });

    it("skips when target activity not found", () => {
      const patches: RefinementPatch[] = [
        {
          type: "swap",
          dayIndex: 0,
          targetActivityId: "nonexistent",
          replacementLocationId: "loc-replacement",
          reason: "test",
        },
      ];
      const original = makeItinerary();
      const result = applyPatches(original, patches, allLocations);
      // Activities unchanged
      expect(result.days[0]!.activities[0]!.id).toBe("act-a");
    });

    it("skips when replacement location not found", () => {
      const patches: RefinementPatch[] = [
        {
          type: "swap",
          dayIndex: 0,
          targetActivityId: "act-a",
          replacementLocationId: "nonexistent-loc",
          reason: "test",
        },
      ];
      const result = applyPatches(makeItinerary(), patches, allLocations);
      expect(result.days[0]!.activities[0]!.id).toBe("act-a");
    });

    it("skips when target is a note activity", () => {
      const patches: RefinementPatch[] = [
        {
          type: "swap",
          dayIndex: 0,
          targetActivityId: "note-1",
          replacementLocationId: "loc-replacement",
          reason: "test",
        },
      ];
      const result = applyPatches(makeItinerary(), patches, allLocations);
      const note = result.days[0]!.activities.find((a) => a.id === "note-1");
      expect(note?.kind).toBe("note");
    });
  });

  describe("reorder patches", () => {
    it("reorders place activities correctly", () => {
      const patches: RefinementPatch[] = [
        {
          type: "reorder",
          dayIndex: 0,
          newOrder: ["act-b", "act-a"],
          reason: "Better flow",
        },
      ];
      const result = applyPatches(makeItinerary(), patches, allLocations);
      const placeActivities = result.days[0]!.activities.filter(
        (a) => a.kind === "place",
      );
      expect(placeActivities[0]!.id).toBe("act-b");
      expect(placeActivities[1]!.id).toBe("act-a");
    });

    it("preserves non-place activities during reorder", () => {
      const patches: RefinementPatch[] = [
        {
          type: "reorder",
          dayIndex: 0,
          newOrder: ["act-b", "act-a"],
          reason: "test",
        },
      ];
      const result = applyPatches(makeItinerary(), patches, allLocations);
      const noteActivities = result.days[0]!.activities.filter(
        (a) => a.kind === "note",
      );
      expect(noteActivities).toHaveLength(1);
    });

    it("skips on count mismatch", () => {
      const patches: RefinementPatch[] = [
        {
          type: "reorder",
          dayIndex: 0,
          newOrder: ["act-a"], // Missing act-b
          reason: "test",
        },
      ];
      const result = applyPatches(makeItinerary(), patches, allLocations);
      // Order unchanged
      const placeActivities = result.days[0]!.activities.filter(
        (a) => a.kind === "place",
      );
      expect(placeActivities[0]!.id).toBe("act-a");
    });

    it("skips on unknown activity IDs", () => {
      const patches: RefinementPatch[] = [
        {
          type: "reorder",
          dayIndex: 0,
          newOrder: ["act-a", "nonexistent"],
          reason: "test",
        },
      ];
      const result = applyPatches(makeItinerary(), patches, allLocations);
      const placeActivities = result.days[0]!.activities.filter(
        (a) => a.kind === "place",
      );
      expect(placeActivities[0]!.id).toBe("act-a");
    });

    it("skips on duplicate activity IDs to prevent silent activity loss", () => {
      // Regression: a patch like [act-a, act-a] for original [act-a, act-b]
      // would silently drop act-b — the length check matches, every ID
      // "exists" in the activity map, but act-b never makes it into the
      // reordered list because the loop pulls act-a twice.
      const patches: RefinementPatch[] = [
        {
          type: "reorder",
          dayIndex: 0,
          newOrder: ["act-a", "act-a"],
          reason: "test",
        },
      ];
      const result = applyPatches(makeItinerary(), patches, allLocations);
      const placeActivities = result.days[0]!.activities.filter(
        (a) => a.kind === "place",
      );
      // Both original activities must still be present in their original order
      expect(placeActivities).toHaveLength(2);
      expect(placeActivities[0]!.id).toBe("act-a");
      expect(placeActivities[1]!.id).toBe("act-b");
    });
  });

  describe("flag patches", () => {
    it("appends flag note to activity", () => {
      const patches: RefinementPatch[] = [
        {
          type: "flag",
          dayIndex: 0,
          activityId: "act-a",
          severity: "warning",
          message: "Steep stairs",
        },
      ];
      const result = applyPatches(makeItinerary(), patches, allLocations);
      const flagged = result.days[0]!.activities.find(
        (a) => a.id === "act-a",
      );
      if (flagged?.kind === "place") {
        expect(flagged.notes).toContain("warning: Steep stairs");
      }
    });

    it("preserves existing notes when adding flag", () => {
      const actWithNotes = { ...actA, notes: "Existing note" };
      const itinerary = createTestItinerary({
        days: [
          createTestItineraryDay({
            id: "day-0",
            activities: [actWithNotes, actB],
          }),
        ],
      });
      const patches: RefinementPatch[] = [
        {
          type: "flag",
          dayIndex: 0,
          activityId: "act-a",
          severity: "info",
          message: "Extra info",
        },
      ];
      const result = applyPatches(itinerary, patches, allLocations);
      const flagged = result.days[0]!.activities.find(
        (a) => a.id === "act-a",
      );
      if (flagged?.kind === "place") {
        expect(flagged.notes).toContain("Existing note");
        expect(flagged.notes).toContain("info: Extra info");
      }
    });

    it("skips when target activity not found", () => {
      const patches: RefinementPatch[] = [
        {
          type: "flag",
          dayIndex: 0,
          activityId: "nonexistent",
          severity: "warning",
          message: "test",
        },
      ];
      const result = applyPatches(makeItinerary(), patches, allLocations);
      // No changes
      expect(result.days[0]!.activities[0]!.id).toBe("act-a");
    });
  });

  describe("edge cases", () => {
    it("skips patch with invalid day index", () => {
      const patches: RefinementPatch[] = [
        {
          type: "flag",
          dayIndex: 99,
          activityId: "act-a",
          severity: "info",
          message: "test",
        },
      ];
      const result = applyPatches(makeItinerary(), patches, allLocations);
      expect(result.days).toHaveLength(1);
    });

    it("handles mixed patch types in one call", () => {
      const patches: RefinementPatch[] = [
        {
          type: "swap",
          dayIndex: 0,
          targetActivityId: "act-a",
          replacementLocationId: "loc-replacement",
          reason: "swap",
        },
        {
          type: "flag",
          dayIndex: 0,
          activityId: "act-b",
          severity: "info",
          message: "heads up",
        },
      ];
      const result = applyPatches(makeItinerary(), patches, allLocations);
      // Swap should have happened
      const swapped = result.days[0]!.activities.find(
        (a) => a.id === "loc-replacement-refined",
      );
      expect(swapped).toBeDefined();
      // Flag should have been applied
      const flagged = result.days[0]!.activities.find(
        (a) => a.id === "act-b",
      );
      if (flagged?.kind === "place") {
        expect(flagged.notes).toContain("info: heads up");
      }
    });

    it("does not mutate the original itinerary", () => {
      const original = makeItinerary();
      const originalFirstId = original.days[0]!.activities[0]!.id;
      const patches: RefinementPatch[] = [
        {
          type: "swap",
          dayIndex: 0,
          targetActivityId: "act-a",
          replacementLocationId: "loc-replacement",
          reason: "test",
        },
      ];
      applyPatches(original, patches, allLocations);
      expect(original.days[0]!.activities[0]!.id).toBe(originalFirstId);
    });
  });
});
