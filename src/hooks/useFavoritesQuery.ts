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
};

/**
 * Fetches favorites from Supabase for a given user
 */
async function fetchFavorites(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("place_id")
    .eq("user_id", userId);

  if (error) {
    logger.warn("Failed to load favorites from Supabase", { error });
    throw new Error(error.message);
  }

  const rows = (data ?? []) as FavoriteRow[];
  return rows.map((row) => row.place_id);
}

/**
 * Adds a favorite to Supabase
 */
async function addFavorite(
  supabase: SupabaseClient,
  userId: string,
  placeId: string,
): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .upsert({ user_id: userId, place_id: placeId }, { onConflict: "user_id,place_id" });

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
 *
 * @param userId - The authenticated user's ID (optional)
 * @returns Query result with favorites array
 */
export function useFavoritesQuery(userId: string | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: userId ? favoriteKeys.user(userId) : favoriteKeys.all,
    queryFn: async () => {
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
    initialData: [],
  });
}

type ToggleFavoriteParams = {
  placeId: string;
  userId: string;
  currentFavorites: string[];
};

/**
 * React Query mutation hook for toggling favorites
 *
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Automatic rollback on error
 * - Cache invalidation on success
 *
 * @returns Mutation for toggling a favorite
 */
export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ placeId, userId, currentFavorites }: ToggleFavoriteParams) => {
      const isFavorited = currentFavorites.includes(placeId);

      if (isFavorited) {
        await removeFavorite(supabase, userId, placeId);
        return { placeId, action: "removed" as const };
      } else {
        await addFavorite(supabase, userId, placeId);
        return { placeId, action: "added" as const };
      }
    },
    // Optimistic update - update cache immediately before API call
    onMutate: async ({ placeId, userId, currentFavorites }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: favoriteKeys.user(userId) });

      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData<string[]>(
        favoriteKeys.user(userId),
      );

      // Optimistically update to the new value
      const isFavorited = currentFavorites.includes(placeId);
      const newFavorites = isFavorited
        ? currentFavorites.filter((id) => id !== placeId)
        : [...currentFavorites, placeId];

      queryClient.setQueryData<string[]>(favoriteKeys.user(userId), newFavorites);

      // Return a context object with the snapshot
      return { previousFavorites, userId };
    },
    // If mutation fails, roll back to the previous value
    onError: (_error, _variables, context) => {
      if (context?.previousFavorites !== undefined && context?.userId) {
        queryClient.setQueryData<string[]>(
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
 * const { favorites, isFavorite, toggleFavorite, isLoading } = useFavorites(userId);
 *
 * <button onClick={() => toggleFavorite("place-123")}>
 *   {isFavorite("place-123") ? "Remove" : "Add"} to Favorites
 * </button>
 * ```
 */
export function useFavorites(userId: string | undefined) {
  const { data: favorites = [], isLoading, error } = useFavoritesQuery(userId);
  const toggleMutation = useToggleFavoriteMutation();

  const isFavorite = (placeId: string): boolean => {
    return favorites.includes(placeId);
  };

  const toggleFavorite = (placeId: string) => {
    if (!userId) {
      logger.warn("Cannot toggle favorite: no user ID");
      return;
    }

    toggleMutation.mutate({
      placeId,
      userId,
      currentFavorites: favorites,
    });
  };

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    isLoading,
    isToggling: toggleMutation.isPending,
    error: error instanceof Error ? error.message : null,
  };
}
