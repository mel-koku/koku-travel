"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import type { LocationSearchResult } from "@/app/api/locations/search/route";

/** Default debounce delay in milliseconds */
const DEFAULT_DEBOUNCE_MS = 300;

/** Minimum input length before triggering search */
const MIN_INPUT_LENGTH = 2;

/** Cache time for search results (5 minutes) */
const SEARCH_STALE_TIME = 5 * 60 * 1000;
const SEARCH_GC_TIME = 15 * 60 * 1000;

/**
 * Query key factory for location search
 */
export const locationSearchKeys = {
  all: ["location-search"] as const,
  search: (input: string) => [...locationSearchKeys.all, input] as const,
};

export type LocationSearchOptions = {
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Minimum input length to trigger search (default: 2) */
  minInputLength?: number;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
  /** Maximum number of results (default: 10) */
  limit?: number;
  /**
   * Data source for search results.
   * Currently only 'database' is implemented.
   * Future: 'api' will use Google Places API for broader coverage.
   */
  source?: "database" | "api";
};

/**
 * Fetches search results from the API
 */
async function fetchLocationSearch(
  input: string,
  limit: number
): Promise<LocationSearchResult[]> {
  const params = new URLSearchParams({
    q: input,
    limit: limit.toString(),
  });

  const response = await fetch(`/api/locations/search?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Location search API error", new Error(errorText), {
      status: response.status,
      input,
    });
    throw new Error(`Failed to search locations: ${response.status}`);
  }

  return response.json() as Promise<LocationSearchResult[]>;
}

/**
 * Hook for debounced database-backed location search
 *
 * Features:
 * - Debounces input to reduce API calls (default: 300ms)
 * - Minimum input length requirement (default: 2 characters)
 * - React Query caching (5 min stale, 15 min GC)
 * - Returns `isNotFound` flag when no results match the query
 *
 * @example
 * ```tsx
 * function LocationSearch() {
 *   const [query, setQuery] = useState("");
 *   const { data: locations, isLoading, isNotFound } = useLocationSearch(query);
 *
 *   return (
 *     <div>
 *       <input
 *         value={query}
 *         onChange={(e) => setQuery(e.target.value)}
 *         placeholder="Search locations..."
 *       />
 *       {isLoading && <div>Loading...</div>}
 *       {isNotFound && (
 *         <div>
 *           No locations found matching "{query}".
 *           This destination may not be available yet.
 *         </div>
 *       )}
 *       {locations?.map((location) => (
 *         <div key={location.id}>{location.name}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLocationSearch(
  input: string,
  options?: LocationSearchOptions
) {
  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    minInputLength = MIN_INPUT_LENGTH,
    enabled = true,
    limit = 10,
    // source is accepted but currently only 'database' is implemented
    // Future: implement 'api' source for Google Places API
    source: _source = "database",
  } = options ?? {};

  // Debounce the input value
  const [debouncedInput, setDebouncedInput] = useState(input);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(input);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [input, debounceMs]);

  // Only enable query when input meets minimum length
  const shouldFetch =
    enabled && debouncedInput.trim().length >= minInputLength;

  const query = useQuery({
    queryKey: locationSearchKeys.search(debouncedInput),
    queryFn: () => fetchLocationSearch(debouncedInput.trim(), limit),
    enabled: shouldFetch,
    staleTime: SEARCH_STALE_TIME,
    gcTime: SEARCH_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Determine if we should show "not found" state
  // Only show when: query was made, no results, not loading, not error
  const isNotFound =
    shouldFetch &&
    !query.isLoading &&
    !query.isFetching &&
    !query.isError &&
    query.data?.length === 0;

  return {
    ...query,
    /** The debounced input value being searched */
    debouncedInput,
    /** Whether input meets minimum length requirement */
    isInputValid: input.trim().length >= minInputLength,
    /** Whether we're waiting for debounce */
    isDebouncing: input !== debouncedInput,
    /** Whether the search returned no results (show "not available" message) */
    isNotFound,
  };
}

// Re-export the result type for consumers
export type { LocationSearchResult };
