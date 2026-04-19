import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock both dependencies BEFORE importing the module under test so vitest
// intercepts the imports. getConsent and createClient are both called at
// function invocation time, so we swap their return values per test via
// vi.mocked(...).mockReturnValue(...) below.
vi.mock("@/lib/cookieConsent", () => ({
  getConsent: vi.fn(() => "granted"),
}));

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({ from: fromMock })),
}));

import { logTipEvent } from "../tipEvents";
import { getConsent } from "@/lib/cookieConsent";
import { createClient } from "@/lib/supabase/client";

describe("logTipEvent", () => {
  beforeEach(() => {
    vi.mocked(getConsent).mockReturnValue("granted");
    vi.mocked(createClient).mockReturnValue({ from: fromMock } as unknown as ReturnType<typeof createClient>);
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
    fromMock.mockClear();
  });

  it("is a no-op when consent is denied", async () => {
    vi.mocked(getConsent).mockReturnValue("denied");
    await logTipEvent("prep", "rendered", { tripId: "t1", userId: "u1" });
    expect(fromMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("is a no-op when consent is undecided", async () => {
    vi.mocked(getConsent).mockReturnValue("undecided");
    await logTipEvent("prep", "rendered", { tripId: "t1", userId: "u1" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("inserts with user_id when authenticated", async () => {
    await logTipEvent("disaster", "rendered", {
      tripId: "trip-abc",
      userId: "user-xyz",
      region: "kanto",
    });
    expect(fromMock).toHaveBeenCalledWith("tip_engagements");
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-xyz",
      guest_id: null,
      trip_id: "trip-abc",
      tip_id: "disaster",
      action: "rendered",
      region: "kanto",
    });
  });

  it("inserts with guest_id when userId is null and guestId is provided", async () => {
    await logTipEvent("accessibility", "dismissed", {
      tripId: "trip-guest-1",
      userId: null,
      guestId: "guest-uuid-1",
    });
    expect(insertMock).toHaveBeenCalledWith({
      user_id: null,
      guest_id: "guest-uuid-1",
      trip_id: "trip-guest-1",
      tip_id: "accessibility",
      action: "dismissed",
    });
  });

  it("prefers user_id over guest_id when both present (auth wins)", async () => {
    await logTipEvent("prep", "rendered", {
      tripId: "t",
      userId: "u1",
      guestId: "g1",
    });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", guest_id: null }),
    );
  });

  it("skips insert when both userId and guestId are null (CHECK would reject anyway)", async () => {
    await logTipEvent("prep", "rendered", { tripId: "t", userId: null });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("omits region when not provided", async () => {
    await logTipEvent("goshuin", "rendered", { tripId: "t", userId: "u1" });
    expect(insertMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ region: expect.anything() }),
    );
  });

  it("swallows Supabase errors silently", async () => {
    insertMock.mockResolvedValueOnce({ error: { message: "insert failed" } });
    await expect(
      logTipEvent("prep", "rendered", { tripId: "t", userId: "u1" }),
    ).resolves.toBeUndefined();
  });

  it("swallows thrown exceptions silently", async () => {
    insertMock.mockRejectedValueOnce(new Error("network down"));
    await expect(
      logTipEvent("prep", "rendered", { tripId: "t", userId: "u1" }),
    ).resolves.toBeUndefined();
  });

  it("skips when supabase client is null (env not configured)", async () => {
    vi.mocked(createClient).mockReturnValue(null);
    await logTipEvent("prep", "rendered", { tripId: "t", userId: "u1" });
    expect(insertMock).not.toHaveBeenCalled();
  });
});
