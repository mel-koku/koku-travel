"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Query key factory for favorites
 * Enables targeted cache invalidation and prefetching
 */
export const favoriteKeys = {
  all: ["favorites"] as const,
  user: (userId: string) => [...favoriteKeys.all, userId] as const,
};

type FavoriteRow = {
  place_id: string;
  location_id?: string;
};

type FavoriteData = {
  placeId: string;
  locationId?: string;
};

/**
 * Fetches favorites from Supabase for a given user
 * Returns both place_id and location_id for flexible lookup
 */
async function fetchFavorites(
  supabase: SupabaseClient,
  userId: string,
): Promise<FavoriteData[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("place_id, location_id")
    .eq("user_id", userId);

  if (error) {
    logger.warn("Failed to load favorites from Supabase", { error });
    throw new Error(error.message);
  }

  const rows = (data ?? []) as FavoriteRow[];
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
 * Adds a favorite to Supabase
 * Automatically looks up and stores the location_id for direct joins
 */
async function addFavorite(
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
    .from("favorites")
    .upsert(
      {
        user_id: userId,
        place_id: placeId,
        location_id: resolvedLocationId,
      },
      { onConflict: "user_id,place_id" }
    );

  if (error) {
    logger.error("Failed to add favorite", { error });
    throw new Error(error.message);
  }
}

/**
 * Removes a favorite from Supabase
 */
async function removeFavorite(
  supabase: SupabaseClient,
  userId: string,
  placeId: string,
): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("place_id", placeId);

  if (error) {
    logger.error("Failed to remove favorite", { error });
    throw new Error(error.message);
  }
}

/**
 * React Query hook for fetching user favorites
 *
 * Features:
 * - Automatic caching and background updates
 * - Optimistic updates support
 * - Only enabled when userId is provided
 * - Returns both placeId and locationId for flexible lookups
 *
 * @param userId - The authenticated user's ID (optional)
 * @returns Query result with favorites array containing placeId and locationId
 */
export function useFavoritesQuery(userId: string | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: userId ? favoriteKeys.user(userId) : favoriteKeys.all,
    queryFn: async (): Promise<FavoriteData[]> => {
      if (!userId) return [];
      return fetchFavorites(supabase, userId);
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
    initialData: [] as FavoriteData[],
  });
}

type ToggleFavoriteParams = {
  placeId: string;
  locationId?: string;
  userId: string;
  currentFavorites: FavoriteData[];
};

/**
 * React Query mutation hook for toggling favorites
 *
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Automatic rollback on error
 * - Cache invalidation on success
 * - Supports locationId for direct location joins
 *
 * @returns Mutation for toggling a favorite
 */
export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ placeId, locationId, userId, currentFavorites }: ToggleFavoriteParams) => {
      const isFavorited = currentFavorites.some((f) => f.placeId === placeId);

      if (isFavorited) {
        await removeFavorite(supabase, userId, placeId);
        return { placeId, action: "removed" as const };
      } else {
        await addFavorite(supabase, userId, placeId, locationId);
        return { placeId, action: "added" as const };
      }
    },
    // Optimistic update - update cache immediately before API call
    onMutate: async ({ placeId, locationId, userId, currentFavorites }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: favoriteKeys.user(userId) });

      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData<FavoriteData[]>(
        favoriteKeys.user(userId),
      );

      // Optimistically update to the new value
      const isFavorited = currentFavorites.some((f) => f.placeId === placeId);
      const newFavorites: FavoriteData[] = isFavorited
        ? currentFavorites.filter((f) => f.placeId !== placeId)
        : [...currentFavorites, { placeId, locationId }];

      queryClient.setQueryData<FavoriteData[]>(favoriteKeys.user(userId), newFavorites);

      // Return a context object with the snapshot
      return { previousFavorites, userId };
    },
    // If mutation fails, roll back to the previous value
    onError: (_error, _variables, context) => {
      if (context?.previousFavorites !== undefined && context?.userId) {
        queryClient.setQueryData<FavoriteData[]>(
          favoriteKeys.user(context.userId),
          context.previousFavorites,
        );
      }
      logger.error("Failed to toggle favorite, rolling back", { error: _error });
    },
    // Always refetch after error or success
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.user(variables.userId) });
    },
  });
}

/**
 * Hook that combines query and mutation for easy favorites management
 *
 * Usage:
 * ```tsx
 * const { favorites, isFavorite, isFavoriteByLocationId, toggleFavorite, isLoading } = useFavorites(userId);
 *
 * <button onClick={() => toggleFavorite("place-123", "location-456")}>
 *   {isFavorite("place-123") ? "Remove" : "Add"} to Favorites
 * </button>
 * ```
 */
export function useFavorites(userId: string | undefined) {
  const { data: favorites = [], isLoading, error } = useFavoritesQuery(userId);
  const toggleMutation = useToggleFavoriteMutation();

  /**
   * Check if a place is favorited by its place_id
   */
  const isFavorite = (placeId: string): boolean => {
    return favorites.some((f) => f.placeId === placeId);
  };

  /**
   * Check if a location is favorited by its internal location_id
   */
  const isFavoriteByLocationId = (locationId: string): boolean => {
    return favorites.some((f) => f.locationId === locationId);
  };

  /**
   * Toggle favorite status for a place
   * @param placeId - The Google place_id
   * @param locationId - Optional internal location_id for direct joins
   */
  const toggleFavorite = (placeId: string, locationId?: string) => {
    if (!userId) {
      logger.warn("Cannot toggle favorite: no user ID");
      return;
    }

    toggleMutation.mutate({
      placeId,
      locationId,
      userId,
      currentFavorites: favorites,
    });
  };

  /**
   * Get all place_ids for backwards compatibility
   */
  const favoritePlaceIds = favorites.map((f) => f.placeId);

  return {
    favorites,
    favoritePlaceIds,
    isFavorite,
    isFavoriteByLocationId,
    toggleFavorite,
    isLoading,
    isToggling: toggleMutation.isPending,
    error: error instanceof Error ? error.message : null,
  };
}
