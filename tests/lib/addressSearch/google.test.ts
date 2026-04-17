import { describe, it, expect, vi, beforeEach } from "vitest";
import { googleSearch, googleRetrieve } from "@/lib/addressSearch/google";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("googleSearch (single-request autocomplete)", () => {
  it("fires one autocomplete request and returns suggestions", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        suggestions: [
          {
            placePrediction: {
              placeId: "g-1",
              text: { text: "Hidden Ramen, Tokyo" },
              structuredFormat: {
                mainText: { text: "Hidden Ramen" },
                secondaryText: { text: "Shibuya, Tokyo" },
              },
            },
          },
        ],
      }),
    });

    const results = await googleSearch("hidden ramen", "sess-1", "gkey");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      { id: "g-1", title: "Hidden Ramen", subtitle: "Shibuya, Tokyo" },
    ]);
  });
});

describe("googleRetrieve", () => {
  it("calls Place Details and parses fields including regularOpeningHours", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        displayName: { text: "Hidden Ramen" },
        formattedAddress: "1-1 Shibuya, Tokyo",
        location: { latitude: 35.66, longitude: 139.7 },
        regularOpeningHours: {
          periods: [
            { open: { day: 1, hour: 11, minute: 0 }, close: { day: 1, hour: 22, minute: 0 } },
          ],
        },
      }),
    });

    const result = await googleRetrieve("g-1", "sess-1", "gkey");

    expect(result.title).toBe("Hidden Ramen");
    expect(result.coordinates).toEqual({ lat: 35.66, lng: 139.7 });
    expect(result.openingHours).toEqual({
      timezone: "Asia/Tokyo",
      periods: [{ day: "monday", open: "11:00", close: "22:00" }],
    });
    expect(result.source).toBe("google");
  });
});
