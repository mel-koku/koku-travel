"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { getCitiesByRelevance, getAllCities } from "@/lib/tripBuilder/cityRelevance";
import { cn } from "@/lib/cn";
import type { InterestId } from "@/types/trip";
import { Input } from "@/components/ui/Input";
import { calculateDistance } from "@/data/entryPoints";

type CityWithRelevance = {
  city: string;
  relevance: number;
  matchingLocationCount: number;
  locationCount: number;
  coordinates?: { lat: number; lng: number };
  region?: string;
  interestCounts: Record<string, number>;
};

type FilterMode = "all" | "highMatch" | "selected";

const CITIES_PER_REGION = 8;
const HIGH_MATCH_THRESHOLD = 75;
const NEAR_ARRIVAL_THRESHOLD_KM = 100;

export type CityListProps = {
  onCitySelect?: (city: string) => void;
};

export function CityList({ onCitySelect }: CityListProps) {
  const { data, setData } = useTripBuilder();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [showAllCities, setShowAllCities] = useState<Set<string>>(new Set());

  const selectedInterests = useMemo<InterestId[]>(
    () => data.interests ?? [],
    [data.interests]
  );

  const selectedCities = useMemo<Set<string>>(
    () => new Set(data.cities ?? []),
    [data.cities]
  );

  const hasInterests = selectedInterests.length > 0;

  // Get entry point directly from builder data (works for both predefined and custom entry points)
  const entryPoint = data.entryPoint;

  // Get cities with relevance data - moved up so we can use it for region detection
  const allCities = useMemo<CityWithRelevance[]>(() => {
    if (hasInterests) {
      return getCitiesByRelevance(selectedInterests);
    }
    return getAllCities().map((c) => ({
      city: c.city,
      relevance: 0,
      matchingLocationCount: 0,
      locationCount: c.locationCount,
      coordinates: c.coordinates,
      region: c.region,
      interestCounts: {} as Record<string, number>,
    }));
  }, [selectedInterests, hasInterests]);

  // Find the entry point's region by finding the nearest city from our city data
  const entryPointRegionName = useMemo(() => {
    if (!entryPoint?.coordinates) return undefined;

    let nearestCity: CityWithRelevance | undefined;
    let minDistance = Infinity;

    for (const city of allCities) {
      if (!city.coordinates) continue;
      const distance = calculateDistance(entryPoint.coordinates, city.coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    }

    return nearestCity?.region;
  }, [entryPoint, allCities]);

  // Helper to check if a city is near the entry point
  const isNearEntryPoint = useCallback(
    (cityCoordinates: { lat: number; lng: number } | undefined, cityRegion: string | undefined): boolean => {
      if (!entryPoint) return false;

      // Check if same region
      if (entryPointRegionName && cityRegion === entryPointRegionName) {
        return true;
      }

      // Check distance threshold
      if (cityCoordinates) {
        const distanceMeters = calculateDistance(entryPoint.coordinates, cityCoordinates);
        return distanceMeters <= NEAR_ARRIVAL_THRESHOLD_KM * 1000;
      }

      return false;
    },
    [entryPoint, entryPointRegionName]
  );

  // Auto-expand entry point's region
  useEffect(() => {
    if (entryPointRegionName) {
      setExpandedRegions((prev) => {
        if (prev.has(entryPointRegionName)) return prev;
        return new Set([...prev, entryPointRegionName]);
      });
    }
  }, [entryPointRegionName]);

  // Filter cities based on filter mode and search query
  const filteredCities = useMemo(() => {
    let cities = allCities;

    // Apply filter mode
    if (filterMode === "highMatch") {
      cities = cities.filter((c) => c.relevance >= HIGH_MATCH_THRESHOLD);
    } else if (filterMode === "selected") {
      cities = cities.filter((c) => selectedCities.has(c.city));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      cities = cities.filter(
        (c) =>
          c.city.toLowerCase().includes(query) ||
          c.region?.toLowerCase().includes(query)
      );
    }

    return cities;
  }, [allCities, filterMode, searchQuery, selectedCities]);

  // Group cities by region
  const groupedCities = useMemo(() => {
    const groups: Record<string, typeof filteredCities> = {};
    for (const city of filteredCities) {
      const region = city.region ?? "Other";
      if (!groups[region]) {
        groups[region] = [];
      }
      groups[region].push(city);
    }

    // Sort cities within each region by matching location count (primary), then distance (tiebreaker)
    for (const region of Object.keys(groups)) {
      groups[region]?.sort((a, b) => {
        // Primary sort: by matching location count (descending)
        if (b.matchingLocationCount !== a.matchingLocationCount) {
          return b.matchingLocationCount - a.matchingLocationCount;
        }

        // Secondary sort: by total location count (descending)
        if (b.locationCount !== a.locationCount) {
          return b.locationCount - a.locationCount;
        }

        // Tertiary sort: by distance from entry point (if available)
        if (entryPoint && a.coordinates && b.coordinates) {
          const distA = calculateDistance(entryPoint.coordinates, a.coordinates);
          const distB = calculateDistance(entryPoint.coordinates, b.coordinates);
          return distA - distB;
        }

        return 0;
      });
    }

    // Sort regions: entry point region first, then by total location count
    const sortedRegions = Object.keys(groups).sort((a, b) => {
      // Entry point region comes first
      if (entryPointRegionName) {
        if (a === entryPointRegionName && b !== entryPointRegionName) return -1;
        if (b === entryPointRegionName && a !== entryPointRegionName) return 1;
      }

      const aTotal = (groups[a] ?? []).reduce((sum, c) => sum + c.locationCount, 0);
      const bTotal = (groups[b] ?? []).reduce((sum, c) => sum + c.locationCount, 0);
      return bTotal - aTotal;
    });

    return sortedRegions.map((region) => ({
      region,
      cities: groups[region] ?? [],
    }));
  }, [filteredCities, entryPoint, entryPointRegionName]);

  // Count selected cities per region (from all cities, not filtered)
  const selectedByRegion = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const city of allCities) {
      if (selectedCities.has(city.city)) {
        const region = city.region ?? "Other";
        counts[region] = (counts[region] ?? 0) + 1;
      }
    }
    return counts;
  }, [allCities, selectedCities]);


  const toggleRegion = useCallback((region: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) {
        next.delete(region);
      } else {
        next.add(region);
      }
      return next;
    });
  }, []);

  const expandShowAllCities = useCallback((region: string) => {
    setShowAllCities((prev) => new Set([...prev, region]));
  }, []);

  // Determine if we're in search mode (all regions expanded, all cities shown)
  const isSearching = searchQuery.trim().length > 0;

  const toggleCity = useCallback(
    (city: string) => {
      setData((prev) => {
        const current = new Set(prev.cities ?? []);
        if (current.has(city)) {
          current.delete(city);
        } else {
          current.add(city);
        }
        return {
          ...prev,
          cities: Array.from(current),
        };
      });
      onCitySelect?.(city);
    },
    [setData, onCitySelect]
  );

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-background">
      {/* Search */}
      <div className="border-b border-border p-3">
        <Input
          id="city-search"
          type="text"
          placeholder="Search cities or regions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="min-h-[40px]"
        />
      </div>

      {/* Filter Toggles */}
      <div className="border-b border-border px-3 py-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              filterMode === "all"
                ? "border-sage/30 bg-sage/10 text-sage"
                : "border-border text-foreground-secondary hover:bg-surface"
            )}
          >
            All
          </button>
          <button
            type="button"
            disabled={!hasInterests}
            onClick={() => setFilterMode("highMatch")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              filterMode === "highMatch"
                ? "border-sage/30 bg-sage/10 text-sage"
                : "border-border text-foreground-secondary hover:bg-surface",
              !hasInterests && "cursor-not-allowed opacity-50"
            )}
            title={!hasInterests ? "Select interests first to filter by match" : undefined}
          >
            High Match
          </button>
          <button
            type="button"
            disabled={selectedCities.size === 0}
            onClick={() => setFilterMode("selected")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              filterMode === "selected"
                ? "border-sage/30 bg-sage/10 text-sage"
                : "border-border text-foreground-secondary hover:bg-surface",
              selectedCities.size === 0 && "cursor-not-allowed opacity-50"
            )}
            title={selectedCities.size === 0 ? "No cities selected" : undefined}
          >
            Selected ({selectedCities.size})
          </button>
        </div>
      </div>

      {/* Selected cities summary */}
      {selectedCities.size > 0 && (
        <div className="border-b border-border bg-sage/10 px-4 py-2">
          <div className="flex flex-wrap gap-1.5">
            {Array.from(selectedCities).map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => toggleCity(city)}
                className="inline-flex items-center gap-1 rounded-full bg-brand-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-primary/90"
              >
                {city}
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* City list */}
      <div className="flex-1 overflow-y-auto">
        {groupedCities.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <div className="text-center">
              <p className="text-sm text-stone">
                {filterMode === "highMatch"
                  ? "No cities with 75%+ match found"
                  : filterMode === "selected"
                  ? "No cities selected"
                  : `No cities found matching "${searchQuery}"`}
              </p>
              {filterMode !== "all" && (
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className="mt-2 text-sm text-sage hover:text-sage/80"
                >
                  Show all cities
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {groupedCities.map(({ region, cities }) => {
              const isExpanded = isSearching || expandedRegions.has(region);
              const shouldShowAll = isSearching || showAllCities.has(region);
              const visibleCities = shouldShowAll
                ? cities
                : cities.slice(0, CITIES_PER_REGION);
              const hiddenCount = cities.length - CITIES_PER_REGION;
              const selectedInRegion = selectedByRegion[region] ?? 0;

              return (
                <div key={region} className="py-2">
                  {/* Collapsible Region Header */}
                  <button
                    type="button"
                    onClick={() => toggleRegion(region)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-surface"
                  >
                    <div className="flex items-center gap-2">
                      {/* Chevron */}
                      <svg
                        className={cn(
                          "h-4 w-4 text-stone transition-transform",
                          isExpanded && "rotate-90"
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <span className="text-sm font-semibold text-foreground-secondary">
                        {region}
                      </span>
                      <span className="text-xs text-stone">
                        ({cities.length} cities)
                      </span>
                    </div>
                    {selectedInRegion > 0 && (
                      <span className="rounded-full bg-sage/10 px-2 py-0.5 text-xs font-medium text-sage">
                        {selectedInRegion} selected
                      </span>
                    )}
                  </button>

                  {/* Cities in Region */}
                  {isExpanded && (
                    <div className="space-y-0.5">
                      {visibleCities.map((city) => {
                        const isSelected = selectedCities.has(city.city);
                        return (
                          <button
                            key={city.city}
                            type="button"
                            onClick={() => toggleCity(city.city)}
                            className={cn(
                              "flex w-full items-center justify-between px-4 py-2.5 pl-10 text-left transition hover:bg-surface",
                              isSelected && "bg-sage/10 hover:bg-sage/20"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {/* Checkbox indicator */}
                              <div
                                className={cn(
                                  "flex h-5 w-5 items-center justify-center rounded border transition",
                                  isSelected
                                    ? "border-brand-primary bg-brand-primary"
                                    : "border-border bg-background"
                                )}
                              >
                                {isSelected && (
                                  <svg
                                    className="h-3 w-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "font-medium",
                                    isSelected ? "text-foreground" : "text-foreground"
                                  )}
                                >
                                  {city.city}
                                </span>
                                <span className="text-xs text-stone">
                                  {city.locationCount} locations
                                </span>
                                {isNearEntryPoint(city.coordinates, city.region) && (
                                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                                    Near entry point
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Relevance badge */}
                            {hasInterests && city.relevance > 0 && (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  city.relevance >= 75
                                    ? "bg-success/10 text-success"
                                    : city.relevance >= 50
                                    ? "bg-warning/10 text-warning"
                                    : "bg-surface text-foreground-secondary"
                                )}
                              >
                                {city.relevance}% match
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {/* Show More Button */}
                      {!shouldShowAll && hiddenCount > 0 && (
                        <button
                          type="button"
                          onClick={() => expandShowAllCities(region)}
                          className="w-full rounded-lg py-2 pl-10 text-left text-sm text-sage hover:bg-sage/10 hover:text-sage/80"
                        >
                          Show {hiddenCount} more cities...
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
