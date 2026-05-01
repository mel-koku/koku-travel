"use client";

import type { Itinerary, ItineraryActivity, ItineraryEdit } from "@/types/itinerary";
import type { CityAccommodation, DayEntryPoint, EntryPoint } from "@/types/trip";
import { createClient } from "@/lib/supabase/client";
import { loadSaved } from "@/lib/savedStorage";
import { APP_STATE_STORAGE_KEY } from "@/lib/constants";
import {
  SAVED_STORAGE_KEY,
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
} from "react";
import { logger } from "@/lib/logger";

// Import extracted services
import {
  type StoredTrip,
  type CreateTripInput,
  type EditHistoryState,
  createEditHistoryEntry,
  addEditToHistory,
  performUndo,
  performRedo,
  canUndo as canUndoCheck,
  canRedo as canRedoCheck,
  sanitizeTrips,
} from "@/services/trip";
import {
  replaceActivity as replaceActivityOp,
  deleteActivity as deleteActivityOp,
  reorderActivities as reorderActivitiesOp,
  addActivity as addActivityOp,
} from "@/services/trip";
import {
  syncSavedToggle,
  syncBookmarkToggle,
  fetchSaved,
  fetchGuideBookmarks,
  fetchTrips,
  syncTripSave,
  syncTripDelete,
  mergeTrips,
  fetchPreferences,
  syncPreferencesSave,
} from "@/services/sync";
import type { UserPreferences } from "@/types/userPreferences";
import { DEFAULT_USER_PREFERENCES } from "@/types/userPreferences";
import { USER_TRAVEL_PREFS_STORAGE_KEY } from "@/lib/constants/storage";
import { STABLE_DEFAULT_USER_ID } from "@/lib/constants";

// Slice providers
import { SavedProvider, useSaved } from "./slices/SavedSlice";
import { PreferencesProvider, usePreferences, type UserProfile } from "./slices/PreferencesSlice";
import { TripsProvider, useTrips } from "./slices/TripsSlice";
import { EditHistoryProvider, useEditHistorySlice } from "./slices/EditHistorySlice";

// Re-export types for consumers
export type { StoredTrip, CreateTripInput, UserProfile };

export type AppStateShape = {
  user: UserProfile;
  saved: string[];
  guideBookmarks: string[];
  userPreferences: UserPreferences;
  trips: StoredTrip[];

  // Loading states
  isLoadingRefresh: boolean;
  loadingBookmarks: Set<string>;

  // Editing state
  dayEntryPoints: Record<string, DayEntryPoint>;
  cityAccommodations: Record<string, CityAccommodation>;
  editHistory: Record<string, ItineraryEdit[]>;
  currentHistoryIndex: Record<string, number>;

  // Actions
  setUser: (patch: Partial<UserProfile>) => void;
  setUserPreferences: (prefs: Partial<UserPreferences>) => void;
  toggleSave: (id: string) => void;
  isSaved: (id: string) => boolean;
  toggleGuideBookmark: (id: string) => void;
  isGuideBookmarked: (id: string) => boolean;
  createTrip: (input: CreateTripInput) => string;
  updateTripItinerary: (tripId: string, itinerary: Itinerary) => void;
  /** Replace server-generated content (itinerary + LLM passes) on a trip
   *  while preserving local-only state. Used by the post-signin claim flow
   *  when a guest's redacted trip is rehydrated with the full plan. */
  rehydrateTripContent: (
    tripId: string,
    content: {
      itinerary: Itinerary;
      dayIntros?: Record<string, string>;
      guideProse?: import("@/types/llmConstraints").GeneratedGuide;
      dailyBriefings?: import("@/types/llmConstraints").GeneratedBriefings;
      culturalBriefing?: import("@/types/culturalBriefing").CulturalBriefing;
    },
  ) => void;
  renameTrip: (tripId: string, name: string) => void;
  deleteTrip: (tripId: string) => void;
  restoreTrip: (trip: StoredTrip) => void;
  getTripById: (tripId: string) => StoredTrip | undefined;

  // Editing actions
  setDayEntryPoint: (tripId: string, dayId: string, type: "start" | "end", entryPoint: EntryPoint | undefined) => void;
  setCityAccommodation: (tripId: string, cityId: string, accommodation: CityAccommodation | undefined) => void;
  replaceActivity: (tripId: string, dayId: string, activityId: string, newActivity: ItineraryActivity) => void;
  deleteActivity: (tripId: string, dayId: string, activityId: string) => void;
  reorderActivities: (tripId: string, dayId: string, activityIds: string[]) => void;
  addActivity: (tripId: string, dayId: string, activity: ItineraryActivity, position?: number) => void;
  updateDayActivities: (tripId: string, dayId: string, updater: (itinerary: Itinerary) => Itinerary, metadata?: Record<string, unknown>) => void;
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
  saved: [],
  guideBookmarks: [],
  userPreferences: DEFAULT_USER_PREFERENCES,
  trips: [],
  isLoadingRefresh: false,
  loadingBookmarks: new Set(),
  dayEntryPoints: {},
  cityAccommodations: {},
  editHistory: {},
  currentHistoryIndex: {},

  setUser: () => {},
  setUserPreferences: () => {},
  toggleSave: () => {},
  isSaved: () => false,
  toggleGuideBookmark: () => {},
  isGuideBookmarked: () => false,
  createTrip: () => "",
  updateTripItinerary: () => {},
  rehydrateTripContent: () => {},
  renameTrip: () => {},
  deleteTrip: () => {},
  restoreTrip: () => {},
  getTripById: () => undefined,
  setDayEntryPoint: () => {},
  setCityAccommodation: () => {},
  replaceActivity: () => {},
  deleteActivity: () => {},
  reorderActivities: () => {},
  addActivity: () => {},
  updateDayActivities: () => {},
  undo: () => {},
  redo: () => {},
  canUndo: () => false,
  canRedo: () => false,

  clearAllLocalData: () => {},
  refreshFromSupabase: async () => {},
};

const Ctx = createContext<AppStateShape>(defaultState);

// ---------------------------------------------------------------------------
// buildProfileFromSupabase - preserved helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// SyncOrchestrator - runs inside all four providers
// ---------------------------------------------------------------------------

function SyncOrchestrator({ children }: { children: React.ReactNode }) {
  const saved = useSaved();
  const prefs = usePreferences();
  const trips = useTrips();
  const history = useEditHistorySlice();

  const supabase = useMemo(() => createClient(), []);

  // Ref to track pending trip sync timeouts by trip ID
  const tripSyncTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Ref to track pending preferences sync timeout
  const prefsSyncTimeout = useRef<NodeJS.Timeout | null>(null);

  // Guard against concurrent refreshFromSupabase calls
  const isRefreshingRef = useRef(false);
  const pendingRefreshRef = useRef(false);

  // Track in-flight save operations
  const pendingSavesRef = useRef<Map<string, "add" | "remove">>(new Map());

  // Ref tracking current trips for debounced sync callbacks
  const tripsRef = useRef(trips.state.trips);
  useEffect(() => {
    tripsRef.current = trips.state.trips;
  }, [trips.state.trips]);

  // Ref tracking current user preferences for debounced sync callbacks.
  // Without this, the setUserPreferences debounce captures the closure's
  // snapshot of prefs.state at call time. Any state update between the
  // call and the 2s fire (e.g. learned_vibes update from trip completion,
  // or hydration from Supabase) is silently dropped on the next save.
  const userPreferencesRef = useRef(prefs.state.userPreferences);
  useEffect(() => {
    userPreferencesRef.current = prefs.state.userPreferences;
  }, [prefs.state.userPreferences]);



  // Ref to track loading bookmarks set for guard
  const loadingBookmarksRef = useRef(saved.state.loadingBookmarks);
  useEffect(() => { loadingBookmarksRef.current = saved.state.loadingBookmarks; }, [saved.state.loadingBookmarks]);

  // -----------------------------------------------------------------------
  // Load from localStorage on mount (legacy migration)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(APP_STATE_STORAGE_KEY);
      const legacySaved = loadSaved();

      if (raw) {
        const parsed = JSON.parse(raw);

        // Hydrate preferences
        const user = parsed.user ?? defaultState.user;
        const userId = user.id === STABLE_DEFAULT_USER_ID ? newId() : user.id;
        prefs.actions.hydrate({
          user: { ...user, id: userId },
          userPreferences: parsed.userPreferences ?? DEFAULT_USER_PREFERENCES,
        });

        // Hydrate saved
        let savedList = parsed.saved ?? parsed.favorites ?? [];
        if (legacySaved.length > 0) {
          savedList = Array.from(new Set([...savedList, ...legacySaved]));
        }
        saved.actions.hydrate({
          saved: savedList,
          guideBookmarks: parsed.guideBookmarks ?? [],
        });

        // Hydrate trips
        trips.actions.hydrate({
          trips: sanitizeTrips(parsed.trips),
          dayEntryPoints: parsed.dayEntryPoints ?? {},
          cityAccommodations: parsed.cityAccommodations ?? {},
        });

        // Hydrate edit history
        history.actions.hydrate({
          editHistory: parsed.editHistory ?? {},
          currentHistoryIndex: parsed.currentHistoryIndex ?? {},
        });
      } else {
        prefs.actions.hydrate({ user: { ...defaultState.user, id: newId() } });
        if (legacySaved.length > 0) {
          saved.actions.hydrate({ saved: legacySaved });
        }
      }

      if (legacySaved.length > 0) {
        localStorage.removeItem(SAVED_STORAGE_KEY);
      }
    } catch {
      // Ignore malformed data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------------------
  // Debounced localStorage persistence
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const timeoutId = setTimeout(() => {
      const persistedState = {
        user: prefs.state.user,
        saved: saved.state.saved,
        guideBookmarks: saved.state.guideBookmarks,
        userPreferences: prefs.state.userPreferences,
        trips: trips.state.trips,
        dayEntryPoints: trips.state.dayEntryPoints,
        cityAccommodations: trips.state.cityAccommodations,
        editHistory: history.state.editHistory,
        currentHistoryIndex: history.state.currentHistoryIndex,
      };
      try {
        localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(persistedState));
      } catch (e) {
        logger.warn("Failed to persist state to localStorage (debounced)", { error: e instanceof Error ? e.message : String(e) });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    prefs.state.user,
    saved.state.saved,
    saved.state.guideBookmarks,
    prefs.state.userPreferences,
    trips.state.trips,
    trips.state.dayEntryPoints,
    trips.state.cityAccommodations,
    history.state.editHistory,
    history.state.currentHistoryIndex,
  ]);

  // -----------------------------------------------------------------------
  // Flush pending trip syncs on tab close / background
  // -----------------------------------------------------------------------
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
    const timeouts = tripSyncTimeouts.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  // -----------------------------------------------------------------------
  // refreshFromSupabase
  // -----------------------------------------------------------------------
  const refreshFromSupabase = useCallback(async () => {
    if (!supabase) return;
    if (isRefreshingRef.current) {
      pendingRefreshRef.current = true;
      return;
    }
    isRefreshingRef.current = true;

    trips.actions.setIsLoadingRefresh(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        const isMissingSession =
          authError.name === "AuthSessionMissingError" ||
          /auth session missing/i.test(authError.message ?? "");
        if (!isMissingSession) {
          logger.warn("Failed to read auth session", { error: authError });
        }
      }

      if (!user) {
        trips.actions.setIsLoadingRefresh(false);
        return;
      }

      const [savedResult, bookmarksResult, tripsResult, prefsResult] = await Promise.all([
        fetchSaved(supabase, user.id),
        fetchGuideBookmarks(supabase, user.id),
        fetchTrips(supabase, user.id),
        fetchPreferences(supabase, user.id),
      ]);

      // Filter out server trips that are stale compared to pending local edits
      let serverTrips = tripsResult.success && tripsResult.data ? tripsResult.data : null;
      if (serverTrips) {
        const localTs = trips.state.localTripUpdatedAt;
        serverTrips = serverTrips.filter((serverTrip) => {
          const localTimestamp = localTs[serverTrip.id];
          if (localTimestamp) {
            const serverTs = serverTrip.updatedAt ? new Date(serverTrip.updatedAt).getTime() : 0;
            if (localTimestamp > serverTs) {
              return false;
            }
          }
          return true;
        });
      }

      const mergedTrips = serverTrips
        ? mergeTrips(trips.state.trips, serverTrips)
        : trips.state.trips;

      // Merge server saved list with in-flight optimistic changes
      let mergedSaved = savedResult.success ? (savedResult.data ?? []) : saved.state.saved;
      if (savedResult.success && pendingSavesRef.current.size > 0) {
        const savedSet = new Set(mergedSaved);
        pendingSavesRef.current.forEach((action, id) => {
          if (action === "add") savedSet.add(id);
          else savedSet.delete(id);
        });
        mergedSaved = Array.from(savedSet);
      }

      // Hydrate each slice
      prefs.actions.hydrate({
        user: buildProfileFromSupabase(user, prefs.state.user),
        ...(prefsResult.success && prefsResult.data ? { userPreferences: prefsResult.data } : {}),
      });

      saved.actions.hydrate({
        saved: mergedSaved,
        ...(bookmarksResult.success ? { guideBookmarks: bookmarksResult.data ?? saved.state.guideBookmarks } : {}),
      });

      trips.actions.hydrate({
        trips: mergedTrips,
        isLoadingRefresh: false,
      });
    } catch (error) {
      logger.error("refreshFromSupabase failed", error);
      trips.actions.setIsLoadingRefresh(false);
    } finally {
      isRefreshingRef.current = false;
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        refreshFromSupabase();
      }
    }
  }, [supabase, prefs, saved, trips]);

  // -----------------------------------------------------------------------
  // Auth state listener
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!supabase) return;

    refreshFromSupabase();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: string | null, session: Session | null) => {
        if (!session?.user) {
          return;
        }
        refreshFromSupabase();
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // -----------------------------------------------------------------------
  // Composed actions - user preferences with Supabase sync
  // -----------------------------------------------------------------------
  const setUserPreferences = useCallback(
    (patch: Partial<UserPreferences>) => {
      prefs.actions.setUserPreferences(patch);

      if (supabase) {
        if (prefsSyncTimeout.current) clearTimeout(prefsSyncTimeout.current);
        prefsSyncTimeout.current = setTimeout(() => {
          void syncPreferencesSave(supabase, userPreferencesRef.current);
          prefsSyncTimeout.current = null;
        }, 2000);
      }
    },
    [supabase, prefs],
  );

  // -----------------------------------------------------------------------
  // Composed actions - trips with Supabase sync
  // -----------------------------------------------------------------------
  const createTrip = useCallback(
    (input: CreateTripInput) => {
      const id = trips.actions.createTrip(input);

      // Sync to Supabase
      if (supabase) {
        // getTripById will reflect the new trip after dispatch
        // We need to get the trip record. Since createTrip in the slice returns the ID,
        // we reconstruct the trip from the input.
        // Actually, createTrip in TripsSlice calls createTripRecord internally and returns the ID.
        // We need to sync the actual record. Let's get it after the next render...
        // For immediate sync, schedule a microtask to read the latest trips
        queueMicrotask(() => {
          const trip = tripsRef.current.find((t) => t.id === id);
          if (trip) {
            void syncTripSave(supabase, trip);
          }
        });
      }

      return id;
    },
    [supabase, trips.actions],
  );

  const scheduleTripSync = useCallback(
    (tripId: string) => {
      if (!supabase) return;

      const existingTimeout = tripSyncTimeouts.current.get(tripId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        const trip = tripsRef.current.find((t) => t.id === tripId);
        if (trip) {
          syncTripSave(supabase, trip).then((result) => {
            if (!result.success) {
              logger.warn("Trip sync failed after debounce", { tripId, error: result.error });
            }
          });
        }
        tripSyncTimeouts.current.delete(tripId);
      }, TRIP_SYNC_DEBOUNCE_MS);

      tripSyncTimeouts.current.set(tripId, timeout);
    },
    [supabase],
  );

  const updateTripItinerary = useCallback(
    (tripId: string, itinerary: Itinerary) => {
      trips.actions.updateTripItinerary(tripId, itinerary);
      scheduleTripSync(tripId);
    },
    [trips.actions, scheduleTripSync],
  );

  const rehydrateTripContent = useCallback<AppStateShape["rehydrateTripContent"]>(
    (tripId, content) => {
      trips.actions.rehydrateTripContent(tripId, content);
      scheduleTripSync(tripId);
    },
    [trips.actions, scheduleTripSync],
  );

  const renameTrip = useCallback(
    (tripId: string, name: string) => {
      trips.actions.renameTrip(tripId, name);

      if (supabase) {
        queueMicrotask(() => {
          const trip = tripsRef.current.find((t) => t.id === tripId);
          if (trip) {
            void syncTripSave(supabase, trip);
          }
        });
      }
    },
    [supabase, trips.actions],
  );

  const deleteTrip = useCallback(
    (tripId: string) => {
      // Clear any pending sync timeout for this trip
      const existingTimeout = tripSyncTimeouts.current.get(tripId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        tripSyncTimeouts.current.delete(tripId);
      }

      trips.actions.deleteTrip(tripId);
      history.actions.pruneForTrip(tripId);

      if (supabase) {
        void syncTripDelete(supabase, tripId);
      }
    },
    [supabase, trips.actions, history.actions],
  );

  const restoreTrip = useCallback(
    (trip: StoredTrip) => {
      trips.actions.restoreTrip(trip);

      if (supabase) {
        queueMicrotask(() => {
          const restoredTrip = tripsRef.current.find((t) => t.id === trip.id);
          if (restoredTrip) {
            void syncTripSave(supabase, restoredTrip);
          }
        });
      }
    },
    [supabase, trips.actions],
  );

  // -----------------------------------------------------------------------
  // Composed actions - saved with Supabase sync
  // -----------------------------------------------------------------------
  const toggleSave = useCallback(
    (id: string) => {
      if (pendingSavesRef.current.has(id)) return;

      const existed = saved.state.saved.includes(id);
      saved.actions.toggleSave(id);

      if (supabase) {
        pendingSavesRef.current.set(id, existed ? "remove" : "add");
        void (async () => {
          try {
            const result = await syncSavedToggle(supabase, id, existed);
            if (!result.success) {
              // Revert
              saved.actions.toggleSave(id);
            }
          } finally {
            pendingSavesRef.current.delete(id);
          }
        })();
      }
    },
    [supabase, saved],
  );

  const toggleGuideBookmark = useCallback(
    (id: string) => {
      if (loadingBookmarksRef.current.has(id)) return;

      const existed = saved.state.guideBookmarks.includes(id);

      // Optimistic toggle + mark loading
      saved.actions.toggleGuideBookmark(id);
      saved.actions.setLoadingBookmark(id, true);

      if (!supabase) {
        saved.actions.setLoadingBookmark(id, false);
        return;
      }

      void (async () => {
        const result = await syncBookmarkToggle(supabase, id, existed);

        saved.actions.setLoadingBookmark(id, false);

        if (result.shouldRevert) {
          saved.actions.toggleGuideBookmark(id);
        }
      })();
    },
    [supabase, saved],
  );

  // -----------------------------------------------------------------------
  // Composed actions - activity mutations with history tracking
  // -----------------------------------------------------------------------
  const updateItineraryWithHistory = useCallback(
    (
      tripId: string,
      dayId: string,
      editType: ItineraryEdit["type"],
      updater: (itinerary: Itinerary) => Itinerary,
      metadata?: Record<string, unknown>,
    ) => {
      const trip = trips.actions.getTripById(tripId);
      if (!trip) return;

      const previousItinerary = trip.itinerary;
      const nextItinerary = updater(previousItinerary);

      const edit = createEditHistoryEntry(tripId, dayId, editType, previousItinerary, nextItinerary, metadata);

      const historyState: EditHistoryState = {
        editHistory: history.state.editHistory,
        currentHistoryIndex: history.state.currentHistoryIndex,
      };
      const newHistoryState = addEditToHistory(historyState, tripId, edit);

      // Update trip itinerary
      trips.actions.updateTripItinerary(tripId, nextItinerary);

      // Update edit history
      history.actions.setHistoryAndIndex(
        tripId,
        newHistoryState.editHistory[tripId] ?? [],
        newHistoryState.currentHistoryIndex[tripId] ?? -1,
      );

      // Schedule debounced sync
      scheduleTripSync(tripId);
    },
    [trips.actions, history, scheduleTripSync],
  );

  const replaceActivity = useCallback(
    (tripId: string, dayId: string, activityId: string, newActivity: ItineraryActivity) => {
      updateItineraryWithHistory(
        tripId,
        dayId,
        "replaceActivity",
        (itinerary) => replaceActivityOp(itinerary, dayId, activityId, newActivity),
        { activityId, newActivityId: newActivity.id },
      );
    },
    [updateItineraryWithHistory],
  );

  const deleteActivity = useCallback(
    (tripId: string, dayId: string, activityId: string) => {
      updateItineraryWithHistory(
        tripId,
        dayId,
        "deleteActivity",
        (itinerary) => deleteActivityOp(itinerary, dayId, activityId),
        { activityId },
      );
    },
    [updateItineraryWithHistory],
  );

  const reorderActivities = useCallback(
    (tripId: string, dayId: string, activityIds: string[]) => {
      updateItineraryWithHistory(
        tripId,
        dayId,
        "reorderActivities",
        (itinerary) => reorderActivitiesOp(itinerary, dayId, activityIds),
        { activityIds },
      );
    },
    [updateItineraryWithHistory],
  );

  const addActivity = useCallback(
    (tripId: string, dayId: string, activity: ItineraryActivity, position?: number) => {
      updateItineraryWithHistory(
        tripId,
        dayId,
        "addActivity",
        (itinerary) => addActivityOp(itinerary, dayId, activity, position),
        { activityId: activity.id, position },
      );
    },
    [updateItineraryWithHistory],
  );

  const updateDayActivities = useCallback(
    (tripId: string, dayId: string, updater: (itinerary: Itinerary) => Itinerary, metadata?: Record<string, unknown>) => {
      updateItineraryWithHistory(
        tripId,
        dayId,
        "swapDayTrip",
        updater,
        metadata,
      );
    },
    [updateItineraryWithHistory],
  );

  // -----------------------------------------------------------------------
  // Composed actions - undo/redo
  // -----------------------------------------------------------------------
  const undo = useCallback(
    (tripId: string) => {
      const historyState: EditHistoryState = {
        editHistory: history.state.editHistory,
        currentHistoryIndex: history.state.currentHistoryIndex,
      };
      const result = performUndo(trips.state.trips, historyState, tripId);
      if (!result) return;

      // Update both slices
      const updatedTrip = result.trips.find((t) => t.id === tripId);
      if (updatedTrip) {
        trips.actions.updateTripItinerary(tripId, updatedTrip.itinerary);
      }
      history.actions.setHistoryAndIndex(
        tripId,
        result.historyState.editHistory[tripId] ?? [],
        result.historyState.currentHistoryIndex[tripId] ?? -1,
      );
    },
    [trips, history],
  );

  const redo = useCallback(
    (tripId: string) => {
      const historyState: EditHistoryState = {
        editHistory: history.state.editHistory,
        currentHistoryIndex: history.state.currentHistoryIndex,
      };
      const result = performRedo(trips.state.trips, historyState, tripId);
      if (!result) return;

      const updatedTrip = result.trips.find((t) => t.id === tripId);
      if (updatedTrip) {
        trips.actions.updateTripItinerary(tripId, updatedTrip.itinerary);
      }
      history.actions.setHistoryAndIndex(
        tripId,
        result.historyState.editHistory[tripId] ?? [],
        result.historyState.currentHistoryIndex[tripId] ?? -1,
      );
    },
    [trips, history],
  );

  const canUndo = useCallback(
    (tripId: string) => {
      return canUndoCheck(
        { editHistory: history.state.editHistory, currentHistoryIndex: history.state.currentHistoryIndex },
        tripId,
      );
    },
    [history.state.editHistory, history.state.currentHistoryIndex],
  );

  const canRedo = useCallback(
    (tripId: string) => {
      return canRedoCheck(
        { editHistory: history.state.editHistory, currentHistoryIndex: history.state.currentHistoryIndex },
        tripId,
      );
    },
    [history.state.editHistory, history.state.currentHistoryIndex],
  );

  // -----------------------------------------------------------------------
  // clearAllLocalData
  // -----------------------------------------------------------------------
  const clearAllLocalData = useCallback(() => {
    // Flush any pending trip sync timeouts
    tripSyncTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    tripSyncTimeouts.current.clear();

    // Reset all four slices
    saved.actions.reset();
    prefs.actions.reset();
    trips.actions.reset();
    history.actions.reset();

    // Give prefs a fresh guest ID
    prefs.actions.hydrate({ user: { id: newId(), displayName: "Guest" } });

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(APP_STATE_STORAGE_KEY);
      } catch (e) {
        logger.warn("Failed to clear localStorage", { error: e instanceof Error ? e.message : String(e) });
      }
      localStorage.removeItem(SAVED_STORAGE_KEY);
      localStorage.removeItem(USER_PREFERENCES_STORAGE_KEY);
      localStorage.removeItem(USER_TRAVEL_PREFS_STORAGE_KEY);
      localStorage.removeItem(FILTER_METADATA_STORAGE_KEY);
      localStorage.removeItem(TRIP_STEP_STORAGE_KEY);
      localStorage.removeItem(TRIP_BUILDER_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent("yuku:local-data-cleared"));
    }
  }, [saved.actions, prefs.actions, trips.actions, history.actions]);

  // -----------------------------------------------------------------------
  // Build the composed API
  // -----------------------------------------------------------------------
  const api = useMemo<AppStateShape>(
    () => {
      return {
        // State from slices
        user: prefs.state.user,
        saved: saved.state.saved,
        guideBookmarks: saved.state.guideBookmarks,
        loadingBookmarks: saved.state.loadingBookmarks,
        userPreferences: prefs.state.userPreferences,
        trips: trips.state.trips,
        isLoadingRefresh: trips.state.isLoadingRefresh,
        dayEntryPoints: trips.state.dayEntryPoints,
        cityAccommodations: trips.state.cityAccommodations,
        editHistory: history.state.editHistory,
        currentHistoryIndex: history.state.currentHistoryIndex,

        // Preferences actions
        setUser: prefs.actions.setUser,
        setUserPreferences,

        // Saved actions (composed with sync)
        toggleSave,
        isSaved: saved.actions.isSaved,
        toggleGuideBookmark,
        isGuideBookmarked: saved.actions.isGuideBookmarked,

        // Trip actions (composed with sync)
        createTrip,
        updateTripItinerary,
        rehydrateTripContent,
        renameTrip,
        deleteTrip,
        restoreTrip,
        getTripById: trips.actions.getTripById,

        // Day entry / accommodation actions
        setDayEntryPoint: trips.actions.setDayEntryPoint,
        setCityAccommodation: trips.actions.setCityAccommodation,

        // Activity mutation actions (composed with history)
        replaceActivity,
        deleteActivity,
        reorderActivities,
        addActivity,
        updateDayActivities,

        // Undo/redo (composed across trips + history)
        undo,
        redo,
        canUndo,
        canRedo,

        // Top-level actions
        clearAllLocalData,
        refreshFromSupabase,
      };
    },
    [
      prefs.state,
      saved.state,
      trips.state,
      history.state,
      prefs.actions,
      saved.actions,
      trips.actions,
      setUserPreferences,
      toggleSave,
      toggleGuideBookmark,
      createTrip,
      updateTripItinerary,
      rehydrateTripContent,
      renameTrip,
      deleteTrip,
      restoreTrip,
      replaceActivity,
      deleteActivity,
      reorderActivities,
      addActivity,
      updateDayActivities,
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

// ---------------------------------------------------------------------------
// AppStateProvider - composes four slice providers + sync orchestrator
// ---------------------------------------------------------------------------

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  return (
    <SavedProvider>
      <PreferencesProvider>
        <TripsProvider>
          <EditHistoryProvider>
            <SyncOrchestrator>{children}</SyncOrchestrator>
          </EditHistoryProvider>
        </TripsProvider>
      </PreferencesProvider>
    </SavedProvider>
  );
}

export function useAppState() {
  return useContext(Ctx);
}
