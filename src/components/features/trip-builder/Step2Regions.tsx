"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { REGIONS, CITY_TO_REGION } from "@/data/regions";
import { cn } from "@/lib/cn";
import type { CityId, RegionId } from "@/types/trip";

export type Step2RegionsProps = {
  formId: string;
  onNext: () => void;
  onValidityChange: (isValid: boolean) => void;
};

const CITY_ORDER = REGIONS.flatMap((region) => region.cities.map((city) => city.id));
const CITY_ORDER_MAP = CITY_ORDER.reduce<Record<CityId, number>>((acc, cityId, index) => {
  acc[cityId] = index;
  return acc;
}, {} as Record<CityId, number>);

const REGION_ORDER_MAP = REGIONS.reduce<Record<RegionId, number>>((acc, region, index) => {
  acc[region.id] = index;
  return acc;
}, {} as Record<RegionId, number>);

export function Step2Regions({ formId, onNext, onValidityChange }: Step2RegionsProps) {
  const { data, setData } = useTripBuilder();
  const [searchTerm, setSearchTerm] = useState("");

  const selectedCities = useMemo(
    () => (data.cities && data.cities.length > 0 ? sortCityIds(data.cities) : []),
    [data.cities],
  );
  const selectedRegions = useMemo(
    () => (data.regions && data.regions.length > 0 ? sortRegionIds(data.regions) : []),
    [data.regions],
  );
  const selectedCitiesSet = useMemo(() => new Set<CityId>(selectedCities), [selectedCities]);

  useEffect(() => {
    onValidityChange(selectedCities.length > 0);
  }, [onValidityChange, selectedCities.length]);

  const applySelection = useCallback(
    (mutator: (working: Set<CityId>) => void) => {
      setData((prev) => {
        const working = new Set<CityId>(prev.cities ?? []);
        mutator(working);
        const nextCities = sortCityIds(working);
        const nextRegions = deriveRegionIds(nextCities);
        return {
          ...prev,
          cities: nextCities,
          regions: nextRegions,
        };
      });
    },
    [setData],
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
    (regionId: RegionId) => {
      const region = REGIONS.find((entry) => entry.id === regionId);
      if (!region) {
        return;
      }
      applySelection((working) => {
        const allSelected = region.cities.every((city) => working.has(city.id));
        region.cities.forEach((city) => {
          if (allSelected) {
            working.delete(city.id);
          } else {
            working.add(city.id);
          }
        });
      });
    },
    [applySelection],
  );

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  const filteredRegions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return REGIONS.map((region) => ({
        ...region,
        filteredCities: region.cities,
      }));
    }
    return REGIONS.map((region) => {
      const filteredCities = region.cities.filter((city) =>
        city.name.toLowerCase().includes(term),
      );
      return {
        ...region,
        filteredCities,
      };
    }).filter((region) => region.filteredCities.length > 0);
  }, [searchTerm]);

  const hasMatches = filteredRegions.some((region) => region.filteredCities.length > 0);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setData((prev) => ({
        ...prev,
        cities: arraysEqual(prev.cities, selectedCities) ? prev.cities : sortCityIds(selectedCities),
        regions: arraysEqual(prev.regions, selectedRegions)
          ? prev.regions
          : sortRegionIds(selectedRegions),
      }));
      onNext();
    },
    [onNext, selectedCities, selectedRegions, setData],
  );

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

          <div className="grid gap-6">
            {filteredRegions.map((region) => {
              const totalCities = region.cities.length;
              const selectedCount = region.cities.filter((city) =>
                selectedCitiesSet.has(city.id),
              ).length;
              const hasSelection = selectedCount > 0;
              const allSelected = selectedCount === totalCities && totalCities > 0;

              return (
                <fieldset
                  key={region.id}
                  className={cn(
                    "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition",
                    hasSelection && "border-indigo-200 ring-1 ring-inset ring-indigo-100",
                  )}
                >
                  <legend className="mb-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleRegion(region.id)}
                      aria-pressed={hasSelection}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-left text-lg font-semibold text-gray-900 transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                        hasSelection ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-100",
                      )}
                    >
                      {region.name}
                    </button>
                    <span className="text-sm text-gray-500">
                      {selectedCount}/{totalCities} selected
                    </span>
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {region.filteredCities.map((city) => {
                      const isSelected = selectedCitiesSet.has(city.id);
                      return (
                        <Checkbox
                          key={city.id}
                          label={city.name}
                          checked={isSelected}
                          onChange={() => handleToggleCity(city.id)}
                          containerClassName={cn(
                            "border border-gray-200 bg-white",
                            isSelected && "border-indigo-200 bg-indigo-50 ring-1 ring-inset ring-indigo-100",
                          )}
                        />
                      );
                    })}
                    {region.filteredCities.length === 0 && (
                      <p className="text-sm text-gray-500">No cities match this search.</p>
                    )}
                  </div>
                  {allSelected && (
                    <p className="mt-3 text-xs text-indigo-600">
                      All cities in {region.name} are selected.
                    </p>
                  )}
                </fieldset>
              );
            })}
          </div>
        </div>
      </section>
    </form>
  );
}

function sortCityIds(cityIds: Iterable<CityId>): CityId[] {
  return Array.from(new Set(cityIds)).sort((a, b) => CITY_ORDER_MAP[a] - CITY_ORDER_MAP[b]);
}

function sortRegionIds(regionIds: Iterable<RegionId>): RegionId[] {
  const order = Array.from(new Set(regionIds));
  order.sort((a, b) => REGION_ORDER_MAP[a] - REGION_ORDER_MAP[b]);
  return order;
}

function deriveRegionIds(cityIds: CityId[]): RegionId[] {
  const regionSet = new Set<RegionId>();
  cityIds.forEach((cityId) => {
    const regionId = CITY_TO_REGION[cityId];
    if (regionId) {
      regionSet.add(regionId);
    }
  });
  return sortRegionIds(regionSet);
}

function arraysEqual<T>(a: readonly T[] | undefined, b: readonly T[]): boolean {
  if (!a || a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

function getCityName(cityId: CityId) {
  for (const region of REGIONS) {
    const match = region.cities.find((city) => city.id === cityId);
    if (match) {
      return match.name;
    }
  }
  return cityId;
}


