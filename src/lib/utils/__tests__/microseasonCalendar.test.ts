import { describe, it, expect } from "vitest";
import { MICROSEASONS, getActiveMicroseason } from "../microseasonCalendar";

describe("microseason calendar", () => {
  it("contains exactly 72 entries with sequential ordinals", () => {
    expect(MICROSEASONS).toHaveLength(72);
    for (let i = 0; i < 72; i++) {
      expect(MICROSEASONS[i]!.ordinal).toBe(i + 1);
    }
  });

  it("covers every day of the year (no gaps, no overlaps)", () => {
    // Walk Feb 4 through next Feb 3 — the calendar is anchored to Risshun.
    const seenOrdinals = new Set<number>();
    const start = new Date(2026, 1, 4); // Feb 4 2026
    for (let d = 0; d < 365; d++) {
      const probe = new Date(start.getTime() + d * 24 * 60 * 60 * 1000);
      const m = getActiveMicroseason(probe);
      expect(m, `gap on ${probe.toISOString().slice(0, 10)}`).not.toBeNull();
      seenOrdinals.add(m!.ordinal);
    }
    expect(seenOrdinals.size).toBe(72);
  });

  it("returns Botan hana saku (kō 18) for May 4", () => {
    // Today's date in our session — sanity check that the headline mock
    // surfaces the expected entry.
    const m = getActiveMicroseason(new Date(2026, 4, 4));
    expect(m?.ordinal).toBe(18);
    expect(m?.romaji).toBe("Botan hana saku");
    expect(m?.english).toBe("Peonies bloom");
  });

  it("returns Sakura hajimete saku (kō 11) for Mar 28", () => {
    const m = getActiveMicroseason(new Date(2026, 2, 28));
    expect(m?.ordinal).toBe(11);
    expect(m?.romaji).toBe("Sakura hajimete saku");
  });

  it("returns Niwatori hajimete toya ni tsuku (kō 72) for Feb 1", () => {
    const m = getActiveMicroseason(new Date(2026, 1, 1));
    expect(m?.ordinal).toBe(72);
  });

  it("transitions cleanly across the Apr 30 / May 4 / May 5 boundary", () => {
    expect(getActiveMicroseason(new Date(2026, 3, 30))?.ordinal).toBe(18);
    expect(getActiveMicroseason(new Date(2026, 4, 4))?.ordinal).toBe(18);
    expect(getActiveMicroseason(new Date(2026, 4, 5))?.ordinal).toBe(19);
  });
});
