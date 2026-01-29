"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import type { AutocompletePlace } from "@/lib/googlePlaces";
import { logger } from "@/lib/logger";

/** Default debounce delay in milliseconds */
const DEFAULT_DEBOUNCE_MS = 300;

/** Minimum input length before triggering search */
const MIN_INPUT_LENGTH = 2;

/** Cache time for autocomplete results (5 minutes) */
const AUTOCOMPLETE_STALE_TIME = 5 * 60 * 1000;
const AUTOCOMPLETE_GC_TIME = 15 * 60 * 1000;

/**
 * Query key factory for places autocomplete
 */
export const placesAutocompleteKeys = {
  all: ["places-autocomplete"] as const,
  search: (input: string, options?: PlacesAutocompleteOptions) =>
    [...placesAutocompleteKeys.all, input, options] as const,
};

export type PlacesAutocompleteOptions = {
  /** Language code for results (default: "en") */
  languageCode?: string;
  /** Region code for results (default: "JP") */
  regionCode?: string;
  /** Filter by place types (e.g., ["restaurant", "cafe"]) */
  includedPrimaryTypes?: string[];
  /** Bias results toward a circular area */
  locationBias?: {
    circle?: {
      center: { latitude: number; longitude: number };
      radius: number;
    };
  };
  /** Restrict results to a rectangular area */
  locationRestriction?: {
    rectangle?: {
      low: { latitude: number; longitude: number };
      high: { latitude: number; longitude: number };
    };
  };
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Minimum input length to trigger search (default: 2) */
  minInputLength?: number;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
};

type AutocompleteResponse = {
  places: AutocompletePlace[];
};

/**
 * Fetches autocomplete suggestions from the API
 */
async function fetchAutocomplete(
  input: string,
  options?: Omit<PlacesAutocompleteOptions, "debounceMs" | "minInputLength" | "enabled">,
): Promise<AutocompletePlace[]> {
  const response = await fetch("/api/places/autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input,
      languageCode: options?.languageCode,
      regionCode: options?.regionCode,
      includedPrimaryTypes: options?.includedPrimaryTypes,
      locationBias: options?.locationBias,
      locationRestriction: options?.locationRestriction,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Places autocomplete API error", new Error(errorText), {
      status: response.status,
      input,
    });
    throw new Error(`Failed to fetch autocomplete: ${response.status}`);
  }

  const data = (await response.json()) as AutocompleteResponse;
  return data.places;
}

/**
 * Hook for debounced Google Places autocomplete
 *
 * Features:
 * - Debounces input to reduce API calls (default: 300ms)
 * - Minimum input length requirement (default: 2 characters)
 * - React Query caching (5 min stale, 15 min GC)
 * - Supports location bias/restriction for regional results
 *
 * @example
 * ```tsx
 * function PlaceSearch() {
 *   const [query, setQuery] = useState("");
 *   const { data: places, isLoading } = usePlacesAutocomplete(query, {
 *     locationRestriction: {
 *       rectangle: {
 *         low: { latitude: 24.0, longitude: 122.0 },   // SW Japan
 *         high: { latitude: 46.0, longitude: 154.0 }, // NE Japan
 *       },
 *     },
 *   });
 *
 *   return (
 *     <input
 *       value={query}
 *       onChange={(e) => setQuery(e.target.value)}
 *       placeholder="Search places..."
 *     />
 *     {places?.map((place) => (
 *       <div key={place.placeId}>{place.displayName}</div>
 *     ))}
 *   );
 * }
 * ```
 */
export function usePlacesAutocomplete(
  input: string,
  options?: PlacesAutocompleteOptions,
) {
  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    minInputLength = MIN_INPUT_LENGTH,
    enabled = true,
    ...queryOptions
  } = options ?? {};

  // Debounce the input value
  const [debouncedInput, setDebouncedInput] = useState(input);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(input);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [input, debounceMs]);

  // Memoize query options to prevent unnecessary re-renders
  const stableQueryOptions = useMemo(
    () => queryOptions,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(queryOptions)],
  );

  // Only enable query when input meets minimum length
  const shouldFetch =
    enabled && debouncedInput.trim().length >= minInputLength;

  const query = useQuery({
    queryKey: placesAutocompleteKeys.search(debouncedInput, stableQueryOptions),
    queryFn: () => fetchAutocomplete(debouncedInput.trim(), stableQueryOptions),
    enabled: shouldFetch,
    staleTime: AUTOCOMPLETE_STALE_TIME,
    gcTime: AUTOCOMPLETE_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    /** The debounced input value being searched */
    debouncedInput,
    /** Whether input meets minimum length requirement */
    isInputValid: input.trim().length >= minInputLength,
    /** Whether we're waiting for debounce */
    isDebouncing: input !== debouncedInput,
  };
}
