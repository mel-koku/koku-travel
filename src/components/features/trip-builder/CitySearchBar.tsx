"use client";

import { useState, useEffect, useRef, useId, useCallback, useMemo } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { getAllCities } from "@/lib/tripBuilder/cityRelevance";
import { useToast } from "@/context/ToastContext";
import type { CityId } from "@/types/trip";

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

  // Lazy-load all 640 cities (cached after first call)
  const allCities = useMemo(() => getAllCities(), []);

  // Client-side filtering
  const filteredCities = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return [];
    return allCities
      .filter((c) => c.city.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allCities, searchInput]);

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
    (cityName: string) => {
      const cityId = cityName.toLowerCase() as CityId;
      const wasSelected = selectedCities.has(cityId);
      onSelectCity(cityId);
      showToast(
        wasSelected ? `Removed ${cityName}` : `Added ${cityName} to your trip`,
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
          selectCity(filteredCities[highlightedIndex].city);
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
          className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-base text-foreground placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-background shadow-lg"
          role="listbox"
          id={listboxId}
        >
          {filteredCities.map((city, index) => {
            const cityId = city.city.toLowerCase();
            const isSelected = selectedCities.has(cityId);
            return (
              <button
                key={city.city}
                id={`city-option-${index}`}
                type="button"
                onClick={() => selectCity(city.city)}
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
                    {city.city}
                  </span>
                  <span className="block text-xs text-stone">
                    {city.locationCount} locations · {city.region}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* No results */}
      {showDropdown && searchInput.trim().length > 0 && filteredCities.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-stone">
          No cities found matching &ldquo;{searchInput}&rdquo;
        </div>
      )}
    </div>
  );
}
