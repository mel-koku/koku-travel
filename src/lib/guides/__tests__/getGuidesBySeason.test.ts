import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Sanity client / location helpers aren't exercised by getGuidesBySeason but
// guideService imports them at module load. Stub minimally.
vi.mock("@/sanity/client", () => ({
  sanityClient: { fetch: vi.fn() },
}));
vi.mock("@/lib/locations/locationService", () => ({
  fetchLocationsByIds: vi.fn().mockResolvedValue([]),
}));

type FilterCall = [string, ...unknown[]];

let lastCall: { filters: FilterCall[] } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: (_table: string) => {
      const filters: FilterCall[] = [];
      const chain: Record<string, unknown> = {
        select: (cols: string) => {
          filters.push(["select", cols]);
          return chain;
        },
        eq: (col: string, val: unknown) => {
          filters.push(["eq", col, val]);
          return chain;
        },
        or: (cond: string) => {
          filters.push(["or", cond]);
          return chain;
        },
        contains: (col: string, val: unknown) => {
          filters.push(["contains", col, val]);
          return chain;
        },
        order: (col: string, opts: unknown) => {
          filters.push(["order", col, opts]);
          return chain;
        },
        limit: (n: number) => {
          filters.push(["limit", n]);
          lastCall = { filters };
          return Promise.resolve({ data: [], error: null });
        },
      };
      return chain;
    },
  })),
}));

import { getGuidesBySeason } from "../guideService";

describe("getGuidesBySeason", () => {
  beforeEach(() => {
    lastCall = null;
  });

  it("filters by exact season tag containment, not by guide_type fallback", async () => {
    await getGuidesBySeason("spring", 3);
    const containsFilter = lastCall?.filters.find(
      ([op, col]) => op === "contains" && col === "seasons",
    );
    expect(containsFilter).toEqual(["contains", "seasons", ["spring"]]);
  });

  it("does NOT use the legacy .or(...,guide_type.eq.seasonal) clause", async () => {
    // Regression guard against the off-season leak we removed 2026-05-04.
    await getGuidesBySeason("winter", 3);
    const orFilter = lastCall?.filters.find(([op]) => op === "or");
    expect(orFilter).toBeUndefined();
  });

  it("only queries published guides", async () => {
    await getGuidesBySeason("autumn", 3);
    const eqFilter = lastCall?.filters.find(
      ([op, col]) => op === "eq" && col === "status",
    );
    expect(eqFilter).toEqual(["eq", "status", "published"]);
  });

  it("respects the limit argument", async () => {
    await getGuidesBySeason("summer", 5);
    const limitFilter = lastCall?.filters.find(([op]) => op === "limit");
    expect(limitFilter).toEqual(["limit", 5]);
  });
});
