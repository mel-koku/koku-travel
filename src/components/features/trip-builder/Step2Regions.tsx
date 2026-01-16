"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/Input";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { cn } from "@/lib/cn";
import type { CityId, CityOption, RegionId } from "@/types/trip";
import { logger } from "@/lib/logger";

export type Step2RegionsProps = {
  formId: string;
  onNext: () => void;
  onValidityChange: (isValid: boolean) => void;
};

type GroupedCities = {
  region: string;
  cities: CityOption[];
};

export function Step2Regions({ formId, onNext, onValidityChange }: Step2RegionsProps) {
  const { data, setData } = useTripBuilder();
  const [searchTerm, setSearchTerm] = useState("");
  const [cities, setCities] = useState<CityOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

  // Fetch cities from API
  useEffect(() => {
    let cancelled = false;

    async function fetchCities() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/cities");

        if (!response.ok) {
          throw new Error(`Failed to fetch cities: ${response.status}`);
        }

        const data = await response.json();

        if (cancelled) return;

        setCities(data.cities || []);
      } catch (err) {
        if (cancelled) return;
        logger.error("Failed to fetch cities", err);
        setError("Failed to load cities. Please try again.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchCities();

    return () => {
      cancelled = true;
    };
  }, []);

  // City name lookup map
  const cityNameMap = useMemo(() => {
    const map = new Map<string, string>();
    cities.forEach((city) => {
      map.set(city.id, city.name);
    });
    return map;
  }, [cities]);

  const selectedCities = useMemo(
    () => (data.cities && data.cities.length > 0 ? [...data.cities] : []),
    [data.cities],
  );

  const selectedCitiesSet = useMemo(() => new Set<CityId>(selectedCities), [selectedCities]);

  useEffect(() => {
    onValidityChange(selectedCities.length > 0);
  }, [onValidityChange, selectedCities.length]);

  // Group cities by region
  const groupedCities = useMemo((): GroupedCities[] => {
    const groups = new Map<string, CityOption[]>();

    cities.forEach((city) => {
      const existing = groups.get(city.region) || [];
      existing.push(city);
      groups.set(city.region, existing);
    });

    return Array.from(groups.entries())
      .map(([region, cities]) => ({
        region,
        cities: cities.sort((a, b) => b.locationCount - a.locationCount),
      }))
      .sort((a, b) => {
        // Sort regions by total location count
        const countA = a.cities.reduce((sum, c) => sum + c.locationCount, 0);
        const countB = b.cities.reduce((sum, c) => sum + c.locationCount, 0);
        return countB - countA;
      });
  }, [cities]);

  // Derive regions from selected cities
  const deriveRegionIds = useCallback((cityIds: CityId[]): RegionId[] => {
    const regionSet = new Set<RegionId>();
    cityIds.forEach((cityId) => {
      const city = cities.find((c) => c.id === cityId);
      if (city) {
        regionSet.add(city.region);
      }
    });
    return Array.from(regionSet);
  }, [cities]);

  const applySelection = useCallback(
    (mutator: (working: Set<CityId>) => void) => {
      setData((prev) => {
        const working = new Set<CityId>(prev.cities ?? []);
        mutator(working);
        const nextCities = Array.from(working);
        const nextRegions = deriveRegionIds(nextCities);
        return {
          ...prev,
          cities: nextCities,
          regions: nextRegions,
        };
      });
    },
    [setData, deriveRegionIds],
  );

  const handleToggleCity = useCallback(
    (cityId: CityId) => {
      applySelection((working) => {
        if (working.has(cityId)) {
          working.delete(cityId);
        } else {
          working.add(cityId);
        }
      });
    },
    [applySelection],
  );

  const handleRemoveCity = useCallback(
    (cityId: CityId) => {
      applySelection((working) => {
        working.delete(cityId);
      });
    },
    [applySelection],
  );

  const handleToggleRegion = useCallback(
    (regionName: string) => {
      const regionCities = cities.filter((c) => c.region === regionName);
      if (regionCities.length === 0) return;

      applySelection((working) => {
        const allSelected = regionCities.every((city) => working.has(city.id));
        regionCities.forEach((city) => {
          if (allSelected) {
            working.delete(city.id);
          } else {
            working.add(city.id);
          }
        });
      });
    },
    [applySelection, cities],
  );

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  const toggleRegionExpanded = useCallback((region: string) => {
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

  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return groupedCities;
    }
    return groupedCities
      .map((group) => ({
        ...group,
        cities: group.cities.filter((city) =>
          city.name.toLowerCase().includes(term),
        ),
      }))
      .filter((group) => group.cities.length > 0);
  }, [searchTerm, groupedCities]);

  const hasMatches = filteredGroups.some((group) => group.cities.length > 0);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onNext();
    },
    [onNext],
  );

  const getCityName = useCallback(
    (cityId: CityId): string => {
      return cityNameMap.get(cityId) || cityId;
    },
    [cityNameMap],
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-10 lg:flex-row">
        <aside className="flex w-full flex-col gap-6 lg:w-72">
          <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
        </aside>
        <section className="flex-1">
          <div className="flex flex-col gap-6">
            <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
            <div className="grid gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-gray-200 p-6">
                  <div className="mb-4 h-8 w-32 animate-pulse rounded bg-gray-100" />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="rounded-xl border border-gray-200 p-3">
                        <div className="mb-3 flex gap-1">
                          {[1, 2, 3].map((k) => (
                            <div key={k} className="h-16 w-16 animate-pulse rounded-lg bg-gray-100" />
                          ))}
                        </div>
                        <div className="h-5 w-24 animate-pulse rounded bg-gray-100" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm font-medium text-red-800">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="flex h-full flex-col gap-10 lg:flex-row"
      noValidate
    >
      <aside className="flex w-full flex-col gap-6 lg:w-72">
        <div>
          <label htmlFor={`${formId}-search`} className="text-sm font-semibold text-gray-900">
            Quick search
          </label>
          <p className="mt-1 text-sm text-gray-500">
            Filter cities by name to jump straight to the right spot.
          </p>
          <Input
            id={`${formId}-search`}
            type="search"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search cities"
            className="mt-3"
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900">Selected cities</p>
          {selectedCities.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedCities.map((cityId) => (
                <button
                  key={cityId}
                  type="button"
                  onClick={() => handleRemoveCity(cityId)}
                  aria-label={`Remove ${getCityName(cityId)}`}
                  className="group inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  {getCityName(cityId)}
                  <span
                    aria-hidden="true"
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-300 text-[10px] text-gray-700 transition group-hover:bg-gray-400"
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No cities selected yet.</p>
          )}
        </div>

        <p className="text-sm text-gray-600">
          Choose at least one city. You can add more later.
        </p>
      </aside>

      <section className="flex-1">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Regions &amp; Cities</h2>
              <p className="mt-2 text-sm text-gray-600">
                Explore at your pace. Toggle a region to select everything inside, or pick cities
                one by one.
              </p>
            </div>
            <div className="hidden text-right text-sm text-gray-500 lg:block">
              <p>{selectedCities.length} city{selectedCities.length === 1 ? "" : "ies"} selected</p>
            </div>
          </div>

          {!hasMatches && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
              No cities found. Try a different search term.
            </div>
          )}

          <div className="grid gap-3">
            {filteredGroups.map((group) => {
              const totalCities = group.cities.length;
              const selectedCount = group.cities.filter((city) =>
                selectedCitiesSet.has(city.id),
              ).length;
              const hasSelection = selectedCount > 0;
              const isExpanded = expandedRegions.has(group.region);

              return (
                <div
                  key={group.region}
                  className={cn(
                    "rounded-xl border bg-white shadow-sm transition",
                    hasSelection ? "border-indigo-200" : "border-gray-200",
                  )}
                >
                  {/* Region header - clickable to expand/collapse */}
                  <button
                    type="button"
                    onClick={() => toggleRegionExpanded(group.region)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                  >
                    <div className="flex items-center gap-3">
                      {/* Chevron icon */}
                      <svg
                        className={cn(
                          "h-5 w-5 text-gray-400 transition-transform duration-200",
                          isExpanded && "rotate-90",
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      <span className={cn(
                        "text-base font-semibold",
                        hasSelection ? "text-indigo-700" : "text-gray-900",
                      )}>
                        {group.region}
                      </span>
                      {hasSelection && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          {selectedCount} selected
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {totalCities} cities
                    </span>
                  </button>

                  {/* Collapsible content */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 py-4">
                      <div className="mb-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleToggleRegion(group.region)}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          {selectedCount === totalCities ? "Deselect all" : "Select all"}
                        </button>
                        <span className="text-xs text-gray-500">
                          {selectedCount}/{totalCities} selected
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.cities.map((city) => {
                          const isSelected = selectedCitiesSet.has(city.id);
                          return (
                            <CityCard
                              key={city.id}
                              city={city}
                              isSelected={isSelected}
                              onToggle={() => handleToggleCity(city.id)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </form>
  );
}

type CityCardProps = {
  city: CityOption;
  isSelected: boolean;
  onToggle: () => void;
};

function CityCard({ city, isSelected, onToggle }: CityCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
        isSelected
          ? "border-indigo-300 bg-indigo-100 text-indigo-900"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
      )}
    >
      {/* Checkbox indicator */}
      <div
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition",
          isSelected
            ? "border-indigo-600 bg-indigo-600 text-white"
            : "border-gray-300 bg-white group-hover:border-gray-400",
        )}
      >
        {isSelected && (
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="whitespace-nowrap font-medium">
        {city.name}
        <span className={cn(
          "ml-1 font-normal",
          isSelected ? "text-indigo-600" : "text-gray-500",
        )}>
          ({city.locationCount})
        </span>
      </span>
    </button>
  );
}
