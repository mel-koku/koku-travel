"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Query key factory for saved places
 * Enables targeted cache invalidation and prefetching
 */
export const savedKeys = {
  all: ["saved"] as const,
  user: (userId: string) => [...savedKeys.all, userId] as const,
};

type SavedRow = {
  place_id: string;
  location_id?: string;
};

type SavedData = {
  placeId: string;
  locationId?: string;
};

/**
 * Fetches saved places from Supabase for a given user
 * Returns both place_id and location_id for flexible lookup
 */
async function fetchSaved(
  supabase: SupabaseClient,
  userId: string,
): Promise<SavedData[]> {
  const { data, error } = await supabase
    .from("saved")
    .select("place_id, location_id")
    .eq("user_id", userId);

  if (error) {
    logger.warn("Failed to load saved places from Supabase", { error });
    throw new Error(error.message);
  }

  const rows = (data ?? []) as SavedRow[];
  return rows.map((row) => ({
    placeId: row.place_id,
    locationId: row.location_id,
  }));
}

/**
 * Looks up the internal location_id from the locations table by place_id
 */
async function lookupLocationId(
  supabase: SupabaseClient,
  placeId: string,
): Promise<string | undefined> {
  try {
    const { data, error } = await supabase
      .from("locations")
      .select("id")
      .eq("place_id", placeId)
      .limit(1)
      .single();

    if (error || !data) {
      return undefined;
    }

    return data.id as string;
  } catch {
    return undefined;
  }
}

/**
 * Adds a saved place to Supabase
 * Automatically looks up and stores the location_id for direct joins
 */
async function addSaved(
  supabase: SupabaseClient,
  userId: string,
  placeId: string,
  locationId?: string,
): Promise<void> {
  // If locationId not provided, try to look it up from the locations table
  let resolvedLocationId = locationId;
  if (!resolvedLocationId) {
    resolvedLocationId = await lookupLocationId(supabase, placeId);
  }

  const { error } = await supabase
    .from("saved")
    .upsert(
      {
        user_id: userId,
        place_id: placeId,
        location_id: resolvedLocationId,
      },
      { onConflict: "user_id,place_id" }
    );

  if (error) {
    logger.error("Failed to add saved place", { error });
    throw new Error(error.message);
  }
}

/**
 * Removes a saved place from Supabase
 */
async function removeSaved(
  supabase: SupabaseClient,
  userId: string,
  placeId: string,
): Promise<void> {
  const { error } = await supabase
    .from("saved")
    .delete()
    .eq("user_id", userId)
    .eq("place_id", placeId);

  if (error) {
    logger.error("Failed to remove saved place", { error });
    throw new Error(error.message);
  }
}

/**
 * React Query hook for fetching user saved places
 *
 * Features:
 * - Automatic caching and background updates
 * - Optimistic updates support
 * - Only enabled when userId is provided
 * - Returns both placeId and locationId for flexible lookups
 *
 * @param userId - The authenticated user's ID (optional)
 * @returns Query result with saved places array containing placeId and locationId
 */
export function useSavedQuery(userId: string | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: userId ? savedKeys.user(userId) : savedKeys.all,
    queryFn: async (): Promise<SavedData[]> => {
      if (!userId) return [];
      return fetchSaved(supabase, userId);
    },
    // Only fetch when we have a userId
    enabled: !!userId,
    // Data is considered fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 30 minutes after last use
    gcTime: 30 * 60 * 1000,
    // Don't refetch on window focus for this data
    refetchOnWindowFocus: false,
    // Return empty array initially
    initialData: [] as SavedData[],
  });
}

type ToggleSavedParams = {
  placeId: string;
  locationId?: string;
  userId: string;
  currentSaved: SavedData[];
};

/**
 * React Query mutation hook for toggling saved places
 *
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Automatic rollback on error
 * - Cache invalidation on success
 * - Supports locationId for direct location joins
 *
 * @returns Mutation for toggling a saved place
 */
export function useToggleSavedMutation() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ placeId, locationId, userId, currentSaved }: ToggleSavedParams) => {
      const isSaved = currentSaved.some((f) => f.placeId === placeId);

      if (isSaved) {
        await removeSaved(supabase, userId, placeId);
        return { placeId, action: "removed" as const };
      } else {
        await addSaved(supabase, userId, placeId, locationId);
        return { placeId, action: "added" as const };
      }
    },
    // Optimistic update - update cache immediately before API call
    onMutate: async ({ placeId, locationId, userId, currentSaved }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: savedKeys.user(userId) });

      // Snapshot the previous value
      const previousSaved = queryClient.getQueryData<SavedData[]>(
        savedKeys.user(userId),
      );

      // Optimistically update to the new value
      const isSaved = currentSaved.some((f) => f.placeId === placeId);
      const newSaved: SavedData[] = isSaved
        ? currentSaved.filter((f) => f.placeId !== placeId)
        : [...currentSaved, { placeId, locationId }];

      queryClient.setQueryData<SavedData[]>(savedKeys.user(userId), newSaved);

      // Return a context object with the snapshot
      return { previousSaved, userId };
    },
    // If mutation fails, roll back to the previous value
    onError: (_error, _variables, context) => {
      if (context?.previousSaved !== undefined && context?.userId) {
        queryClient.setQueryData<SavedData[]>(
          savedKeys.user(context.userId),
          context.previousSaved,
        );
      }
      logger.error("Failed to toggle saved place, rolling back", { error: _error });
    },
    // Only refetch after success to confirm server state (skip on error — already rolled back)
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: savedKeys.user(variables.userId) });
    },
  });
}

/**
 * Hook that combines query and mutation for easy saved places management
 *
 * Usage:
 * ```tsx
 * const { saved, isSaved, isSavedByLocationId, toggleSave, isLoading } = useSavedPlaces(userId);
 *
 * <button onClick={() => toggleSave("place-123", "location-456")}>
 *   {isSaved("place-123") ? "Remove" : "Save"}
 * </button>
 * ```
 */
export function useSavedPlaces(userId: string | undefined) {
  const { data: saved = [], isLoading, error } = useSavedQuery(userId);
  const toggleMutation = useToggleSavedMutation();

  /**
   * Check if a place is saved by its place_id
   */
  const isSaved = (placeId: string): boolean => {
    return saved.some((f) => f.placeId === placeId);
  };

  /**
   * Check if a location is saved by its internal location_id
   */
  const isSavedByLocationId = (locationId: string): boolean => {
    return saved.some((f) => f.locationId === locationId);
  };

  /**
   * Toggle saved status for a place
   * @param placeId - The Google place_id
   * @param locationId - Optional internal location_id for direct joins
   */
  const toggleSave = (placeId: string, locationId?: string) => {
    if (!userId) {
      logger.warn("Cannot toggle saved: no user ID");
      return;
    }

    toggleMutation.mutate({
      placeId,
      locationId,
      userId,
      currentSaved: saved,
    });
  };

  /**
   * Get all place_ids for backwards compatibility
   */
  const savedPlaceIds = saved.map((f) => f.placeId);

  return {
    saved,
    savedPlaceIds,
    isSaved,
    isSavedByLocationId,
    toggleSave,
    isLoading,
    isToggling: toggleMutation.isPending,
    error: error instanceof Error ? error.message : null,
  };
}
