import { describe, it, expect, vi, beforeEach } from "vitest";

type QueryResult = { data: unknown; error: unknown };

const supabaseFromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: supabaseFromMock,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { attachGuideFallbackImage } from "../fallbackImages";
import type { Guide } from "@/types/guide";

// Returns a Proxy that is both chainable (every prop is a no-op returning self)
// and awaitable (resolves to `result`). Lets the function-under-test exercise
// the real Supabase fluent-builder shape.
function makeChain(result: QueryResult) {
  const target = {
    then: (fn: (r: QueryResult) => unknown) => Promise.resolve(result).then(fn),
  };
  return new Proxy(target, {
    get(t, prop) {
      if (prop === "then") return target.then;
      return () => new Proxy(target, this);
    },
  });
}

function setupSupabase(opts: {
  locationPhotos?: Array<{ location_id: string; photo_name: string; sort_order: number }>;
  locations?: Array<{ id: string; primary_photo_url: string | null }>;
} = {}) {
  supabaseFromMock.mockImplementation((table: string) => {
    if (table === "location_photos") {
      return makeChain({ data: opts.locationPhotos ?? [], error: null });
    }
    if (table === "locations") {
      return makeChain({ data: opts.locations ?? [], error: null });
    }
    throw new Error(`unexpected table: ${table}`);
  });
}

const baseGuide: Guide = {
  id: "test-guide",
  title: "Test",
  summary: "summary",
  body: "body",
  featuredImage: "/images/fallback.jpg",
  thumbnailImage: undefined,
  guideType: "listicle",
  tags: [],
  locationIds: ["loc-a", "loc-b"],
  author: "author",
  status: "published",
  featured: false,
  sortOrder: 0,
  publishedAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  createdAt: "2025-01-01T00:00:00Z",
};

describe("attachGuideFallbackImage", () => {
  beforeEach(() => {
    supabaseFromMock.mockReset();
  });

  it("patches missing featuredImage with a proxy URL from a linked location's photo", async () => {
    setupSupabase({
      locationPhotos: [
        { location_id: "loc-a", photo_name: "places/A/photos/1", sort_order: 0 },
        { location_id: "loc-b", photo_name: "places/B/photos/1", sort_order: 0 },
      ],
    });

    const result = await attachGuideFallbackImage(baseGuide);

    expect(result.featuredImage).toMatch(
      /^\/api\/places\/photo\?photoName=places%2F[AB]%2Fphotos%2F1&maxWidthPx=1200$/
    );
    expect(result.thumbnailImage).toBe(result.featuredImage);
  });

  it("does not modify a guide that already has a real featuredImage and thumbnailImage", async () => {
    setupSupabase({
      locationPhotos: [
        { location_id: "loc-a", photo_name: "places/A/photos/1", sort_order: 0 },
      ],
    });

    const guide: Guide = {
      ...baseGuide,
      featuredImage: "https://cdn.example.com/real.jpg",
      thumbnailImage: "https://cdn.example.com/real-thumb.jpg",
    };
    const result = await attachGuideFallbackImage(guide);

    expect(result).toBe(guide); // identity, no DB call needed
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it("no-ops when the guide has no linked locations", async () => {
    setupSupabase();
    const guide: Guide = { ...baseGuide, locationIds: [] };

    const result = await attachGuideFallbackImage(guide);

    expect(result).toBe(guide);
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it("returns the guide unchanged when no harvested or fallback photos exist", async () => {
    setupSupabase({
      locationPhotos: [],
      locations: [
        { id: "loc-a", primary_photo_url: null },
        { id: "loc-b", primary_photo_url: "/images/fallback.jpg" },
      ],
    });

    const result = await attachGuideFallbackImage(baseGuide);

    expect(result.featuredImage).toBe("/images/fallback.jpg");
    expect(result.thumbnailImage).toBeUndefined();
  });

  it("falls back to a location's primary_photo_url when no location_photos rows exist", async () => {
    setupSupabase({
      locationPhotos: [],
      locations: [
        { id: "loc-a", primary_photo_url: "https://cdn.example.com/loc-a.jpg" },
        { id: "loc-b", primary_photo_url: "https://cdn.example.com/loc-b.jpg" },
      ],
    });

    const result = await attachGuideFallbackImage(baseGuide);

    expect(result.featuredImage).toMatch(
      /^https:\/\/cdn\.example\.com\/loc-[ab]\.jpg$/
    );
  });

  it("is deterministic: same guide id + locations produces the same picked photo", async () => {
    const photoRows = [
      { location_id: "loc-a", photo_name: "places/A/photos/1", sort_order: 0 },
      { location_id: "loc-a", photo_name: "places/A/photos/2", sort_order: 1 },
      { location_id: "loc-b", photo_name: "places/B/photos/1", sort_order: 0 },
      { location_id: "loc-b", photo_name: "places/B/photos/2", sort_order: 1 },
    ];

    setupSupabase({ locationPhotos: photoRows });
    const first = await attachGuideFallbackImage(baseGuide);
    setupSupabase({ locationPhotos: photoRows });
    const second = await attachGuideFallbackImage(baseGuide);

    expect(first.featuredImage).toBe(second.featuredImage);
  });

  it("different guide ids over the same locations can pick different photos", async () => {
    // This is what makes guides sharing a location set look distinct on the listing.
    const photoRows = [
      { location_id: "loc-a", photo_name: "places/A/photos/1", sort_order: 0 },
      { location_id: "loc-a", photo_name: "places/A/photos/2", sort_order: 1 },
      { location_id: "loc-b", photo_name: "places/B/photos/1", sort_order: 0 },
      { location_id: "loc-b", photo_name: "places/B/photos/2", sort_order: 1 },
    ];

    const picks = new Set<string>();
    for (const id of [
      "guide-1",
      "guide-2",
      "guide-3",
      "guide-4",
      "guide-5",
      "guide-6",
      "guide-7",
      "guide-8",
    ]) {
      setupSupabase({ locationPhotos: photoRows });
      const result = await attachGuideFallbackImage({ ...baseGuide, id });
      picks.add(result.featuredImage);
    }
    // Across 8 guide ids we should see at least 2 distinct picks; otherwise the
    // hash isn't doing its job and the listing would look monotonous.
    expect(picks.size).toBeGreaterThan(1);
  });

  it("only patches the missing field when one of featured/thumbnail is already set", async () => {
    setupSupabase({
      locationPhotos: [
        { location_id: "loc-a", photo_name: "places/A/photos/1", sort_order: 0 },
      ],
    });

    const guide: Guide = {
      ...baseGuide,
      featuredImage: "https://cdn.example.com/real.jpg",
      thumbnailImage: undefined,
    };
    const result = await attachGuideFallbackImage(guide);

    expect(result.featuredImage).toBe("https://cdn.example.com/real.jpg");
    expect(result.thumbnailImage).toMatch(/^\/api\/places\/photo\?/);
  });
});
