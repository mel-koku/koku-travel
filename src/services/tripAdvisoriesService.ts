import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdvisoryKey } from "@/types/tripAdvisories";

const storageKey = (tripId: string) => `yuku-advisories-seen-${tripId}`;

// ── Guest (localStorage) ────────────────────────────────────────────────
export function getDismissedAdvisoriesLocal(tripId: string): Set<AdvisoryKey> {
  try {
    const raw = localStorage.getItem(storageKey(tripId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function dismissAdvisoryLocal(tripId: string, key: AdvisoryKey): void {
  const current = getDismissedAdvisoriesLocal(tripId);
  current.add(key);
  try {
    localStorage.setItem(storageKey(tripId), JSON.stringify([...current]));
  } catch {
    /* quota or private mode — silent */
  }
}

export function clearDismissedAdvisoriesLocal(tripId: string): void {
  try {
    localStorage.removeItem(storageKey(tripId));
  } catch {
    /* silent */
  }
}

// ── Authenticated (Supabase) ────────────────────────────────────────────
export async function getDismissedAdvisoriesRemote(
  supabase: SupabaseClient,
  userId: string,
  tripId: string,
): Promise<Set<AdvisoryKey>> {
  const { data, error } = await supabase
    .from("trip_advisories_seen")
    .select("advisory_key")
    .eq("user_id", userId)
    .eq("trip_id", tripId);
  if (error || !data) return new Set();
  return new Set(data.map((r) => r.advisory_key as string));
}

export async function dismissAdvisoryRemote(
  supabase: SupabaseClient,
  userId: string,
  tripId: string,
  key: AdvisoryKey,
): Promise<void> {
  await supabase.from("trip_advisories_seen").upsert(
    {
      user_id: userId,
      trip_id: tripId,
      advisory_key: key,
    },
    { onConflict: "user_id,trip_id,advisory_key" },
  );
}

// ── Sign-in merge ───────────────────────────────────────────────────────
export async function mergeLocalAdvisoriesToRemote(
  supabase: SupabaseClient,
  userId: string,
  tripId: string,
): Promise<void> {
  const local = getDismissedAdvisoriesLocal(tripId);
  if (local.size === 0) return;
  const rows = [...local].map((key) => ({
    user_id: userId,
    trip_id: tripId,
    advisory_key: key,
  }));
  await supabase
    .from("trip_advisories_seen")
    .upsert(rows, { onConflict: "user_id,trip_id,advisory_key" });
  clearDismissedAdvisoriesLocal(tripId);
}
