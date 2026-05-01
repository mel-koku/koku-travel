import { describe, it, expect, vi } from "vitest";
import { addSaved } from "../savedSync";

type FakeQueryResult = { data: { id: string } | null; error: null };

function makeSupabaseStub(opts: {
  byPlaceIdResult: FakeQueryResult;
  byIdResult: FakeQueryResult;
  upsertSpy: ReturnType<typeof vi.fn>;
}) {
  const { byPlaceIdResult, byIdResult, upsertSpy } = opts;
  // Each .from("locations") chain ends in .maybeSingle(); the order of calls is:
  //   1. .eq("place_id", ...).limit(1).maybeSingle()
  //   2. .eq("id", ...).limit(1).maybeSingle()  (only if first returned null)
  let locationsCall = 0;

  const locationsBuilder = (results: FakeQueryResult[]) => ({
    select: () => ({
      eq: () => ({
        limit: () => ({
          maybeSingle: vi.fn().mockImplementation(async () => {
            const result = results[locationsCall] ?? { data: null, error: null };
            locationsCall++;
            return result;
          }),
        }),
      }),
    }),
  });

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "locations") {
        return locationsBuilder([byPlaceIdResult, byIdResult]);
      }
      if (table === "favorites") {
        return { upsert: upsertSpy };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  } as unknown as Parameters<typeof addSaved>[0];
}

describe("addSaved — lookupLocationId fallback", () => {
  it("uses locations.place_id match when present", async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    const supabase = makeSupabaseStub({
      byPlaceIdResult: { data: { id: "loc-uuid-1" }, error: null },
      byIdResult: { data: null, error: null },
      upsertSpy,
    });

    await addSaved(supabase, "user-1", "ChIJgoogleplace");

    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ place_id: "ChIJgoogleplace", location_id: "loc-uuid-1" }),
      expect.any(Object),
    );
  });

  it("falls back to locations.id (slug) when place_id lookup misses — would have caught the 4-NULL bug", async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    const supabase = makeSupabaseStub({
      byPlaceIdResult: { data: null, error: null },
      byIdResult: { data: { id: "tsurumi-ryokuchi-kanto-a39392bf" }, error: null },
      upsertSpy,
    });

    await addSaved(supabase, "user-1", "tsurumi-ryokuchi-kanto-a39392bf");

    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        place_id: "tsurumi-ryokuchi-kanto-a39392bf",
        location_id: "tsurumi-ryokuchi-kanto-a39392bf",
      }),
      expect.any(Object),
    );
  });

  it("stores location_id=null for genuinely external place_ids (intentional schema design)", async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    const supabase = makeSupabaseStub({
      byPlaceIdResult: { data: null, error: null },
      byIdResult: { data: null, error: null },
      upsertSpy,
    });

    await addSaved(supabase, "user-1", "external-id-not-in-our-db");

    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        place_id: "external-id-not-in-our-db",
        location_id: undefined,
      }),
      expect.any(Object),
    );
  });
});
