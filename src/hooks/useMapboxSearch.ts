"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";

/** Debounce delay in milliseconds */
const DEBOUNCE_MS = 500;

/** Minimum input length before triggering search */
const MIN_INPUT_LENGTH = 3;

/** Cache time for search results */
const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 15 * 60 * 1000;

export type MapboxSuggestion = {
  mapbox_id: string;
  name: string;
  full_address?: string;
  place_formatted?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
};

export type MapboxRetrieveResult = {
  mapbox_id: string;
  name: string;
  full_address?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
};

const mapboxSearchKeys = {
  all: ["mapbox-search"] as const,
  suggest: (input: string) =>
    [...mapboxSearchKeys.all, "suggest", input] as const,
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

/**
 * Fetch suggestions via our /api/geocode proxy (Nominatim/OpenStreetMap).
 * Free, no API key needed, supports hotel/business name search in Japan.
 */
async function fetchSuggestions(
  input: string,
): Promise<MapboxSuggestion[]> {
  const response = await fetch(
    `/api/geocode?q=${encodeURIComponent(input)}`,
  );

  if (!response.ok) return [];

  const results = (await response.json()) as NominatimResult[];

  return results.map((r) => {
    const parts = r.display_name.split(", ");
    const name = parts[0] ?? r.display_name;

    return {
      mapbox_id: String(r.place_id),
      name,
      full_address: r.display_name,
      place_formatted: parts.slice(1, 4).join(", "),
      coordinates: {
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      },
    };
  });
}

/**
 * Hook for location autocomplete search.
 *
 * Uses Nominatim (OpenStreetMap) via /api/geocode proxy — free, no API key,
 * supports hotel/business name search in Japan.
 */
export function useMapboxSearch(input: string) {
  const [debouncedInput, setDebouncedInput] = useState(input);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInput(input), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const shouldFetch = debouncedInput.trim().length >= MIN_INPUT_LENGTH;

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: mapboxSearchKeys.suggest(debouncedInput),
    queryFn: () => fetchSuggestions(debouncedInput.trim()),
    enabled: shouldFetch,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Coordinates come inline from Nominatim — retrieve just returns them
  const retrieve = useCallback(
    async (
      suggestion: MapboxSuggestion,
    ): Promise<MapboxRetrieveResult | null> => {
      if (!suggestion.coordinates) return null;

      return {
        mapbox_id: suggestion.mapbox_id,
        name: suggestion.name,
        full_address: suggestion.full_address,
        coordinates: suggestion.coordinates,
      };
    },
    [],
  );

  return {
    suggestions,
    isLoading,
    isDebouncing: input !== debouncedInput,
    retrieve,
    isAvailable: true,
  };
}
