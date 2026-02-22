import { createClient } from "@/lib/supabase/client";
import { AppStateShape } from "@/state/AppState";
import { logger } from "@/lib/logger";
import { APP_STATE_STORAGE_KEY } from "./constants/storage";

type SavedRow = { place_id: string };
type BookmarkRow = { guide_id: string };

export function getLocalAppState(): Pick<AppStateShape, "saved" | "guideBookmarks"> {
  if (typeof window === "undefined") return { saved: [], guideBookmarks: [] };
  try {
    const raw = localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (!raw) return { saved: [], guideBookmarks: [] };
    const parsed = JSON.parse(raw);
    return {
      // Support both old "favorites" key and new "saved" key in persisted state
      saved: parsed.saved ?? parsed.favorites ?? [],
      guideBookmarks: parsed.guideBookmarks ?? [],
    };
  } catch {
    return { saved: [], guideBookmarks: [] };
  }
}

export async function syncLocalToCloudOnce() {
  const supabase = createClient();
  if (!supabase) {
    logger.warn("Supabase client unavailable; skipping sync");
    return { ok: false as const, reason: "supabase-disabled" as const };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "no-user" as const };

  const { saved, guideBookmarks } = getLocalAppState();

  const [{ data: remoteSaved }, { data: remoteBookmarks }] = (await Promise.all([
    supabase.from("saved").select("place_id").eq("user_id", user.id),
    supabase.from("guide_bookmarks").select("guide_id").eq("user_id", user.id),
  ])) as [
    { data: SavedRow[] | null },
    { data: BookmarkRow[] | null }
  ];

  const savedRows = saved.map((place_id) => ({ user_id: user.id, place_id }));
  const bookmarkRows = guideBookmarks.map((guide_id) => ({ user_id: user.id, guide_id }));

  if (savedRows.length) {
    await supabase.from("saved").upsert(savedRows, { onConflict: "user_id,place_id" });
  }

  if (bookmarkRows.length) {
    await supabase.from("guide_bookmarks").upsert(bookmarkRows, { onConflict: "user_id,guide_id" });
  }

  const remoteSavedIds = new Set((remoteSaved ?? []).map((row) => row.place_id));
  const remoteBookmarkIds = new Set((remoteBookmarks ?? []).map((row) => row.guide_id));
  const localSavedIds = new Set(saved);
  const localBookmarkIds = new Set(guideBookmarks);

  const savedToDelete = Array.from(remoteSavedIds).filter((id) => !localSavedIds.has(id));
  const bookmarksToDelete = Array.from(remoteBookmarkIds).filter((id) => !localBookmarkIds.has(id));

  // Safety: never delete all remote data if local state appears empty
  // This protects against corrupted/cleared localStorage wiping the cloud
  const localLooksCorrupted = saved.length === 0 && guideBookmarks.length === 0;
  if (localLooksCorrupted && ((remoteSaved?.length ?? 0) > 0 || (remoteBookmarks?.length ?? 0) > 0)) {
    logger.warn("accountSync: skipping delete-all — local state appears empty while remote has data");
    return { ok: true as const };
  }

  if (saved.length === 0 && (remoteSaved?.length ?? 0) > 0) {
    await supabase.from("saved").delete().eq("user_id", user.id);
  } else if (savedToDelete.length) {
    await supabase.from("saved").delete().eq("user_id", user.id).in("place_id", savedToDelete);
  }

  if (guideBookmarks.length === 0 && (remoteBookmarks?.length ?? 0) > 0) {
    await supabase.from("guide_bookmarks").delete().eq("user_id", user.id);
  } else if (bookmarksToDelete.length) {
    await supabase
      .from("guide_bookmarks")
      .delete()
      .eq("user_id", user.id)
      .in("guide_id", bookmarksToDelete);
  }

  return { ok: true as const };
}

/**
 * Pulls cloud saved places and guide bookmarks to local storage.
 * Reserved for future use - currently not called anywhere in the codebase.
 * Use this function when implementing cloud-first sync strategy.
 */
export async function pullCloudToLocal() {
  const supabase = createClient();
  if (!supabase) {
    logger.warn("Supabase client unavailable; skipping pull");
    return { saved: [], guideBookmarks: [], ok: false as const, reason: "supabase-disabled" as const };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { saved: [], guideBookmarks: [], ok: false as const, reason: "no-user" as const };

  const { data: savedData } = (await supabase
    .from("saved")
    .select("place_id")
    .eq("user_id", user.id)) as { data: SavedRow[] | null };
  const { data: bookmarks } = (await supabase
    .from("guide_bookmarks")
    .select("guide_id")
    .eq("user_id", user.id)) as { data: BookmarkRow[] | null };

  const savedList = (savedData ?? []).map((row) => row.place_id);
  const bookmarksList = (bookmarks ?? []).map((row) => row.guide_id);

  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(APP_STATE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.saved = savedList;
    parsed.guideBookmarks = bookmarksList;
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(parsed));
  }

  return { saved: savedList, guideBookmarks: bookmarksList, ok: true as const };
}


