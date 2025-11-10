"use client";

import { loadWishlist, WISHLIST_KEY } from "@/lib/wishlistStorage";
import { createClient } from "@/lib/supabase/client";
import { type Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const KEY = "koku_app_state_v1";

export type UserProfile = {
  id: string; // local-only UUID
  displayName: string; // shown in UI ("Mel", etc.)
  email?: string; // optional for future sync
  locale: "en" | "jp"; // EN/JP toggle
};

export type StoredTrip = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  itinerary: Itinerary;
  builderData: TripBuilderData;
};

type CreateTripInput = {
  name: string;
  itinerary: Itinerary;
  builderData: TripBuilderData;
};

export type AppStateShape = {
  user: UserProfile;
  favorites: string[]; // place IDs
  guideBookmarks: string[]; // guide IDs (future)
  trips: StoredTrip[];

  // actions
  setUser: (patch: Partial<UserProfile>) => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleGuideBookmark: (id: string) => void;
  isGuideBookmarked: (id: string) => boolean;
  createTrip: (input: CreateTripInput) => string;
  updateTripItinerary: (tripId: string, itinerary: Itinerary) => void;
  renameTrip: (tripId: string, name: string) => void;
  deleteTrip: (tripId: string) => void;
  restoreTrip: (trip: StoredTrip) => void;
  getTripById: (tripId: string) => StoredTrip | undefined;

  clearAllLocalData: () => void;
  refreshFromSupabase: () => Promise<void>;
};

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "u_" + Math.random().toString(36).slice(2, 10);
}

const defaultState: AppStateShape = {
  user: { id: newId(), displayName: "Guest", locale: "en" },
  favorites: [],
  guideBookmarks: [],
  trips: [],

  setUser: () => {},
  toggleFavorite: () => {},
  isFavorite: () => false,
  toggleGuideBookmark: () => {},
  isGuideBookmarked: () => false,
  createTrip: () => "",
  updateTripItinerary: () => {},
  renameTrip: () => {},
  deleteTrip: () => {},
  restoreTrip: () => {},
  getTripById: () => undefined,

  clearAllLocalData: () => {},
  refreshFromSupabase: async () => {},
};

const Ctx = createContext<AppStateShape>(defaultState);

type InternalState = Pick<AppStateShape, "user" | "favorites" | "guideBookmarks" | "trips">;

const sanitizeTrips = (raw: unknown): StoredTrip[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const record = entry as Partial<StoredTrip>;
      if (typeof record.id !== "string" || record.id.length === 0) {
        return null;
      }
      if (typeof record.name !== "string" || record.name.length === 0) {
        return null;
      }
      const itinerary = record.itinerary;
      if (!itinerary || typeof itinerary !== "object" || !Array.isArray((itinerary as Itinerary).days)) {
        return null;
      }
      const builderData = record.builderData;
      if (!builderData || typeof builderData !== "object") {
        return null;
      }
      return {
        id: record.id,
        name: record.name,
        createdAt:
          typeof record.createdAt === "string" && record.createdAt.length > 0
            ? record.createdAt
            : new Date().toISOString(),
        updatedAt:
          typeof record.updatedAt === "string" && record.updatedAt.length > 0
            ? record.updatedAt
            : new Date().toISOString(),
        itinerary: itinerary as Itinerary,
        builderData: builderData as TripBuilderData,
      } satisfies StoredTrip;
    })
    .filter((entry): entry is StoredTrip => Boolean(entry));
};

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<InternalState>({
    user: defaultState.user,
    favorites: [],
    guideBookmarks: [],
    trips: [],
  });

  // load
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(KEY);
      const legacyFavorites = loadWishlist();

      let nextState: InternalState;
      if (raw) {
        const parsed = JSON.parse(raw);
        nextState = {
          user: parsed.user ?? defaultState.user,
          favorites: parsed.favorites ?? [],
          guideBookmarks: parsed.guideBookmarks ?? [],
          trips: sanitizeTrips(parsed.trips),
        };
      } else {
        nextState = {
          user: defaultState.user,
          favorites: [],
          guideBookmarks: [],
          trips: [],
        };
      }

      if (legacyFavorites.length > 0) {
        const mergedFavorites = Array.from(new Set([...nextState.favorites, ...legacyFavorites]));
        nextState = { ...nextState, favorites: mergedFavorites };
      }

      setState(nextState);
      localStorage.setItem(KEY, JSON.stringify(nextState));

      if (legacyFavorites.length > 0) {
        localStorage.removeItem(WISHLIST_KEY);
      }
    } catch {
      // ignore malformed data
    }
  }, []);

  const refreshFromSupabase = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setState((current) => ({
        ...current,
        user: { id: newId(), displayName: "Guest", locale: "en" },
        favorites: [],
        guideBookmarks: [],
      }));
      return;
    }

    const [{ data: favorites }, { data: guideBookmarks }] = await Promise.all([
      supabase.from("favorites").select("place_id").eq("user_id", user.id),
      supabase.from("guide_bookmarks").select("guide_id").eq("user_id", user.id),
    ]);

    setState((s) => ({
      ...s,
      favorites: (favorites ?? []).map((row: any) => row.place_id),
      guideBookmarks: (guideBookmarks ?? []).map((row: any) => row.guide_id),
    }));
  }, [supabase]);

  useEffect(() => {
    refreshFromSupabase();
    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setState((current) => ({
          ...current,
          user: { id: newId(), displayName: "Guest", locale: "en" },
          favorites: [],
          guideBookmarks: [],
        }));
        return;
      }
      refreshFromSupabase();
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [refreshFromSupabase, supabase]);

  // save
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const setUser = useCallback(
    (patch: Partial<UserProfile>) =>
      setState((s) => ({ ...s, user: { ...s.user, ...patch } })),
    [],
  );

  const generateTripId = useCallback(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `trip_${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  const createTrip = useCallback(
    ({ name, itinerary, builderData }: CreateTripInput) => {
      const id = generateTripId();
      const timestamp = new Date().toISOString();
      const trimmedName = name.trim();
      const record: StoredTrip = {
        id,
        name: trimmedName.length > 0 ? trimmedName : "Untitled itinerary",
        createdAt: timestamp,
        updatedAt: timestamp,
        itinerary,
        builderData,
      };
      setState((s) => ({
        ...s,
        trips: [...s.trips, record],
      }));
      return id;
    },
    [generateTripId],
  );

  const updateTripItinerary = useCallback((tripId: string, itinerary: Itinerary) => {
    setState((s) => {
      let hasChanged = false;
      const nextTrips = s.trips.map((trip) => {
        if (trip.id !== tripId) {
          return trip;
        }
        if (trip.itinerary === itinerary) {
          return trip;
        }
        hasChanged = true;
        return {
          ...trip,
          itinerary,
          updatedAt: new Date().toISOString(),
        };
      });
      if (!hasChanged) {
        return s;
      }
      return {
        ...s,
        trips: nextTrips,
      };
    });
  }, []);

  const renameTrip = useCallback((tripId: string, name: string) => {
    setState((s) => {
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        return s;
      }
      let hasChanged = false;
      const nextTrips = s.trips.map((trip) => {
        if (trip.id !== tripId) {
          return trip;
        }
        if (trip.name === trimmedName) {
          return trip;
        }
        hasChanged = true;
        return {
          ...trip,
          name: trimmedName,
          updatedAt: new Date().toISOString(),
        };
      });
      if (!hasChanged) {
        return s;
      }
      return {
        ...s,
        trips: nextTrips,
      };
    });
  }, []);

  const deleteTrip = useCallback((tripId: string) => {
    setState((s) => {
      const nextTrips = s.trips.filter((trip) => trip.id !== tripId);
      if (nextTrips.length === s.trips.length) {
        return s;
      }
      return {
        ...s,
        trips: nextTrips,
      };
    });
  }, []);

  const restoreTrip = useCallback((trip: StoredTrip) => {
    setState((s) => {
      const exists = s.trips.some((entry) => entry.id === trip.id);
      if (exists) {
        return s;
      }
      const nextTrips = [...s.trips, trip].sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      return {
        ...s,
        trips: nextTrips,
      };
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setState((s) => {
      const set = new Set(s.favorites);
      const exists = set.has(id);
      exists ? set.delete(id) : set.add(id);

      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        if (exists) {
          supabase.from("favorites").delete().eq("user_id", user.id).eq("place_id", id);
        } else {
          supabase.from("favorites").upsert({ user_id: user.id, place_id: id });
        }
      });

      return { ...s, favorites: Array.from(set) };
    });
  }, []);

  const toggleGuideBookmark = useCallback((id: string) => {
    setState((s) => {
      const set = new Set(s.guideBookmarks);
      const exists = set.has(id);
      exists ? set.delete(id) : set.add(id);

      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        if (exists) {
          supabase
            .from("guide_bookmarks")
            .delete()
            .eq("user_id", user.id)
            .eq("guide_id", id);
        } else {
          supabase.from("guide_bookmarks").upsert({ user_id: user.id, guide_id: id });
        }
      });

      return { ...s, guideBookmarks: Array.from(set) };
    });
  }, []);

  const clearAllLocalData = useCallback(() => {
    if (typeof window !== "undefined" && !window.confirm("Clear all local Koku data on this device?")) {
      return;
    }
    const next: InternalState = {
      user: { id: newId(), displayName: "Guest", locale: "en" },
      favorites: [],
      guideBookmarks: [],
      trips: [],
    };
    setState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, JSON.stringify(next));
    }
  }, []);

  const api = useMemo<AppStateShape>(
    () => ({
      ...state,
      setUser,
      toggleFavorite,
      isFavorite: (id: string) => state.favorites.includes(id),
      toggleGuideBookmark,
      isGuideBookmarked: (id: string) => state.guideBookmarks.includes(id),
      createTrip,
      updateTripItinerary,
      renameTrip,
      deleteTrip,
      restoreTrip,
      getTripById: (tripId: string) => state.trips.find((trip) => trip.id === tripId),
      clearAllLocalData,
      refreshFromSupabase,
    }),
    [
      state,
      setUser,
      toggleFavorite,
      toggleGuideBookmark,
      createTrip,
      updateTripItinerary,
      renameTrip,
      deleteTrip,
      restoreTrip,
      clearAllLocalData,
      refreshFromSupabase,
    ],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAppState() {
  return useContext(Ctx);
}


