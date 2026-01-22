"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Query key factory for guide bookmarks
 * Enables targeted cache invalidation and prefetching
 */
export const bookmarkKeys = {
  all: ["bookmarks"] as const,
  user: (userId: string) => [...bookmarkKeys.all, userId] as const,
};

type BookmarkRow = {
  guide_id: string;
};

/**
 * Fetches guide bookmarks from Supabase for a given user
 */
async function fetchBookmarks(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("guide_bookmarks")
    .select("guide_id")
    .eq("user_id", userId);

  if (error) {
    logger.warn("Failed to load guide bookmarks from Supabase", { error });
    throw new Error(error.message);
  }

  const rows = (data ?? []) as BookmarkRow[];
  return rows.map((row) => row.guide_id);
}

/**
 * Adds a guide bookmark to Supabase
 */
async function addBookmark(
  supabase: SupabaseClient,
  userId: string,
  guideId: string,
): Promise<void> {
  const { error } = await supabase
    .from("guide_bookmarks")
    .upsert({ user_id: userId, guide_id: guideId }, { onConflict: "user_id,guide_id" });

  if (error) {
    logger.error("Failed to add guide bookmark", { error });
    throw new Error(error.message);
  }
}

/**
 * Removes a guide bookmark from Supabase
 */
async function removeBookmark(
  supabase: SupabaseClient,
  userId: string,
  guideId: string,
): Promise<void> {
  const { error } = await supabase
    .from("guide_bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("guide_id", guideId);

  if (error) {
    logger.error("Failed to remove guide bookmark", { error });
    throw new Error(error.message);
  }
}

/**
 * React Query hook for fetching user guide bookmarks
 *
 * Features:
 * - Automatic caching and background updates
 * - Optimistic updates support
 * - Only enabled when userId is provided
 *
 * @param userId - The authenticated user's ID (optional)
 * @returns Query result with bookmarks array
 */
export function useBookmarksQuery(userId: string | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: userId ? bookmarkKeys.user(userId) : bookmarkKeys.all,
    queryFn: async () => {
      if (!userId) return [];
      return fetchBookmarks(supabase, userId);
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

type ToggleBookmarkParams = {
  guideId: string;
  userId: string;
  currentBookmarks: string[];
};

/**
 * React Query mutation hook for toggling guide bookmarks
 *
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Automatic rollback on error
 * - Cache invalidation on success
 *
 * @returns Mutation for toggling a bookmark
 */
export function useToggleBookmarkMutation() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ guideId, userId, currentBookmarks }: ToggleBookmarkParams) => {
      const isBookmarked = currentBookmarks.includes(guideId);

      if (isBookmarked) {
        await removeBookmark(supabase, userId, guideId);
        return { guideId, action: "removed" as const };
      } else {
        await addBookmark(supabase, userId, guideId);
        return { guideId, action: "added" as const };
      }
    },
    // Optimistic update - update cache immediately before API call
    onMutate: async ({ guideId, userId, currentBookmarks }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: bookmarkKeys.user(userId) });

      // Snapshot the previous value
      const previousBookmarks = queryClient.getQueryData<string[]>(
        bookmarkKeys.user(userId),
      );

      // Optimistically update to the new value
      const isBookmarked = currentBookmarks.includes(guideId);
      const newBookmarks = isBookmarked
        ? currentBookmarks.filter((id) => id !== guideId)
        : [...currentBookmarks, guideId];

      queryClient.setQueryData<string[]>(bookmarkKeys.user(userId), newBookmarks);

      // Return a context object with the snapshot
      return { previousBookmarks, userId };
    },
    // If mutation fails, roll back to the previous value
    onError: (_error, _variables, context) => {
      if (context?.previousBookmarks !== undefined && context?.userId) {
        queryClient.setQueryData<string[]>(
          bookmarkKeys.user(context.userId),
          context.previousBookmarks,
        );
      }
      logger.error("Failed to toggle bookmark, rolling back", { error: _error });
    },
    // Always refetch after error or success
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.user(variables.userId) });
    },
  });
}

/**
 * Hook that combines query and mutation for easy bookmarks management
 *
 * Usage:
 * ```tsx
 * const { bookmarks, isBookmarked, toggleBookmark, isLoading } = useBookmarks(userId);
 *
 * <button onClick={() => toggleBookmark("guide-123")}>
 *   {isBookmarked("guide-123") ? "Remove" : "Add"} Bookmark
 * </button>
 * ```
 */
export function useBookmarks(userId: string | undefined) {
  const { data: bookmarks = [], isLoading, error } = useBookmarksQuery(userId);
  const toggleMutation = useToggleBookmarkMutation();

  const isBookmarked = (guideId: string): boolean => {
    return bookmarks.includes(guideId);
  };

  const toggleBookmark = (guideId: string) => {
    if (!userId) {
      logger.warn("Cannot toggle bookmark: no user ID");
      return;
    }

    toggleMutation.mutate({
      guideId,
      userId,
      currentBookmarks: bookmarks,
    });
  };

  return {
    bookmarks,
    isBookmarked,
    toggleBookmark,
    isLoading,
    isToggling: toggleMutation.isPending,
    error: error instanceof Error ? error.message : null,
  };
}
