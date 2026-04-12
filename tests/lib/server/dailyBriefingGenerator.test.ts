import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTestItinerary,
  createTestItineraryDay,
  createTestPlaceActivity,
  createTestBuilderData,
} from "../../fixtures/itinerary";

// Mock server-only, AI SDK
vi.mock("server-only", () => ({}));
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/google-vertex", () => ({
  createVertex: vi.fn().mockReturnValue(vi.fn().mockReturnValue("mock-model")),
}));
vi.mock("@/lib/server/vertexProvider", () => ({
  vertex: vi.fn().mockReturnValue({}),
  VERTEX_GENERATE_OPTIONS: { google: { streamFunctionCallArguments: false } },
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/utils/errorUtils", () => ({
  getErrorMessage: (e: unknown) => String(e),
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
  const originalEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = "fake-creds-json";
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    } else {
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = originalEnv;
    }
  });

  it("returns briefings for all days on success", async () => {
    // New per-day drain: one generateObject call per day
    vi.mocked(generateObject)
      .mockResolvedValueOnce({
        object: { briefing: "Arrive in Kyoto and head to Kiyomizu Temple early." },
      } as never)
      .mockResolvedValueOnce({
        object: { briefing: "Cross to Osaka for street food at Dotonbori." },
      } as never);

    const result = await generateDailyBriefings(testItinerary, testBuilderData);

    expect(result).not.toBeNull();
    expect(result!.days).toHaveLength(2);
    expect(result!.days[0]!.dayId).toBe("day-1");
    expect(result!.days[1]!.dayId).toBe("day-2");
  });

  it("returns a partial shell when one day fails", async () => {
    vi.mocked(generateObject)
      .mockResolvedValueOnce({
        object: { briefing: "Only one day returned." },
      } as never)
      .mockRejectedValueOnce(new Error("day 2 failed"));

    const result = await generateDailyBriefings(testItinerary, testBuilderData);
    // New contract: returns a shell with partial days, not null
    expect(result).not.toBeNull();
    expect(result!.days).toHaveLength(1);
    expect(result!.days[0]!.dayId).toBe("day-1");
  });

  it("returns an empty shell on total failure", async () => {
    vi.mocked(generateObject)
      .mockRejectedValueOnce(new DOMException("aborted", "AbortError"))
      .mockRejectedValueOnce(new DOMException("aborted", "AbortError"));

    const result = await generateDailyBriefings(testItinerary, testBuilderData);
    // New contract: returns empty shell, not null
    expect(result).not.toBeNull();
    expect(result!.days).toEqual([]);
  });

  it("returns null for empty itinerary", async () => {
    const emptyItinerary = createTestItinerary({ days: [] });
    const result = await generateDailyBriefings(emptyItinerary, testBuilderData);
    expect(result).toBeNull();
  });
});
