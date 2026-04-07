/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(() => "mock-model"),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/data/festivalCalendar", () => ({
  getFestivalsForDay: vi.fn(() => []),
}));

import { generateDailyBriefings } from "../dailyBriefingGenerator";
import { generateObject } from "ai";

const mockGenerateObject = vi.mocked(generateObject);

describe("generateDailyBriefings", () => {
  const mockItinerary = {
    days: [
      { id: "day-1", cityId: "kyoto", activities: [] },
      { id: "day-2", cityId: "osaka", activities: [] },
    ],
  } as any;

  const mockBuilderData = {
    dates: { start: "2026-05-01", end: "2026-05-02" },
    style: "balanced",
    group: { type: "solo" },
  } as any;

  it("should return null when any briefing text is empty", async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: {
        days: [
          { dayId: "day-1", briefing: "Solid briefing here." },
          { dayId: "day-2", briefing: "" },
        ],
      },
    } as any);

    const result = await generateDailyBriefings(mockItinerary, mockBuilderData);
    expect(result).toBeNull();
  });

  it("should return null when any briefing text is whitespace-only", async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: {
        days: [
          { dayId: "day-1", briefing: "   " },
          { dayId: "day-2", briefing: "Real content." },
        ],
      },
    } as any);

    const result = await generateDailyBriefings(mockItinerary, mockBuilderData);
    expect(result).toBeNull();
  });

  it("should return briefings when all have content", async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: {
        days: [
          { dayId: "day-1", briefing: "Kyoto briefing." },
          { dayId: "day-2", briefing: "Osaka briefing." },
        ],
      },
    } as any);

    const result = await generateDailyBriefings(mockItinerary, mockBuilderData);
    expect(result).not.toBeNull();
    expect(result!.days).toHaveLength(2);
  });
});
