import { createClient } from "@/lib/supabase/client";
import { AppStateShape } from "@/state/AppState";
import { logger } from "@/lib/logger";
import { APP_STATE_STORAGE_KEY } from "./constants/storage";

type FavoriteRow = { place_id: string };
type BookmarkRow = { guide_id: string };

export function getLocalAppState(): Pick<AppStateShape, "favorites" | "guideBookmarks"> {
  if (typeof window === "undefined") return { favorites: [], guideBookmarks: [] };
  try {
    const raw = localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (!raw) return { favorites: [], guideBookmarks: [] };
    const parsed = JSON.parse(raw);
    return {
      favorites: parsed.favorites ?? [],
      guideBookmarks: parsed.guideBookmarks ?? [],
    };
  } catch {
    return { favorites: [], guideBookmarks: [] };
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

  const { favorites, guideBookmarks } = getLocalAppState();

  const [{ data: remoteFavorites }, { data: remoteBookmarks }] = (await Promise.all([
    supabase.from("favorites").select("place_id").eq("user_id", user.id),
    supabase.from("guide_bookmarks").select("guide_id").eq("user_id", user.id),
  ])) as [
    { data: FavoriteRow[] | null },
    { data: BookmarkRow[] | null }
  ];

  const favoriteRows = favorites.map((place_id) => ({ user_id: user.id, place_id }));
  const bookmarkRows = guideBookmarks.map((guide_id) => ({ user_id: user.id, guide_id }));

  if (favoriteRows.length) {
    await supabase.from("favorites").upsert(favoriteRows, { onConflict: "user_id,place_id" });
  }

  if (bookmarkRows.length) {
    await supabase.from("guide_bookmarks").upsert(bookmarkRows, { onConflict: "user_id,guide_id" });
  }

  const remoteFavoriteIds = new Set((remoteFavorites ?? []).map((row) => row.place_id));
  const remoteBookmarkIds = new Set((remoteBookmarks ?? []).map((row) => row.guide_id));
  const localFavoriteIds = new Set(favorites);
  const localBookmarkIds = new Set(guideBookmarks);

  const favoritesToDelete = Array.from(remoteFavoriteIds).filter((id) => !localFavoriteIds.has(id));
  const bookmarksToDelete = Array.from(remoteBookmarkIds).filter((id) => !localBookmarkIds.has(id));

  if (favorites.length === 0 && (remoteFavorites?.length ?? 0) > 0) {
    await supabase.from("favorites").delete().eq("user_id", user.id);
  } else if (favoritesToDelete.length) {
    await supabase.from("favorites").delete().eq("user_id", user.id).in("place_id", favoritesToDelete);
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
 * Pulls cloud favorites and guide bookmarks to local storage.
 * Reserved for future use - currently not called anywhere in the codebase.
 * Use this function when implementing cloud-first sync strategy.
 */
export async function pullCloudToLocal() {
  const supabase = createClient();
  if (!supabase) {
    logger.warn("Supabase client unavailable; skipping pull");
    return { favorites: [], guideBookmarks: [], ok: false as const, reason: "supabase-disabled" as const };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { favorites: [], guideBookmarks: [], ok: false as const, reason: "no-user" as const };

  const { data: favorites } = (await supabase
    .from("favorites")
    .select("place_id")
    .eq("user_id", user.id)) as { data: FavoriteRow[] | null };
  const { data: bookmarks } = (await supabase
    .from("guide_bookmarks")
    .select("guide_id")
    .eq("user_id", user.id)) as { data: BookmarkRow[] | null };

  const favoritesList = (favorites ?? []).map((row) => row.place_id);
  const bookmarksList = (bookmarks ?? []).map((row) => row.guide_id);

  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(APP_STATE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.favorites = favoritesList;
    parsed.guideBookmarks = bookmarksList;
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(parsed));
  }

  return { favorites: favoritesList, guideBookmarks: bookmarksList, ok: true as const };
}


