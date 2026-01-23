"use client";

import { useCallback, useMemo, useState } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { getCitiesByRelevance, getAllCities } from "@/lib/tripBuilder/cityRelevance";
import { cn } from "@/lib/cn";
import type { InterestId } from "@/types/trip";
import { Input } from "@/components/ui/Input";

type CityWithRelevance = {
  city: string;
  relevance: number;
  locationCount: number;
  coordinates?: { lat: number; lng: number };
  region?: string;
  interestCounts: Record<string, number>;
};

type FilterMode = "all" | "highMatch" | "selected";

const CITIES_PER_REGION = 8;
const HIGH_MATCH_THRESHOLD = 75;

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

  // Get cities with relevance data
  const allCities = useMemo<CityWithRelevance[]>(() => {
    if (hasInterests) {
      return getCitiesByRelevance(selectedInterests);
    }
    return getAllCities().map((c) => ({
      city: c.city,
      relevance: 0,
      locationCount: c.locationCount,
      coordinates: c.coordinates,
      region: c.region,
      interestCounts: {} as Record<string, number>,
    }));
  }, [selectedInterests, hasInterests]);

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

    // Sort regions by total relevance/location count
    const sortedRegions = Object.keys(groups).sort((a, b) => {
      const aTotal = (groups[a] ?? []).reduce((sum, c) => sum + c.locationCount, 0);
      const bTotal = (groups[b] ?? []).reduce((sum, c) => sum + c.locationCount, 0);
      return bTotal - aTotal;
    });

    return sortedRegions.map((region) => ({
      region,
      cities: groups[region] ?? [],
    }));
  }, [filteredCities]);

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
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white">
      {/* Search */}
      <div className="border-b border-gray-200 p-3">
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
      <div className="border-b border-gray-200 px-3 py-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              filterMode === "all"
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
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
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50",
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
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50",
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
        <div className="border-b border-gray-200 bg-indigo-50 px-4 py-2">
          <div className="flex flex-wrap gap-1.5">
            {Array.from(selectedCities).map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => toggleCity(city)}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
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
              <p className="text-sm text-gray-500">
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
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Show all cities
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
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
                    className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      {/* Chevron */}
                      <svg
                        className={cn(
                          "h-4 w-4 text-gray-500 transition-transform",
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
                      <span className="text-sm font-semibold text-gray-700">
                        {region}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({cities.length} cities)
                      </span>
                    </div>
                    {selectedInRegion > 0 && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
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
                              "flex w-full items-center justify-between px-4 py-2.5 pl-10 text-left transition hover:bg-gray-50",
                              isSelected && "bg-indigo-50 hover:bg-indigo-100"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {/* Checkbox indicator */}
                              <div
                                className={cn(
                                  "flex h-5 w-5 items-center justify-center rounded border transition",
                                  isSelected
                                    ? "border-indigo-600 bg-indigo-600"
                                    : "border-gray-300 bg-white"
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

                              <div>
                                <span
                                  className={cn(
                                    "font-medium",
                                    isSelected ? "text-indigo-900" : "text-gray-900"
                                  )}
                                >
                                  {city.city}
                                </span>
                                <span className="ml-2 text-xs text-gray-500">
                                  {city.locationCount} locations
                                </span>
                              </div>
                            </div>

                            {/* Relevance badge */}
                            {hasInterests && city.relevance > 0 && (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  city.relevance >= 75
                                    ? "bg-green-100 text-green-700"
                                    : city.relevance >= 50
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-gray-100 text-gray-600"
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
                          className="w-full rounded-lg py-2 pl-10 text-left text-sm text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800"
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
