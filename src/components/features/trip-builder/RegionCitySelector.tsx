"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { getAllCities } from "@/lib/tripBuilder/cityRelevance";
import {
  getPrefectureForCity,
  getPrefecturesForRegion,
  regionHasMultiplePrefectures,
} from "@/data/prefectures";
import type { CityId } from "@/types/trip";

type CityEntry = {
  city: string;
  locationCount: number;
  coordinates?: { lat: number; lng: number };
  region?: string;
};

type PrefectureGroup = {
  prefecture: string;
  cities: CityEntry[];
};

type RegionCitySelectorProps = {
  regionName: string;
  selectedCities: Set<CityId>;
  onToggleCity: (cityId: CityId) => void;
  /** "desktop" uses taller max-height, "mobile" uses shorter */
  variant?: "desktop" | "mobile";
};

export function RegionCitySelector({
  regionName,
  selectedCities,
  onToggleCity,
  variant = "desktop",
}: RegionCitySelectorProps) {
  const [search, setSearch] = useState("");

  // All cities in this region, sorted by locationCount descending (default from getAllCities)
  const regionCities = useMemo(() => {
    const all = getAllCities();
    return all.filter(
      (c) => c.region?.toLowerCase() === regionName.toLowerCase()
    );
  }, [regionName]);

  // Filter by search query
  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return regionCities;
    return regionCities.filter((c) => c.city.toLowerCase().includes(q));
  }, [regionCities, search]);

  const showPrefectureHeaders = regionHasMultiplePrefectures(regionName);

  // Group cities by prefecture (preserving prefecture order from data)
  const prefectureGroups = useMemo((): PrefectureGroup[] => {
    if (!showPrefectureHeaders) {
      return [{ prefecture: "", cities: filteredCities }];
    }

    const prefectureOrder = getPrefecturesForRegion(regionName) ?? [];
    const grouped = new Map<string, CityEntry[]>();

    // Initialize in order
    for (const p of prefectureOrder) {
      grouped.set(p, []);
    }
    grouped.set("Other", []);

    for (const city of filteredCities) {
      const pref = getPrefectureForCity(city.city) ?? "Other";
      const list = grouped.get(pref);
      if (list) {
        list.push(city);
      } else {
        grouped.get("Other")!.push(city);
      }
    }

    // Build result, skipping empty groups
    const result: PrefectureGroup[] = [];
    for (const [prefecture, cities] of grouped) {
      if (cities.length > 0) {
        result.push({ prefecture, cities });
      }
    }
    return result;
  }, [filteredCities, regionName, showPrefectureHeaders]);

  const selectedCount = useMemo(() => {
    return regionCities.filter((c) =>
      selectedCities.has(c.city.toLowerCase() as CityId)
    ).length;
  }, [regionCities, selectedCities]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-medium uppercase tracking-widest text-stone">
          Cities in {regionName}
        </h4>
        <span className="text-[10px] tabular-nums text-stone">
          {selectedCount} / {regionCities.length}
        </span>
      </div>

      {/* Search input */}
      {regionCities.length > 6 && (
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cities..."
            className="h-12 w-full rounded-xl border border-border bg-background pl-8 pr-3 text-base text-foreground placeholder:text-stone focus:outline-none focus:ring-1 focus:ring-brand-primary"
            autoComplete="off"
          />
        </div>
      )}

      {/* City list */}
      <div
        className={cn(
          "mt-2 overflow-y-auto",
          variant === "desktop" ? "max-h-[280px]" : "max-h-[200px]"
        )}
        style={{ overscrollBehavior: "contain" }}
        data-lenis-prevent
      >
        {filteredCities.length === 0 ? (
          <p className="py-3 text-center text-xs text-stone">No cities found</p>
        ) : (
          prefectureGroups.map((group) => (
            <div key={group.prefecture || "all"}>
              {/* Prefecture header */}
              {showPrefectureHeaders && group.prefecture && (
                <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm px-2.5 pb-1 pt-2.5 first:pt-0">
                  <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-foreground-secondary">
                    {group.prefecture} Prefecture
                  </span>
                </div>
              )}

              {group.cities.map((city) => {
                const cityId = city.city.toLowerCase() as CityId;
                const isSelected = selectedCities.has(cityId);
                return (
                  <button
                    key={city.city}
                    type="button"
                    onClick={() => onToggleCity(cityId)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-brand-primary/5"
                        : "hover:bg-foreground/[0.02]"
                    )}
                  >
                    {/* Checkbox */}
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "border-brand-primary bg-brand-primary"
                          : "border-border"
                      )}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                    </span>

                    {/* City name + count */}
                    <span className="flex-1 min-w-0 flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          "text-sm",
                          isSelected ? "text-foreground" : "text-foreground-secondary"
                        )}
                      >
                        {city.city}
                      </span>
                      <span className="text-[11px] tabular-nums text-stone">
                        {city.locationCount} {city.locationCount === 1 ? "place" : "places"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
