"use client";

import { useState, useEffect, useRef, useId, useCallback, useMemo } from "react";
import type { EntryPoint, KnownRegionId } from "@/types/trip";
import type { Airport } from "@/app/api/airports/route";
import { FormField } from "@/components/ui/FormField";
import { logger } from "@/lib/logger";

const MIN_SEARCH_LENGTH = 1;

export type EntryPointSelectorProps = {
  value?: EntryPoint;
  onChange: (entryPoint: EntryPoint | undefined) => void;
};

export function EntryPointSelector({ value, onChange }: EntryPointSelectorProps) {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [popularAirports, setPopularAirports] = useState<Airport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(value?.name ?? "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState<EntryPoint | null>(value ?? null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Fetch airports on mount
  useEffect(() => {
    async function fetchAirports() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/airports");
        if (!response.ok) {
          throw new Error("Failed to fetch airports");
        }
        const data = await response.json();
        const airportList: Airport[] = data.data || [];
        setAirports(airportList);
        setPopularAirports(airportList.filter(a => a.isPopular));
      } catch (error) {
        logger.error("Error fetching airports", error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsLoading(false);
      }
    }
    fetchAirports();
  }, []);

  // Filter airports based on search input
  const filteredAirports = useMemo(() => {
    if (!searchInput.trim() || searchInput.length < MIN_SEARCH_LENGTH) {
      return [];
    }
    const searchLower = searchInput.toLowerCase();
    return airports.filter(airport =>
      airport.name.toLowerCase().includes(searchLower) ||
      airport.city.toLowerCase().includes(searchLower) ||
      airport.iataCode.toLowerCase().includes(searchLower) ||
      airport.shortName.toLowerCase().includes(searchLower)
    ).slice(0, 10); // Limit to 10 results
  }, [airports, searchInput]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectAirport = useCallback((airport: Airport) => {
    const entryPoint: EntryPoint = {
      type: "airport",
      id: airport.id,
      name: airport.name,
      coordinates: airport.coordinates,
      iataCode: airport.iataCode,
      region: airport.region.toLowerCase() as KnownRegionId,
    };
    setSelectedAirport(entryPoint);
    setSearchInput(airport.name);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    onChange(entryPoint);
  }, [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchInput(newValue);
    setSelectedAirport(null);
    setShowDropdown(true);
    setHighlightedIndex(-1);
    onChange(undefined);
  };

  const handleInputFocus = () => {
    if (searchInput.length >= MIN_SEARCH_LENGTH && filteredAirports.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredAirports.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredAirports.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredAirports.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        const selected = filteredAirports[highlightedIndex];
        if (highlightedIndex >= 0 && selected) {
          selectAirport(selected);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleClear = () => {
    setSearchInput("");
    setSelectedAirport(null);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    onChange(undefined);
    searchInputRef.current?.focus();
  };

  return (
    <div className="space-y-4">
      {/* Popular Airport Chips - shown when nothing is selected */}
      {!selectedAirport && !isLoading && popularAirports.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-stone uppercase tracking-wide">
            Popular Airports
          </p>
          <div className="flex flex-wrap gap-2">
            {popularAirports.map((airport) => (
              <button
                key={airport.id}
                type="button"
                onClick={() => selectAirport(airport)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground-secondary hover:border-brand-primary hover:text-brand-primary transition-colors"
              >
                {airport.shortName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <FormField
        id="entry-point-search"
        label="Arrival Airport"
        help={
          isLoading
            ? "Loading airports..."
            : searchInput.length > 0 && searchInput.length < MIN_SEARCH_LENGTH
              ? `Type ${MIN_SEARCH_LENGTH - searchInput.length} more character${MIN_SEARCH_LENGTH - searchInput.length > 1 ? "s" : ""} to search`
              : undefined
        }
      >
        <div className="relative">
          <input
            ref={searchInputRef}
            id="entry-point-search"
            type="text"
            value={searchInput}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "Loading airports..." : "Search airports by name, city, or code..."}
            disabled={isLoading}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-surface disabled:cursor-not-allowed"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown && filteredAirports.length > 0}
            aria-controls={showDropdown && filteredAirports.length > 0 ? listboxId : undefined}
            aria-activedescendant={highlightedIndex >= 0 ? `airport-option-${highlightedIndex}` : undefined}
            autoComplete="off"
          />
          {/* Loading spinner */}
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                className="h-4 w-4 animate-spin text-stone"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
          {/* Clear button */}
          {selectedAirport && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-foreground-secondary"
              aria-label="Clear selection"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </FormField>

      {/* Search Results Dropdown */}
      {showDropdown && filteredAirports.length > 0 && (
        <div
          ref={dropdownRef}
          className="relative z-50 rounded-lg border border-border bg-background shadow-lg max-h-60 overflow-auto"
          role="listbox"
          id={listboxId}
        >
          {filteredAirports.map((airport, index) => (
            <button
              key={airport.id}
              id={`airport-option-${index}`}
              type="button"
              onClick={() => selectAirport(airport)}
              className={`w-full px-4 py-2 text-left text-sm focus:outline-none ${
                index === highlightedIndex
                  ? "bg-surface"
                  : "hover:bg-surface"
              }`}
              role="option"
              aria-selected={index === highlightedIndex}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">{airport.name}</div>
                  <div className="text-xs text-stone">{airport.city}, {airport.region}</div>
                </div>
                <span className="ml-2 rounded bg-surface px-2 py-0.5 text-xs font-mono text-stone">
                  {airport.iataCode}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {showDropdown && searchInput.length >= MIN_SEARCH_LENGTH && filteredAirports.length === 0 && !isLoading && (
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-stone">
          No airports found matching &ldquo;{searchInput}&rdquo;
        </div>
      )}

      {/* Selected Airport Display */}
      {selectedAirport && (
        <div className="rounded-lg border border-success/20 bg-success/10 px-4 py-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-success/20 px-2 py-0.5 text-xs font-medium text-success">
                  Airport
                </span>
                <span className="font-medium text-foreground">{selectedAirport.name}</span>
                {selectedAirport.iataCode && (
                  <span className="rounded bg-surface px-2 py-0.5 text-xs font-mono text-stone">
                    {selectedAirport.iataCode}
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-stone">
                {selectedAirport.coordinates.lat.toFixed(4)}, {selectedAirport.coordinates.lng.toFixed(4)}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-stone hover:text-foreground-secondary"
              aria-label="Remove entry point"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
