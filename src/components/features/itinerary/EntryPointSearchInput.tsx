"use client";

import { useState, useEffect, useRef, useId, useMemo, useCallback } from "react";
import type { EntryPoint } from "@/types/trip";
import type { Airport } from "@/app/api/airports/route";
import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";

type EntryPointSearchInputProps = {
  onSelect: (entryPoint: EntryPoint) => void;
  placeholder?: string;
  initialValue?: EntryPoint;
};

export function EntryPointSearchInput({
  onSelect,
  placeholder,
  initialValue,
}: EntryPointSearchInputProps) {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [popularAirports, setPopularAirports] = useState<Airport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialValue?.name ?? "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [errors, setErrors] = useState<{ name?: string }>({});

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
        setErrors({ name: "Failed to load airports. Please try again." });
      } finally {
        setIsLoading(false);
      }
    }
    fetchAirports();
  }, []);

  // Filter airports based on search input
  const filteredAirports = useMemo(() => {
    if (!searchInput.trim()) {
      return [];
    }
    const searchLower = searchInput.toLowerCase();
    return airports.filter(airport =>
      airport.name.toLowerCase().includes(searchLower) ||
      airport.city.toLowerCase().includes(searchLower) ||
      airport.iataCode.toLowerCase().includes(searchLower) ||
      airport.shortName.toLowerCase().includes(searchLower)
    ).slice(0, 10);
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
    setSelectedAirport(airport);
    setSearchInput(airport.name);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setErrors({});
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setSelectedAirport(null);
    setShowDropdown(true);
    setHighlightedIndex(-1);
    setErrors({});
  };

  const handleInputFocus = () => {
    if (searchInput.length > 0 && filteredAirports.length > 0) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAirport) {
      setErrors({ name: "Please select an airport from the suggestions" });
      return;
    }

    const entryPoint: EntryPoint = {
      type: "airport",
      id: initialValue?.id ?? selectedAirport.id,
      name: selectedAirport.name,
      coordinates: selectedAirport.coordinates,
      iataCode: selectedAirport.iataCode,
    };

    onSelect(entryPoint);
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Popular Airport Chips */}
      {!selectedAirport && !isLoading && popularAirports.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-warm-gray">
            Popular Airports
          </p>
          <div className="flex flex-wrap gap-2">
            {popularAirports.map((airport) => (
              <button
                key={airport.id}
                type="button"
                onClick={() => selectAirport(airport)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-warm-gray hover:border-brand-primary hover:text-sage transition-colors"
              >
                {airport.shortName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <label htmlFor="entry-point-search" className="block text-sm font-medium text-warm-gray mb-1">
          Airport
        </label>
        <div className="relative">
          <input
            ref={searchInputRef}
            id="entry-point-search"
            type="text"
            value={searchInput}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? (isLoading ? "Loading airports..." : "Search airports by name, city, or code...")}
            disabled={isLoading}
            className="w-full rounded-lg border border-border px-3 py-2 pr-10 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-surface disabled:cursor-not-allowed"
            aria-invalid={errors.name ? "true" : "false"}
            aria-describedby={errors.name ? "name-error" : undefined}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown && filteredAirports.length > 0}
            aria-controls={showDropdown && filteredAirports.length > 0 ? listboxId : undefined}
            aria-activedescendant={highlightedIndex >= 0 ? `airport-option-${highlightedIndex}` : undefined}
            autoComplete="off"
          />
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
        </div>
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-error">
            {errors.name}
          </p>
        )}

        {/* Suggestions dropdown */}
        {showDropdown && filteredAirports.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg max-h-60 overflow-auto"
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
                  index === highlightedIndex ? "bg-sand" : "hover:bg-sand"
                }`}
                role="option"
                aria-selected={index === highlightedIndex}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-charcoal">{airport.name}</div>
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
        {showDropdown && searchInput.length > 0 && filteredAirports.length === 0 && !isLoading && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-stone">
            No airports found matching &ldquo;{searchInput}&rdquo;
          </div>
        )}

        {/* Selected airport info */}
        {selectedAirport && (
          <div className="mt-2 rounded-lg bg-surface p-2 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-charcoal">{selectedAirport.name}</div>
                <div className="text-xs text-foreground-secondary">{selectedAirport.city}, {selectedAirport.region}</div>
              </div>
              <span className="rounded bg-background px-2 py-0.5 text-xs font-mono text-stone">
                {selectedAirport.iataCode}
              </span>
            </div>
            <div className="mt-1 text-xs text-stone">
              Coordinates: {selectedAirport.coordinates.lat.toFixed(4)},{" "}
              {selectedAirport.coordinates.lng.toFixed(4)}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="submit" variant="primary" disabled={isLoading || !selectedAirport}>
          Save Entry Point
        </Button>
      </div>
    </form>
  );
}
