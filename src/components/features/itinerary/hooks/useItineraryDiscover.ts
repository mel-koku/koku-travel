"use client";

import { useCallback, useMemo, useState } from "react";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useNearbyLocationsQuery } from "@/hooks/useLocationsQuery";
import { getCityCenterCoordinates } from "@/data/entryPoints";
import { createActivityFromLocation } from "@/lib/itinerary/createActivityFromLocation";
import type { Itinerary, ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { CityId } from "@/types/trip";
import type { DiscoverCategoryId } from "@/lib/constants/discoverCategories";

type UseItineraryDiscoverOptions = {
  model: Itinerary;
  currentDay: ItineraryDay | undefined;
  dayIndex: number;
};

export function useItineraryDiscover({
  model,
  currentDay,
  dayIndex,
}: UseItineraryDiscoverOptions) {
  const geoLocation = useCurrentLocation();
  const [category, setCategory] = useState<DiscoverCategoryId>("");
  const [openNow, setOpenNow] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | null>(null);
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);

  // Map center: user geolocation if available, otherwise current day's city center
  const cityCenter = useMemo(() => {
    const cityId = currentDay?.cityId;
    if (!cityId) return { lat: 35.6812, lng: 139.7671 }; // Tokyo fallback
    return getCityCenterCoordinates(cityId as CityId);
  }, [currentDay?.cityId]);

  const effectiveCenter = geoLocation.position ?? cityCenter;

  // As [lng, lat] for Mapbox
  const mapInitialCenter = useMemo<[number, number]>(
    () => [effectiveCenter.lng, effectiveCenter.lat],
    [effectiveCenter.lng, effectiveCenter.lat],
  );

  // Nearby locations query
  const nearbyQuery = useNearbyLocationsQuery(
    effectiveCenter.lat,
    effectiveCenter.lng,
    { category: category || undefined, openNow, radius: 3, limit: 30 },
  );

  // All location IDs already in the itinerary
  const usedLocationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const day of model.days) {
      for (const activity of day.activities) {
        if (activity.kind === "place" && activity.locationId) {
          ids.add(activity.locationId);
        }
      }
    }
    return ids;
  }, [model.days]);

  // Client-side search filter
  const filteredLocations = useMemo(() => {
    const locations = nearbyQuery.data?.data ?? [];
    if (!searchQuery.trim()) return locations;
    const q = searchQuery.toLowerCase();
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.category?.toLowerCase().includes(q) ||
        loc.cuisineType?.toLowerCase().includes(q),
    );
  }, [nearbyQuery.data?.data, searchQuery]);

  // Build a new activity from a discover location
  const buildActivity = useCallback(
    (location: Location): Extract<ItineraryActivity, { kind: "place" }> => {
      return createActivityFromLocation(location, currentDay?.activities ?? []);
    },
    [currentDay?.activities],
  );

  return {
    // Geolocation
    geoLocation,
    requestGeolocation: geoLocation.request,

    // Map
    mapInitialCenter,
    userPosition: geoLocation.position,

    // Filters
    category,
    setCategory,
    openNow,
    setOpenNow,
    searchQuery,
    setSearchQuery,

    // Data
    locations: filteredLocations,
    isLoading: nearbyQuery.isLoading,
    usedLocationIds,

    // Selection & hover
    highlightedLocationId,
    setHighlightedLocationId,
    expandedLocation,
    setExpandedLocation,

    // Activity creation
    buildActivity,

    // Day label for "Add to Day X" buttons
    dayLabel: `Day ${dayIndex + 1}`,
  };
}
