import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
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
        overlaps: (col: string, val: unknown) => {
          filters.push(["overlaps", col, val]);
          return chain;
        },
        gte: (col: string, val: unknown) => {
          filters.push(["gte", col, val]);
          return chain;
        },
        in: (col: string, val: unknown) => {
          filters.push(["in", col, val]);
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

import { fetchSeasonalLocations } from "../locationService";

describe("fetchSeasonalLocations", () => {
  beforeEach(() => {
    lastCall = null;
  });

  it("does not apply region filter when no regions are passed", async () => {
    await fetchSeasonalLocations(5, 6);
    const regionFilter = lastCall?.filters.find(([op, col]) => op === "in" && col === "region");
    expect(regionFilter).toBeUndefined();
  });

  it("applies an exact-match region filter when regions are passed", async () => {
    await fetchSeasonalLocations(5, 6, { regions: ["Tohoku", "Hokkaido"] });
    const regionFilter = lastCall?.filters.find(([op, col]) => op === "in" && col === "region");
    expect(regionFilter).toEqual(["in", "region", ["Tohoku", "Hokkaido"]]);
  });

  it("treats an empty regions array as no filter (does not starve the pool)", async () => {
    await fetchSeasonalLocations(5, 6, { regions: [] });
    const regionFilter = lastCall?.filters.find(([op, col]) => op === "in" && col === "region");
    expect(regionFilter).toBeUndefined();
  });

  it("returns an empty array for a month with no seasonal tags", async () => {
    // No seasonal tags configured for some months — function short-circuits
    // before hitting Supabase. Verifies the early return.
    const out = await fetchSeasonalLocations(99, 6);
    expect(out).toEqual([]);
    expect(lastCall).toBeNull();
  });
});
