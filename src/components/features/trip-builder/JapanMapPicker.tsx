"use client";

import { useCallback, useMemo, useState } from "react";
import { Plane, Search, X } from "lucide-react";
import type { Airport } from "@/app/api/airports/route";
import type { EntryPoint, KnownRegionId } from "@/types/trip";

// Top 8 busiest airports in Japan by passenger traffic
const TOP_AIRPORT_CODES = ["HND", "NRT", "KIX", "CTS", "FUK", "ITM", "NGO", "OKA"];

export type JapanMapPickerProps = {
  value?: EntryPoint;
  onChange: (entryPoint: EntryPoint | undefined) => void;
  airports: Airport[];
  isLoading: boolean;
};

export function JapanMapPicker({
  value,
  onChange,
  airports,
  isLoading,
}: JapanMapPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter airports for search
  const filteredAirports = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return airports
      .filter(
        (airport) =>
          airport.name.toLowerCase().includes(query) ||
          airport.city.toLowerCase().includes(query) ||
          airport.iataCode.toLowerCase().includes(query) ||
          airport.shortName.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [airports, searchQuery]);

  // Handle airport selection
  const handleSelectAirport = useCallback(
    (airport: Airport) => {
      const entryPoint: EntryPoint = {
        type: "airport",
        id: airport.id,
        name: airport.name,
        coordinates: airport.coordinates,
        iataCode: airport.iataCode,
        region: airport.region.toLowerCase() as KnownRegionId,
      };
      onChange(entryPoint);
      setSearchQuery("");
    },
    [onChange]
  );

  // Handle clearing selection
  const handleClear = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  // Get top 8 airports by passenger traffic (hardcoded order)
  const topAirports = useMemo(() => {
    return TOP_AIRPORT_CODES
      .map((code) => airports.find((a) => a.iataCode === code))
      .filter((a): a is Airport => a !== undefined);
  }, [airports]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-2 text-stone">
          <svg
            className="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading airports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Selected Airport Display */}
      {value && (
        <div className="rounded-lg border border-sage/30 bg-sage/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage/20 text-sage">
                <Plane className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">{value.name}</p>
                {value.iataCode && (
                  <p className="text-xs text-stone">{value.iataCode}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg px-3 py-1 text-sm text-stone hover:bg-surface hover:text-foreground-secondary"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Airport Selection */}
      {!value && (
        <>
          {/* Optional hint */}
          <p className="text-center text-sm text-stone">
            This is optional - skip if you&apos;re not sure yet
          </p>

          {/* Search Input */}
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search airports by name, city, or code..."
              className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-10 text-sm placeholder:text-stone focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-foreground-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Search Results Dropdown */}
            {filteredAirports.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-background shadow-lg">
                {filteredAirports.map((airport) => (
                  <button
                    key={airport.id}
                    type="button"
                    onClick={() => handleSelectAirport(airport)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-surface"
                  >
                    <div className="flex items-center gap-3">
                      <Plane className="h-4 w-4 text-stone" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {airport.name}
                        </p>
                        <p className="text-xs text-stone">
                          {airport.city}, {airport.region}
                        </p>
                      </div>
                    </div>
                    <span className="rounded bg-surface px-2 py-0.5 font-mono text-xs text-stone">
                      {airport.iataCode}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchQuery && filteredAirports.length === 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-background p-4 text-center text-sm text-stone shadow-lg">
                No airports found
              </div>
            )}
          </div>

          {/* Popular Airports */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone">
              Popular Airports
            </p>
            <div className="flex flex-wrap gap-2">
              {topAirports.map((airport) => (
                <button
                  key={airport.id}
                  type="button"
                  onClick={() => handleSelectAirport(airport)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-sage"
                >
                  <Plane className="h-3 w-3" />
                  {airport.shortName}
                </button>
              ))}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
