import { createClient } from "@/lib/supabase/client";
import { AppStateShape } from "@/state/AppState";

const APP_KEY = "koku_app_state_v1";

export function getLocalAppState(): Pick<AppStateShape, "favorites" | "guideBookmarks"> {
  if (typeof window === "undefined") return { favorites: [], guideBookmarks: [] };
  try {
    const raw = localStorage.getItem(APP_KEY);
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "no-user" as const };

  const { favorites, guideBookmarks } = getLocalAppState();

  const [{ data: remoteFavorites }, { data: remoteBookmarks }] = await Promise.all([
    supabase.from("favorites").select("place_id").eq("user_id", user.id),
    supabase.from("guide_bookmarks").select("guide_id").eq("user_id", user.id),
  ]);

  const favoriteRows = favorites.map((place_id: string) => ({ user_id: user.id, place_id }));
  const bookmarkRows = guideBookmarks.map((guide_id: string) => ({ user_id: user.id, guide_id }));

  if (favoriteRows.length) {
    await supabase.from("favorites").upsert(favoriteRows, { onConflict: "user_id,place_id" });
  }

  if (bookmarkRows.length) {
    await supabase.from("guide_bookmarks").upsert(bookmarkRows, { onConflict: "user_id,guide_id" });
  }

  const remoteFavoriteIds = new Set((remoteFavorites ?? []).map((row: any) => row.place_id));
  const remoteBookmarkIds = new Set((remoteBookmarks ?? []).map((row: any) => row.guide_id));
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

export async function pullCloudToLocal() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { favorites: [], guideBookmarks: [], ok: false as const, reason: "no-user" as const };

  const { data: favorites } = await supabase.from("favorites").select("place_id").eq("user_id", user.id);
  const { data: bookmarks } = await supabase.from("guide_bookmarks").select("guide_id").eq("user_id", user.id);
  const favoritesList = (favorites ?? []).map((row: any) => row.place_id);
  const bookmarksList = (bookmarks ?? []).map((row: any) => row.guide_id);

  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(APP_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.favorites = favoritesList;
    parsed.guideBookmarks = bookmarksList;
    localStorage.setItem(APP_KEY, JSON.stringify(parsed));
  }

  return { favorites: favoritesList, guideBookmarks: bookmarksList, ok: true as const };
}


