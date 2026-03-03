"use client";

import { useMemo } from "react";
import { useAllLocationsSingle } from "@/hooks/useLocationsQuery";
import type { Location } from "@/types/location";

/**
 * Wraps useAllLocationsSingle() and filters to craft-category locations only.
 * No new API endpoint — reuses the existing /api/locations/all cache.
 */
export function useCraftLocations() {
  const { locations: allLocations, total: _total, isLoading, error } = useAllLocationsSingle();

  const craftLocations = useMemo<Location[]>(() => {
    return allLocations.filter((loc: Location) => loc.category === "craft");
  }, [allLocations]);

  return {
    locations: craftLocations,
    total: craftLocations.length,
    isLoading,
    isError: !!error,
    error,
  };
}
