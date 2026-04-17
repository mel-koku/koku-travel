import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapboxSuggest, mapboxRetrieve } from "@/lib/addressSearch/mapbox";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("mapboxSuggest", () => {
  it("sends query and session_token, parses suggestions", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        suggestions: [
          { mapbox_id: "m-1", name: "Ramen Shop", place_formatted: "Shibuya, Tokyo" },
          { mapbox_id: "m-2", name: "Ramen Bar", place_formatted: "Shinjuku, Tokyo" },
        ],
      }),
    });

    const result = await mapboxSuggest("ramen", "sess-123", "access-token");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/search/searchbox/v1/suggest");
    expect(url.searchParams.get("q")).toBe("ramen");
    expect(url.searchParams.get("session_token")).toBe("sess-123");
    expect(url.searchParams.get("access_token")).toBe("access-token");
    expect(url.searchParams.get("country")).toBe("jp");

    expect(result).toEqual([
      { id: "m-1", title: "Ramen Shop", subtitle: "Shibuya, Tokyo" },
      { id: "m-2", title: "Ramen Bar", subtitle: "Shinjuku, Tokyo" },
    ]);
  });
});

describe("mapboxRetrieve", () => {
  it("parses coordinates, address, and opening_hours when present", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              name: "Ramen Shop",
              full_address: "1-1 Shibuya, Tokyo",
              coordinates: { longitude: 139.7, latitude: 35.66 },
              metadata: {
                open_hours: {
                  periods: [
                    {
                      open: { day: 1, time: "1100" },
                      close: { day: 1, time: "2200" },
                    },
                  ],
                },
              },
            },
          },
        ],
      }),
    });

    const result = await mapboxRetrieve("m-1", "sess-123", "access-token");

    expect(result).toEqual({
      title: "Ramen Shop",
      address: "1-1 Shibuya, Tokyo",
      coordinates: { lat: 35.66, lng: 139.7 },
      openingHours: {
        timezone: "Asia/Tokyo",
        periods: [{ day: "monday", open: "11:00", close: "22:00" }],
      },
      source: "mapbox",
    });
  });

  it("returns result without openingHours when metadata.open_hours is absent", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              name: "Small Shop",
              full_address: "2-2 Ginza, Tokyo",
              coordinates: { longitude: 139.76, latitude: 35.67 },
            },
          },
        ],
      }),
    });

    const result = await mapboxRetrieve("m-2", "sess-123", "access-token");
    expect(result.openingHours).toBeUndefined();
    expect(result.coordinates.lat).toBe(35.67);
  });
});
