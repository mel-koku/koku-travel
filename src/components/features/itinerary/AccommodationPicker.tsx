"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMapboxSearch, type MapboxSuggestion } from "@/hooks/useMapboxSearch";
import type { EntryPoint } from "@/types/trip";

type AccommodationPickerProps = {
  startLocation?: EntryPoint;
  endLocation?: EntryPoint;
  cityId?: string;
  onStartChange: (location: EntryPoint | undefined) => void;
  onEndChange: (location: EntryPoint | undefined) => void;
  onSetCityAccommodation?: (location: EntryPoint | undefined) => void;
  isReadOnly?: boolean;
};

export function AccommodationPicker({
  startLocation,
  endLocation,
  cityId,
  onStartChange,
  onEndChange,
  onSetCityAccommodation,
  isReadOnly,
}: AccommodationPickerProps) {
  // Read-only: show names only
  if (isReadOnly) {
    if (!startLocation && !endLocation) return null;
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone">
        {startLocation && (
          <span className="flex items-center gap-1.5">
            <StartIcon className="h-3.5 w-3.5" />
            <span className="max-w-[180px] truncate">{startLocation.name}</span>
          </span>
        )}
        {endLocation && (
          <span className="flex items-center gap-1.5">
            <EndIcon className="h-3.5 w-3.5" />
            <span className="max-w-[180px] truncate">
              {endLocation.id === startLocation?.id ? "Same as start" : endLocation.name}
            </span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <LocationField
          label="Starting location"
          icon={<StartIcon className="h-3.5 w-3.5" />}
          value={startLocation}
          onChange={onStartChange}
          placeholder="Search hotel, address..."
        />
        <LocationField
          label="Ending location"
          icon={<EndIcon className="h-3.5 w-3.5" />}
          value={endLocation}
          onChange={onEndChange}
          placeholder={startLocation ? "Same as start" : "Search hotel, address..."}
          linkedValue={startLocation}
        />
      </div>
      {/* City-wide action */}
      {onSetCityAccommodation && cityId && startLocation && (
        <button
          type="button"
          onClick={() => onSetCityAccommodation(startLocation)}
          className="text-xs font-medium text-brand-primary transition-colors hover:text-brand-primary/80"
        >
          Use for all {cityId.charAt(0).toUpperCase() + cityId.slice(1)} days
        </button>
      )}
    </div>
  );
}

// ─── Individual search field ─────────────────────────────────────────────────

type LocationFieldProps = {
  label: string;
  icon: React.ReactNode;
  value?: EntryPoint;
  onChange: (location: EntryPoint | undefined) => void;
  placeholder: string;
  /** If set and value is empty, displays "Same as <linkedValue>" */
  linkedValue?: EntryPoint;
};

function LocationField({
  label,
  icon,
  value,
  onChange,
  placeholder,
  linkedValue,
}: LocationFieldProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { suggestions, isLoading, isDebouncing, retrieve, isAvailable } = useMapboxSearch(query);

  // Close dropdown on outside click
  useEffect(() => {
    if (!focused) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setFocused(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [focused]);

  const handleSelect = useCallback(
    async (suggestion: MapboxSuggestion) => {
      const result = await retrieve(suggestion);
      if (!result) return;

      const entryPoint: EntryPoint = {
        type: "accommodation",
        id: result.mapbox_id,
        name: result.name,
        coordinates: result.coordinates,
      };

      onChange(entryPoint);
      setQuery("");
      setFocused(false);
    },
    [retrieve, onChange],
  );

  const handleClear = useCallback(() => {
    onChange(undefined);
    setQuery("");
  }, [onChange]);

  if (!isAvailable) return null;

  const showDropdown = focused && query.length >= 3 && (suggestions.length > 0 || isLoading || isDebouncing);
  const showNoResults = focused && !isLoading && !isDebouncing && query.length >= 3 && suggestions.length === 0;
  const isSameAsLinked = !value && linkedValue;

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-foreground-secondary">
        {icon}
        {label}
      </label>

      {value ? (
        // Set state: show the selected location as a chip
        <div className="flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3">
          <span className="flex-1 truncate text-sm text-foreground">{value.name}</span>
          <button
            type="button"
            onClick={handleClear}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone transition-colors hover:bg-error/10 hover:text-error"
            aria-label="Clear"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        // Empty state: show the search input
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={isSameAsLinked ? `Same as start · ${linkedValue.name}` : placeholder}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground placeholder:text-stone focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
      )}

      {/* Suggestions dropdown */}
      {showDropdown && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-xl border border-border bg-surface p-1.5 shadow-lg">
          {(isLoading || isDebouncing) && (
            <p className="px-2.5 py-2 text-xs text-stone">Searching...</p>
          )}
          {suggestions.length > 0 && (
            <ul className="space-y-0.5">
              {suggestions.map((s) => (
                <li key={s.mapbox_id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(s)}
                    className="w-full rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-brand-primary/10"
                  >
                    <span className="block font-medium text-foreground">{s.name}</span>
                    {(s.full_address || s.place_formatted) && (
                      <span className="block text-xs text-stone truncate">
                        {s.full_address || s.place_formatted}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {showNoResults && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-xl border border-border bg-surface p-2.5 shadow-lg">
          <p className="text-xs text-stone">No results found</p>
        </div>
      )}
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function StartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function EndIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
    </svg>
  );
}
