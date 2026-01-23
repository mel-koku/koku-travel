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

export type CityListProps = {
  onCitySelect?: (city: string) => void;
};

export function CityList({ onCitySelect }: CityListProps) {
  const { data, setData } = useTripBuilder();
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filter cities based on search query
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) {
      return allCities;
    }
    const query = searchQuery.toLowerCase().trim();
    return allCities.filter(
      (c) =>
        c.city.toLowerCase().includes(query) ||
        c.region?.toLowerCase().includes(query)
    );
  }, [allCities, searchQuery]);

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
            <p className="text-sm text-gray-500">
              No cities found matching "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groupedCities.map(({ region, cities }) => (
              <div key={region} className="py-2">
                <div className="px-4 py-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {region}
                  </h4>
                </div>
                <div className="space-y-0.5">
                  {cities.map((city) => {
                    const isSelected = selectedCities.has(city.city);
                    return (
                      <button
                        key={city.city}
                        type="button"
                        onClick={() => toggleCity(city.city)}
                        className={cn(
                          "flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-gray-50",
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
