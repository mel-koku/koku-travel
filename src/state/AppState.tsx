"use client";

import { type Itinerary, type ItineraryActivity, type ItineraryEdit } from "@/types/itinerary";
import type { TripBuilderData, DayEntryPoint, EntryPoint } from "@/types/trip";
import { createClient } from "@/lib/supabase/client";
import { loadWishlist } from "@/lib/wishlistStorage";
import { APP_STATE_STORAGE_KEY, APP_STATE_DEBOUNCE_MS, MAX_EDIT_HISTORY_ENTRIES, STABLE_DEFAULT_USER_ID } from "@/lib/constants";
import { WISHLIST_STORAGE_KEY } from "@/lib/constants/storage";
import type { Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { logger } from "@/lib/logger";

export type UserProfile = {
  id: string; // local-only UUID
  displayName: string; // shown in UI ("Mel", etc.)
  email?: string; // optional for future sync
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

  // loading states
  isLoadingRefresh: boolean;
  loadingBookmarks: Set<string>; // Set of guide IDs currently being bookmarked/unbookmarked

  // editing state
  dayEntryPoints: Record<string, DayEntryPoint>; // keyed by `${tripId}-${dayId}`
  editHistory: Record<string, ItineraryEdit[]>; // keyed by tripId
  currentHistoryIndex: Record<string, number>; // keyed by tripId

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

  // editing actions
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

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "u_" + Math.random().toString(36).slice(2, 10);
}

// Use a stable default ID for SSR to prevent hydration mismatches
// Real ID will be generated on client after hydration

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

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
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

  // load
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(APP_STATE_STORAGE_KEY);
      const legacyFavorites = loadWishlist();

      let nextState: InternalState;
      if (raw) {
        const parsed = JSON.parse(raw);
        // Ensure user has a valid ID (replace stable default if needed)
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
        // Generate a real ID on first client load
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
      localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(nextState));

      if (legacyFavorites.length > 0) {
        localStorage.removeItem(WISHLIST_STORAGE_KEY);
      }
    } catch {
      // ignore malformed data
    }
  }, []);

  const refreshFromSupabase = useCallback(async () => {
    if (!supabase) {
      return;
    }

    setState((s) => ({ ...s, isLoadingRefresh: true }));

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

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

      const [favoritesResponse, bookmarksResponse] = await Promise.all([
        supabase.from("favorites").select("place_id").eq("user_id", user.id),
        supabase.from("guide_bookmarks").select("guide_id").eq("user_id", user.id),
      ]);

      if (favoritesResponse.error) {
        logger.warn("Failed to load favorites", { error: favoritesResponse.error });
      }
      if (bookmarksResponse.error) {
        logger.warn("Failed to load guide bookmarks", { error: bookmarksResponse.error });
      }

      const favoriteRows = (favoritesResponse.data ?? []) as Array<{ place_id: string }>;
      const bookmarkRows = (bookmarksResponse.data ?? []) as Array<{ guide_id: string }>;

      setState((s) => ({
        ...s,
        user: buildProfileFromSupabase(user, s.user),
        favorites: favoriteRows.map((row) => row.place_id),
        guideBookmarks: bookmarkRows.map((row) => row.guide_id),
        isLoadingRefresh: false,
      }));
    } catch (error) {
      logger.error("refreshFromSupabase failed", error);
      setState((s) => ({ ...s, isLoadingRefresh: false }));
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    refreshFromSupabase();
    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((_event: string | null, session: Session | null) => {
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
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [refreshFromSupabase, supabase]);

  // save - debounced and only persist essential fields (exclude loading states)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const timeoutId = setTimeout(() => {
      // Only persist essential fields, not the entire state object
      // Exclude loading states as they are runtime-only
      const persistedState = {
        user: state.user,
        favorites: state.favorites,
        guideBookmarks: state.guideBookmarks,
        trips: state.trips,
        dayEntryPoints: state.dayEntryPoints,
        editHistory: state.editHistory,
        currentHistoryIndex: state.currentHistoryIndex,
      };
      localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(persistedState));
    }, APP_STATE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [state.user, state.favorites, state.guideBookmarks, state.trips, state.dayEntryPoints, state.editHistory, state.currentHistoryIndex]);

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

      if (!supabase) {
        return;
      }

      void (async (favoriteId: string, existedBeforeToggle: boolean) => {
        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError) {
            const errorMessage =
              authError instanceof Error
                ? authError.message
                : typeof authError === "object" && authError && "message" in authError
                  ? String((authError as { message?: unknown }).message)
                  : "";

            if (typeof errorMessage === "string" && errorMessage.includes("Auth session missing")) {
              // No authenticated Supabase session – keep optimistic local state without logging noise.
              return;
            }

            logger.error("Failed to read auth session when syncing favorite", authError);
            return;
          }

          if (!user) {
            // No authenticated user – keep local state but skip remote sync.
            return;
          }

          if (existedBeforeToggle) {
            const { error } = await supabase
              .from("favorites")
              .delete()
              .eq("user_id", user.id)
              .eq("place_id", favoriteId);

            if (error) {
              throw error;
            }
          } else {
            const { error } = await supabase
              .from("favorites")
              .upsert({ user_id: user.id, place_id: favoriteId }, { onConflict: "user_id,place_id" });

            if (error) {
              throw error;
            }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : JSON.stringify(error ?? {});
          logger.error("Failed to sync favorite", new Error(message));
          // Keep optimistic local state so the UI stays responsive even if remote sync fails.
        }
      })(id, existed);
    },
    [supabase],
  );

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

      void (async (guideId: string, existedBeforeToggle: boolean) => {
        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError) {
            logger.error("Failed to read auth session when syncing guide bookmark", authError);
            setState((s) => {
              const loadingSet = new Set(s.loadingBookmarks);
              loadingSet.delete(guideId);
              return { ...s, loadingBookmarks: loadingSet };
            });
            return;
          }

          if (!user) {
            setState((s) => {
              const loadingSet = new Set(s.loadingBookmarks);
              loadingSet.delete(guideId);
              return { ...s, loadingBookmarks: loadingSet };
            });
            return;
          }

          if (existedBeforeToggle) {
            const { error } = await supabase
              .from("guide_bookmarks")
              .delete()
              .eq("user_id", user.id)
              .eq("guide_id", guideId);

            if (error) {
              throw error;
            }
          } else {
            const { error } = await supabase
              .from("guide_bookmarks")
              .upsert({ user_id: user.id, guide_id: guideId }, { onConflict: "user_id,guide_id" });

            if (error) {
              throw error;
            }
          }

          setState((s) => {
            const loadingSet = new Set(s.loadingBookmarks);
            loadingSet.delete(guideId);
            return { ...s, loadingBookmarks: loadingSet };
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : typeof error === "object" && error && "message" in error
                ? String((error as { message?: unknown }).message)
                : "";

          if (typeof message === "string" && message.includes("Auth session missing")) {
            // No authenticated Supabase session – keep optimistic local state without logging noise.
            setState((s) => {
              const loadingSet = new Set(s.loadingBookmarks);
              loadingSet.delete(guideId);
              return { ...s, loadingBookmarks: loadingSet };
            });
            return;
          }

          logger.error("Failed to sync guide bookmark", message || error);
          setState((s) => {
            const set = new Set(s.guideBookmarks);
            if (existedBeforeToggle) {
              set.add(guideId);
            } else {
              set.delete(guideId);
            }
            const loadingSet = new Set(s.loadingBookmarks);
            loadingSet.delete(guideId);
            return { ...s, guideBookmarks: Array.from(set), loadingBookmarks: loadingSet };
          });
        }
      })(id, existed);
    },
    [supabase],
  );

  // Helper function to create edit history entry
  const createEditHistoryEntry = useCallback(
    (
      tripId: string,
      dayId: string,
      type: ItineraryEdit["type"],
      previousItinerary: Itinerary,
      nextItinerary: Itinerary,
      metadata?: Record<string, unknown>,
    ): ItineraryEdit => {
      return {
        id: newId(),
        tripId,
        timestamp: new Date().toISOString(),
        type,
        dayId,
        previousItinerary,
        nextItinerary,
        metadata,
      };
    },
    [],
  );

  // Helper function to update itinerary and add to history
  const updateItineraryWithHistory = useCallback(
    (
      tripId: string,
      dayId: string,
      editType: ItineraryEdit["type"],
      updater: (itinerary: Itinerary) => Itinerary,
      metadata?: Record<string, unknown>,
    ) => {
      setState((s) => {
        const trip = s.trips.find((t) => t.id === tripId);
        if (!trip) return s;

        const previousItinerary = trip.itinerary;
        const nextItinerary = updater(previousItinerary);

        // Create edit history entry
        const edit = createEditHistoryEntry(tripId, dayId, editType, previousItinerary, nextItinerary, metadata);

        // Get current history for this trip
        const history = s.editHistory[tripId] ?? [];
        const currentIndex = s.currentHistoryIndex[tripId] ?? -1;

        // Remove any edits after current index (when undoing and then making new edit)
        const newHistory = history.slice(0, currentIndex + 1);
        newHistory.push(edit);

        // Limit history to last N edits
        const trimmedHistory = newHistory.slice(-MAX_EDIT_HISTORY_ENTRIES);

        // Update trip itinerary
        const updatedTrips = s.trips.map((t) =>
          t.id === tripId
            ? {
                ...t,
                itinerary: nextItinerary,
                updatedAt: new Date().toISOString(),
              }
            : t,
        );

        return {
          ...s,
          trips: updatedTrips,
          editHistory: {
            ...s.editHistory,
            [tripId]: trimmedHistory,
          },
          currentHistoryIndex: {
            ...s.currentHistoryIndex,
            [tripId]: trimmedHistory.length - 1,
          },
        };
      });
    },
    [createEditHistoryEntry],
  );

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
          dayEntryPoints: {
            ...s.dayEntryPoints,
            [key]: updated,
          },
        };
      });
    },
    [],
  );

  const replaceActivity = useCallback(
    (tripId: string, dayId: string, activityId: string, newActivity: ItineraryActivity) => {
      updateItineraryWithHistory(tripId, dayId, "replaceActivity", (itinerary) => {
        return {
          ...itinerary,
          days: itinerary.days.map((day) => {
            if (day.id !== dayId) return day;
            return {
              ...day,
              activities: day.activities.map((activity) =>
                activity.id === activityId ? newActivity : activity,
              ),
            };
          }),
        };
      }, { activityId, newActivityId: newActivity.id });
    },
    [updateItineraryWithHistory],
  );

  const deleteActivity = useCallback(
    (tripId: string, dayId: string, activityId: string) => {
      updateItineraryWithHistory(tripId, dayId, "deleteActivity", (itinerary) => {
        return {
          ...itinerary,
          days: itinerary.days.map((day) => {
            if (day.id !== dayId) return day;
            return {
              ...day,
              activities: day.activities.filter((activity) => activity.id !== activityId),
            };
          }),
        };
      }, { activityId });
    },
    [updateItineraryWithHistory],
  );

  const reorderActivities = useCallback(
    (tripId: string, dayId: string, activityIds: string[]) => {
      updateItineraryWithHistory(tripId, dayId, "reorderActivities", (itinerary) => {
        return {
          ...itinerary,
          days: itinerary.days.map((day) => {
            if (day.id !== dayId) return day;
            // Create a map for quick lookup
            const activityMap = new Map(day.activities.map((a) => [a.id, a]));
            // Reorder activities based on the provided order
            const reorderedActivities = activityIds
              .map((id) => activityMap.get(id))
              .filter((a): a is ItineraryActivity => a !== undefined);
            return {
              ...day,
              activities: reorderedActivities,
            };
          }),
        };
      }, { activityIds });
    },
    [updateItineraryWithHistory],
  );

  const addActivity = useCallback(
    (tripId: string, dayId: string, activity: ItineraryActivity, position?: number) => {
      updateItineraryWithHistory(tripId, dayId, "addActivity", (itinerary) => {
        return {
          ...itinerary,
          days: itinerary.days.map((day) => {
            if (day.id !== dayId) return day;
            const activities = [...day.activities];
            if (position !== undefined && position >= 0 && position <= activities.length) {
              activities.splice(position, 0, activity);
            } else {
              activities.push(activity);
            }
            return {
              ...day,
              activities,
            };
          }),
        };
      }, { activityId: activity.id, position });
    },
    [updateItineraryWithHistory],
  );

  const undo = useCallback(
    (tripId: string) => {
      setState((s) => {
        const history = s.editHistory[tripId] ?? [];
        const currentIndex = s.currentHistoryIndex[tripId] ?? -1;

        if (currentIndex < 0) return s; // Nothing to undo

        const edit = history[currentIndex];
        if (!edit) return s;

        // Restore previous itinerary state
        const updatedTrips = s.trips.map((t) =>
          t.id === tripId
            ? {
                ...t,
                itinerary: edit.previousItinerary,
                updatedAt: new Date().toISOString(),
              }
            : t,
        );

        return {
          ...s,
          trips: updatedTrips,
          currentHistoryIndex: {
            ...s.currentHistoryIndex,
            [tripId]: currentIndex - 1,
          },
        };
      });
    },
    [],
  );

  const redo = useCallback(
    (tripId: string) => {
      setState((s) => {
        const history = s.editHistory[tripId] ?? [];
        const currentIndex = s.currentHistoryIndex[tripId] ?? -1;

        if (currentIndex >= history.length - 1) return s; // Nothing to redo

        const edit = history[currentIndex + 1];
        if (!edit) return s;

        // Restore next itinerary state
        const updatedTrips = s.trips.map((t) =>
          t.id === tripId
            ? {
                ...t,
                itinerary: edit.nextItinerary,
                updatedAt: new Date().toISOString(),
              }
            : t,
        );

        return {
          ...s,
          trips: updatedTrips,
          currentHistoryIndex: {
            ...s.currentHistoryIndex,
            [tripId]: currentIndex + 1,
          },
        };
      });
    },
    [],
  );

  const canUndo = useCallback(
    (tripId: string) => {
      const currentIndex = state.currentHistoryIndex[tripId] ?? -1;
      return currentIndex >= 0;
    },
    [state.currentHistoryIndex],
  );

  const canRedo = useCallback(
    (tripId: string) => {
      const history = state.editHistory[tripId] ?? [];
      const currentIndex = state.currentHistoryIndex[tripId] ?? -1;
      return currentIndex < history.length - 1;
    },
    [state.editHistory, state.currentHistoryIndex],
  );

  const clearAllLocalData = useCallback(() => {
    if (typeof window !== "undefined" && !window.confirm("Clear all local Koku data on this device?")) {
      return;
    }
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
      localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(next));
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


