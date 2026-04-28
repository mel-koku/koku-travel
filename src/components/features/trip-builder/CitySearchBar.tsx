"use client";

import { useState, useEffect, useRef, useId, useCallback, useMemo } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { getAllCities, getChildCityMapping } from "@/lib/tripBuilder/cityRelevance";
import { REGIONS } from "@/data/regions";
import { useToast } from "@/context/ToastContext";
import type { CityId } from "@/types/trip";

type SearchResult = {
  cityId: string;
  displayName: string;
  locationCount: number;
  region?: string;
  /** When set, this result was matched via a child city name */
  matchedChildCity?: string;
};

type CitySearchBarProps = {
  selectedCities: Set<CityId>;
  onSelectCity: (cityId: CityId) => void;
};

export function CitySearchBar({ selectedCities, onSelectCity }: CitySearchBarProps) {
  const [searchInput, setSearchInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const { showToast } = useToast();

  // Lazy-load all cities + child mapping (cached after first call)
  const allCities = useMemo(() => getAllCities(), []);
  const childMapping = useMemo(() => getChildCityMapping(), []);
  const cityDisplayNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of REGIONS) {
      for (const c of r.cities) map.set(c.id, c.name);
    }
    return map;
  }, []);

  // Client-side filtering: search planning cities + child city names
  const filteredCities = useMemo((): SearchResult[] => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return [];
    const results: SearchResult[] = [];
    const seen = new Set<string>();

    // 1. Direct planning city matches (highest priority)
    for (const c of allCities) {
      const name = cityDisplayNames.get(c.city) ?? c.city;
      if (name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)) {
        seen.add(c.city);
        results.push({
          cityId: c.city,
          displayName: name,
          locationCount: c.locationCount,
          region: c.region,
        });
      }
    }

    // 2. Child city matches (show parent planning city with annotation)
    for (const [childKey, { planningCity, childName }] of childMapping) {
      if (seen.has(planningCity)) continue; // Already showing this planning city
      if (childKey.includes(q)) {
        seen.add(planningCity);
        const parent = allCities.find((c) => c.city === planningCity);
        if (parent) {
          results.push({
            cityId: planningCity,
            displayName: cityDisplayNames.get(planningCity) ?? planningCity,
            locationCount: parent.locationCount,
            region: parent.region,
            matchedChildCity: childName,
          });
        }
      }
    }

    return results.slice(0, 8);
  }, [allCities, childMapping, cityDisplayNames, searchInput]);

  // Click-outside dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectCity = useCallback(
    (result: SearchResult) => {
      const cityId = result.cityId.toLowerCase() as CityId;
      const wasSelected = selectedCities.has(cityId);
      onSelectCity(cityId);
      showToast(
        wasSelected ? `Removed ${result.displayName}` : `Added ${result.displayName}`,
        { variant: wasSelected ? "info" : "success", duration: 2000 },
      );
      setSearchInput("");
      setShowDropdown(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [onSelectCity, selectedCities, showToast],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredCities.length === 0) {
      if (e.key === "Escape") {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredCities.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCities.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredCities[highlightedIndex]) {
          selectCity(filteredCities[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative mt-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
        <input
          ref={inputRef}
          type="text"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setShowDropdown(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (searchInput.trim() && filteredCities.length > 0) {
              setShowDropdown(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search any city in Japan..."
          className="h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 text-base text-foreground placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand-primary"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown && filteredCities.length > 0}
          aria-controls={showDropdown && filteredCities.length > 0 ? listboxId : undefined}
          aria-activedescendant={
            highlightedIndex >= 0 ? `city-option-${highlightedIndex}` : undefined
          }
          autoComplete="off"
        />
      </div>

      {/* Dropdown results */}
      {showDropdown && filteredCities.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-[var(--shadow-elevated)]"
          role="listbox"
          id={listboxId}
        >
          {filteredCities.map((result, index) => {
            const isSelected = selectedCities.has(result.cityId.toLowerCase() as CityId);
            return (
              <button
                key={`${result.cityId}-${result.matchedChildCity ?? ""}`}
                id={`city-option-${index}`}
                type="button"
                onClick={() => selectCity(result)}
                className={cn(
                  "flex w-full min-h-[44px] items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                  index === highlightedIndex
                    ? "bg-surface"
                    : "hover:bg-surface",
                  isSelected && "text-foreground-secondary",
                )}
                role="option"
                aria-selected={index === highlightedIndex}
              >
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-brand-primary" />
                )}
                <div className={cn("flex-1 min-w-0", isSelected && "ml-0")}>
                  <span className={cn(
                    "block font-medium",
                    isSelected ? "text-foreground-secondary" : "text-foreground",
                  )}>
                    {result.displayName}
                  </span>
                  <span className="block text-xs text-stone">
                    {result.matchedChildCity
                      ? `Includes ${result.matchedChildCity} · ${result.locationCount} locations · ${result.region}`
                      : `${result.locationCount} locations · ${result.region}`
                    }
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* No results */}
      {showDropdown && searchInput.trim().length > 0 && filteredCities.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg bg-surface px-4 py-3 text-sm text-stone shadow-[var(--shadow-card)]">
          No cities found matching &ldquo;{searchInput}&rdquo;
        </div>
      )}
    </div>
  );
}
