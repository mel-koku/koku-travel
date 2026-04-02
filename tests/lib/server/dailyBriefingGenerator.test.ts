import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTestItinerary,
  createTestItineraryDay,
  createTestPlaceActivity,
  createTestBuilderData,
} from "../../fixtures/itinerary";
import type { GeneratedBriefings } from "@/types/llmConstraints";

// Mock server-only, AI SDK
vi.mock("server-only", () => ({}));
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/google", () => ({
  google: vi.fn().mockReturnValue("mock-model"),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/utils/errorUtils", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));
vi.mock("@/data/festivalCalendar", () => ({
  getFestivalsForDay: vi.fn().mockReturnValue([]),
}));

const { generateObject } = await import("ai");
const { generateDailyBriefings } = await import(
  "@/lib/server/dailyBriefingGenerator"
);

const day1 = createTestItineraryDay({
  id: "day-1",
  cityId: "kyoto",
  activities: [
    createTestPlaceActivity({
      title: "Kiyomizu Temple",
      tags: ["culture", "temple"],
    }),
  ],
});
const day2 = createTestItineraryDay({
  id: "day-2",
  cityId: "osaka",
  activities: [
    createTestPlaceActivity({
      title: "Dotonbori",
      tags: ["food", "market"],
    }),
  ],
});

const testItinerary = createTestItinerary({ days: [day1, day2] });
const testBuilderData = createTestBuilderData({
  cities: ["kyoto", "osaka"],
  duration: 2,
});

describe("generateDailyBriefings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns briefings for all days on success", async () => {
    const mockResult: GeneratedBriefings = {
      days: [
        { dayId: "day-1", briefing: "Arrive in Kyoto and head to Kiyomizu Temple early." },
        { dayId: "day-2", briefing: "Cross to Osaka for street food at Dotonbori." },
      ],
    };

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockResult,
      finishReason: "stop",
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      rawResponse: undefined,
      warnings: [],
      request: {},
      response: {},
      toJsonResponse: () => new Response(),
    } as never);

    const result = await generateDailyBriefings(testItinerary, testBuilderData);

    expect(result).not.toBeNull();
    expect(result!.days).toHaveLength(2);
    expect(result!.days[0]!.dayId).toBe("day-1");
    expect(result!.days[1]!.dayId).toBe("day-2");
  });

  it("returns null when LLM returns incomplete days", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: {
        days: [
          { dayId: "day-1", briefing: "Only one day returned." },
          // day-2 missing
        ],
      },
      finishReason: "stop",
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      rawResponse: undefined,
      warnings: [],
      request: {},
      response: {},
      toJsonResponse: () => new Response(),
    } as never);

    const result = await generateDailyBriefings(testItinerary, testBuilderData);
    expect(result).toBeNull();
  });

  it("returns null on timeout", async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(
      new DOMException("The operation was aborted", "AbortError"),
    );

    const result = await generateDailyBriefings(testItinerary, testBuilderData);
    expect(result).toBeNull();
  });

  it("returns null for empty itinerary", async () => {
    const emptyItinerary = createTestItinerary({ days: [] });
    const result = await generateDailyBriefings(emptyItinerary, testBuilderData);
    expect(result).toBeNull();
  });
});
