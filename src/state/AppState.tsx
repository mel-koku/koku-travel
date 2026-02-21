"use client";

import type { Itinerary, ItineraryActivity, ItineraryEdit } from "@/types/itinerary";
import type { DayEntryPoint, EntryPoint } from "@/types/trip";
import { createClient } from "@/lib/supabase/client";
import { loadWishlist } from "@/lib/wishlistStorage";
import { APP_STATE_STORAGE_KEY, APP_STATE_DEBOUNCE_MS, STABLE_DEFAULT_USER_ID } from "@/lib/constants";
import {
  WISHLIST_STORAGE_KEY,
  TRIP_BUILDER_STORAGE_KEY,
  USER_PREFERENCES_STORAGE_KEY,
  FILTER_METADATA_STORAGE_KEY,
  TRIP_STEP_STORAGE_KEY,
} from "@/lib/constants/storage";
import type { Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { logger } from "@/lib/logger";

// Import extracted services
import {
  type StoredTrip,
  type CreateTripInput,
  createTripRecord,
  updateTripItinerary as updateTripItineraryOp,
  renameTrip as renameTripOp,
  deleteTrip as deleteTripOp,
  restoreTrip as restoreTripOp,
  getTripById as getTripByIdOp,
  sanitizeTrips,
} from "@/services/trip";
import { useEditHistory, type EditHistoryInternalState } from "./useEditHistory";
import {
  syncFavoriteToggle,
  syncBookmarkToggle,
  fetchFavorites,
  fetchGuideBookmarks,
  fetchTrips,
  syncTripSave,
  syncTripDelete,
  mergeTrips,
} from "@/services/sync";

// Re-export types for consumers
export type { StoredTrip, CreateTripInput };

export type UserProfile = {
  id: string;
  displayName: string;
  email?: string;
};

export type AppStateShape = {
  user: UserProfile;
  favorites: string[];
  guideBookmarks: string[];
  trips: StoredTrip[];

  // Loading states
  isLoadingRefresh: boolean;
  loadingBookmarks: Set<string>;

  // Editing state
  dayEntryPoints: Record<string, DayEntryPoint>;
  editHistory: Record<string, ItineraryEdit[]>;
  currentHistoryIndex: Record<string, number>;

  // Actions
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

  // Editing actions
  setDayEntryPoint: (tripId: string, dayId: string, type: "start" | "end", entryPoint: EntryPoint | undefined) => void;
  replaceActivity: (tripId: string, dayId: string, activityId: string, newActivity: ItineraryActivity) => void;
  deleteActivity: (tripId: string, dayId: string, activityId: string) => void;
  reorderActivities: (tripId: string, dayId: string, activityIds: string[]) => void;
  addActivity: (tripId: string, dayId: string, activity: ItineraryActivity, position?: number) => void;
  undo: (tripId: string) => void;
  redo: (tripId: string) => void;
  canUndo: (tripId: string) => boolean;
  canRedo: (tripId: string) => boolean;

  clearAllLocalData: () => void;
  refreshFromSupabase: () => Promise<void>;
};

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "u_" + Math.random().toString(36).slice(2, 10);
}

const defaultState: AppStateShape = {
  user: { id: STABLE_DEFAULT_USER_ID, displayName: "Guest" },
  favorites: [],
  guideBookmarks: [],
  trips: [],
  isLoadingRefresh: false,
  loadingBookmarks: new Set(),
  dayEntryPoints: {},
  editHistory: {},
  currentHistoryIndex: {},

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
  setDayEntryPoint: () => {},
  replaceActivity: () => {},
  deleteActivity: () => {},
  reorderActivities: () => {},
  addActivity: () => {},
  undo: () => {},
  redo: () => {},
  canUndo: () => false,
  canRedo: () => false,

  clearAllLocalData: () => {},
  refreshFromSupabase: async () => {},
};

const Ctx = createContext<AppStateShape>(defaultState);

type InternalState = Pick<
  AppStateShape,
  "user" | "favorites" | "guideBookmarks" | "trips" | "isLoadingRefresh" | "loadingBookmarks" | "dayEntryPoints" | "editHistory" | "currentHistoryIndex"
>;

const buildProfileFromSupabase = (user: User | null, previous?: UserProfile): UserProfile => {
  if (!user) {
    return { id: newId(), displayName: "Guest" };
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metadataName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";

  const fallbackName =
    previous?.displayName ??
    (user.email ? user.email.split("@")[0] ?? "Guest" : "Guest");

  return {
    id: user.id,
    displayName: metadataName.length > 0 ? metadataName : fallbackName,
    email: user.email ?? previous?.email,
  };
};

// Debounce delay for trip sync (2 seconds)
const TRIP_SYNC_DEBOUNCE_MS = 2000;

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [state, setState] = useState<InternalState>({
    user: defaultState.user,
    favorites: [],
    guideBookmarks: [],
    trips: [],
    isLoadingRefresh: false,
    loadingBookmarks: new Set(),
    dayEntryPoints: {},
    editHistory: {},
    currentHistoryIndex: {},
  });

  // Ref to track pending trip sync timeouts by trip ID
  const tripSyncTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(APP_STATE_STORAGE_KEY);
      const legacyFavorites = loadWishlist();

      let nextState: InternalState;
      if (raw) {
        const parsed = JSON.parse(raw);
        const user = parsed.user ?? defaultState.user;
        const userId = user.id === STABLE_DEFAULT_USER_ID ? newId() : user.id;
        nextState = {
          user: { ...user, id: userId },
          favorites: parsed.favorites ?? [],
          guideBookmarks: parsed.guideBookmarks ?? [],
          trips: sanitizeTrips(parsed.trips),
          isLoadingRefresh: false,
          loadingBookmarks: new Set(),
          dayEntryPoints: parsed.dayEntryPoints ?? {},
          editHistory: parsed.editHistory ?? {},
          currentHistoryIndex: parsed.currentHistoryIndex ?? {},
        };
      } else {
        nextState = {
          user: { ...defaultState.user, id: newId() },
          favorites: [],
          guideBookmarks: [],
          trips: [],
          isLoadingRefresh: false,
          loadingBookmarks: new Set(),
          dayEntryPoints: {},
          editHistory: {},
          currentHistoryIndex: {},
        };
      }

      if (legacyFavorites.length > 0) {
        const mergedFavorites = Array.from(new Set([...nextState.favorites, ...legacyFavorites]));
        nextState = { ...nextState, favorites: mergedFavorites };
      }

      setState(nextState);
      try {
        localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(nextState));
      } catch (e) {
        logger.warn("Failed to persist state to localStorage", { error: e instanceof Error ? e.message : String(e) });
      }

      if (legacyFavorites.length > 0) {
        localStorage.removeItem(WISHLIST_STORAGE_KEY);
      }
    } catch {
      // Ignore malformed data
    }
  }, []);

  // Refresh from Supabase
  const refreshFromSupabase = useCallback(async () => {
    if (!supabase) return;

    setState((s) => ({ ...s, isLoadingRefresh: true }));

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        logger.warn("Failed to read auth session", { error: authError });
      }

      if (!user) {
        setState((current) => ({
          ...current,
          user: {
            id: current.user.id || newId(),
            displayName: current.user.displayName || "Guest",
          },
          isLoadingRefresh: false,
        }));
        return;
      }

      const [favoritesResult, bookmarksResult, tripsResult] = await Promise.all([
        fetchFavorites(supabase, user.id),
        fetchGuideBookmarks(supabase, user.id),
        fetchTrips(supabase, user.id),
      ]);

      setState((s) => {
        // Merge local and remote trips, resolving conflicts by timestamp
        const mergedTrips = tripsResult.success && tripsResult.data
          ? mergeTrips(s.trips, tripsResult.data)
          : s.trips;

        return {
          ...s,
          user: buildProfileFromSupabase(user, s.user),
          favorites: favoritesResult.success ? (favoritesResult.data ?? []) : s.favorites,
          guideBookmarks: bookmarksResult.success ? (bookmarksResult.data ?? []) : s.guideBookmarks,
          trips: mergedTrips,
          isLoadingRefresh: false,
        };
      });
    } catch (error) {
      logger.error("refreshFromSupabase failed", error);
      setState((s) => ({ ...s, isLoadingRefresh: false }));
    }
  }, [supabase]);

  // Auth state listener
  useEffect(() => {
    if (!supabase) return;

    refreshFromSupabase();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: string | null, session: Session | null) => {
        if (!session?.user) {
          setState((current) => ({
            ...current,
            user: {
              id: current.user.id || newId(),
              displayName: current.user.displayName || "Guest",
            },
          }));
          return;
        }
        refreshFromSupabase();
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [refreshFromSupabase, supabase]);

  // Debounced save to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const timeoutId = setTimeout(() => {
      const persistedState = {
        user: state.user,
        favorites: state.favorites,
        guideBookmarks: state.guideBookmarks,
        trips: state.trips,
        dayEntryPoints: state.dayEntryPoints,
        editHistory: state.editHistory,
        currentHistoryIndex: state.currentHistoryIndex,
      };
      try {
        localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(persistedState));
      } catch (e) {
        logger.warn("Failed to persist state to localStorage (debounced)", { error: e instanceof Error ? e.message : String(e) });
      }
    }, APP_STATE_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [state.user, state.favorites, state.guideBookmarks, state.trips, state.dayEntryPoints, state.editHistory, state.currentHistoryIndex]);

  // Ref tracking current trips so beforeunload/visibilitychange can flush without stale closures
  const tripsRef = useRef(state.trips);
  useEffect(() => {
    tripsRef.current = state.trips;
  }, [state.trips]);

  // Flush pending trip syncs on tab close / background to prevent data loss from 2s debounce
  useEffect(() => {
    if (typeof window === "undefined" || !supabase) return;

    const flushPendingSyncs = () => {
      const pending = tripSyncTimeouts.current;
      if (pending.size === 0) return;

      const currentTrips = tripsRef.current;
      pending.forEach((timeout, tripId) => {
        clearTimeout(timeout);
        const trip = currentTrips.find((t) => t.id === tripId);
        if (trip) {
          void syncTripSave(supabase, trip);
        }
      });
      pending.clear();
    };

    const handleBeforeUnload = () => {
      flushPendingSyncs();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPendingSyncs();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [supabase]);

  // Cleanup pending trip sync timeouts on unmount
  useEffect(() => {
    return () => {
      tripSyncTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      tripSyncTimeouts.current.clear();
    };
  }, []);

  // User actions
  const setUser = useCallback(
    (patch: Partial<UserProfile>) =>
      setState((s) => ({ ...s, user: { ...s.user, ...patch } })),
    [],
  );

  // Trip actions
  const createTrip = useCallback(
    (input: CreateTripInput) => {
      const record = createTripRecord(input);
      setState((s) => ({ ...s, trips: [...s.trips, record] }));

      // Sync to Supabase
      if (supabase) {
        void syncTripSave(supabase, record);
      }

      return record.id;
    },
    [supabase],
  );

  const updateTripItinerary = useCallback((tripId: string, itinerary: Itinerary) => {
    setState((s) => {
      const nextTrips = updateTripItineraryOp(s.trips, tripId, itinerary);
      if (!nextTrips) return s;

      // Schedule debounced sync
      if (supabase) {
        // Clear any existing timeout for this trip
        const existingTimeout = tripSyncTimeouts.current.get(tripId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Schedule new sync after debounce delay
        const timeout = setTimeout(() => {
          const trip = nextTrips.find((t) => t.id === tripId);
          if (trip) {
            void syncTripSave(supabase, trip);
          }
          tripSyncTimeouts.current.delete(tripId);
        }, TRIP_SYNC_DEBOUNCE_MS);

        tripSyncTimeouts.current.set(tripId, timeout);
      }

      return { ...s, trips: nextTrips };
    });
  }, [supabase]);

  const renameTrip = useCallback((tripId: string, name: string) => {
    setState((s) => {
      const nextTrips = renameTripOp(s.trips, tripId, name);
      if (!nextTrips) return s;

      // Sync to Supabase
      if (supabase) {
        const trip = nextTrips.find((t) => t.id === tripId);
        if (trip) {
          void syncTripSave(supabase, trip);
        }
      }

      return { ...s, trips: nextTrips };
    });
  }, [supabase]);

  const deleteTrip = useCallback((tripId: string) => {
    setState((s) => {
      const nextTrips = deleteTripOp(s.trips, tripId);
      if (!nextTrips) return s;

      // Clear any pending sync timeout for this trip
      const existingTimeout = tripSyncTimeouts.current.get(tripId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        tripSyncTimeouts.current.delete(tripId);
      }

      // Sync deletion to Supabase
      if (supabase) {
        void syncTripDelete(supabase, tripId);
      }

      return { ...s, trips: nextTrips };
    });
  }, [supabase]);

  const restoreTrip = useCallback((trip: StoredTrip) => {
    setState((s) => {
      const nextTrips = restoreTripOp(s.trips, trip);
      if (!nextTrips) return s;

      // Sync to Supabase (re-save with current timestamp)
      if (supabase) {
        const restoredTrip = nextTrips.find((t) => t.id === trip.id);
        if (restoredTrip) {
          void syncTripSave(supabase, restoredTrip);
        }
      }

      return { ...s, trips: nextTrips };
    });
  }, [supabase]);

  // Favorites actions
  const toggleFavorite = useCallback(
    (id: string) => {
      let existed = false;
      setState((s) => {
        const set = new Set(s.favorites);
        existed = set.has(id);
        if (existed) {
          set.delete(id);
        } else {
          set.add(id);
        }
        return { ...s, favorites: Array.from(set) };
      });

      if (supabase) {
        void (async () => {
          const result = await syncFavoriteToggle(supabase, id, existed);
          if (!result.success) {
            setState((s) => {
              const set = new Set(s.favorites);
              if (existed) set.add(id); else set.delete(id);
              return { ...s, favorites: Array.from(set) };
            });
          }
        })();
      }
    },
    [supabase],
  );

  // Guide bookmark actions
  const toggleGuideBookmark = useCallback(
    (id: string) => {
      let existed = false;
      setState((s) => {
        const set = new Set(s.guideBookmarks);
        existed = set.has(id);
        if (existed) {
          set.delete(id);
        } else {
          set.add(id);
        }
        const loadingSet = new Set(s.loadingBookmarks);
        loadingSet.add(id);
        return { ...s, guideBookmarks: Array.from(set), loadingBookmarks: loadingSet };
      });

      if (!supabase) {
        setState((s) => {
          const loadingSet = new Set(s.loadingBookmarks);
          loadingSet.delete(id);
          return { ...s, loadingBookmarks: loadingSet };
        });
        return;
      }

      void (async () => {
        const result = await syncBookmarkToggle(supabase, id, existed);

        setState((s) => {
          const loadingSet = new Set(s.loadingBookmarks);
          loadingSet.delete(id);

          if (result.shouldRevert) {
            const set = new Set(s.guideBookmarks);
            if (existed) {
              set.add(id);
            } else {
              set.delete(id);
            }
            return { ...s, guideBookmarks: Array.from(set), loadingBookmarks: loadingSet };
          }

          return { ...s, loadingBookmarks: loadingSet };
        });
      })();
    },
    [supabase],
  );

  // Day entry point actions
  const setDayEntryPoint = useCallback(
    (tripId: string, dayId: string, type: "start" | "end", entryPoint: EntryPoint | undefined) => {
      const key = `${tripId}-${dayId}`;
      setState((s) => {
        const current = s.dayEntryPoints[key] ?? {};
        const updated: DayEntryPoint = {
          ...current,
          [type === "start" ? "startPoint" : "endPoint"]: entryPoint,
        };
        return {
          ...s,
          dayEntryPoints: { ...s.dayEntryPoints, [key]: updated },
        };
      });
    },
    [],
  );

  // Edit history actions (extracted into useEditHistory hook)
  // setState is compatible because InternalState ⊇ EditHistoryInternalState
  // and the hook's updater spreads unchanged fields through.
  const editHistoryActions = useEditHistory({
    setState: setState as unknown as (updater: (s: EditHistoryInternalState) => EditHistoryInternalState) => void,
    supabase,
    tripSyncTimeouts,
    syncTripSave,
    tripSyncDebounceMs: TRIP_SYNC_DEBOUNCE_MS,
  });

  const {
    replaceActivity, deleteActivity, reorderActivities, addActivity,
    undo, redo, canUndoCheck: canUndoFn, canRedoCheck: canRedoFn,
  } = editHistoryActions;

  const canUndo = useCallback(
    (tripId: string) => {
      return canUndoFn({ editHistory: state.editHistory, currentHistoryIndex: state.currentHistoryIndex }, tripId);
    },
    [state.currentHistoryIndex, state.editHistory, canUndoFn],
  );

  const canRedo = useCallback(
    (tripId: string) => {
      return canRedoFn({ editHistory: state.editHistory, currentHistoryIndex: state.currentHistoryIndex }, tripId);
    },
    [state.editHistory, state.currentHistoryIndex, canRedoFn],
  );

  // Clear all local data
  const clearAllLocalData = useCallback(() => {
    const next: InternalState = {
      user: { id: newId(), displayName: "Guest" },
      favorites: [],
      guideBookmarks: [],
      trips: [],
      isLoadingRefresh: false,
      loadingBookmarks: new Set(),
      dayEntryPoints: {},
      editHistory: {},
      currentHistoryIndex: {},
    };
    setState(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        logger.warn("Failed to persist cleared state to localStorage", { error: e instanceof Error ? e.message : String(e) });
      }
      localStorage.removeItem(WISHLIST_STORAGE_KEY);
      localStorage.removeItem(USER_PREFERENCES_STORAGE_KEY);
      localStorage.removeItem(FILTER_METADATA_STORAGE_KEY);
      localStorage.removeItem(TRIP_STEP_STORAGE_KEY);
      localStorage.removeItem(TRIP_BUILDER_STORAGE_KEY);
      // Notify other contexts (e.g. TripBuilderContext) that local data was wiped
      window.dispatchEvent(new CustomEvent("koku:local-data-cleared"));
    }
  }, []);

  // Build API
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
      getTripById: (tripId: string) => getTripByIdOp(state.trips, tripId),
      setDayEntryPoint,
      replaceActivity,
      deleteActivity,
      reorderActivities,
      addActivity,
      undo,
      redo,
      canUndo,
      canRedo,
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
      setDayEntryPoint,
      replaceActivity,
      deleteActivity,
      reorderActivities,
      addActivity,
      undo,
      redo,
      canUndo,
      canRedo,
      clearAllLocalData,
      refreshFromSupabase,
    ],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAppState() {
  return useContext(Ctx);
}
