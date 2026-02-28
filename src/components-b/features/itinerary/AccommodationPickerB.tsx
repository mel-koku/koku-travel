"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Flag, X, Pencil, ChevronUp } from "lucide-react";
import { useMapboxSearch, type MapboxSuggestion } from "@/hooks/useMapboxSearch";
import type { EntryPoint } from "@/types/trip";

type AccommodationPickerBProps = {
  startLocation?: EntryPoint;
  endLocation?: EntryPoint;
  onStartChange: (location: EntryPoint | undefined) => void;
  onEndChange: (location: EntryPoint | undefined) => void;
  isReadOnly?: boolean;
};

export function AccommodationPickerB({
  startLocation,
  endLocation,
  onStartChange,
  onEndChange,
  isReadOnly,
}: AccommodationPickerBProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-outside to collapse
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  if (isReadOnly) {
    if (!startLocation && !endLocation) return null;
    return (
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs"
        style={{ color: "var(--muted-foreground)" }}
      >
        {startLocation && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span className="max-w-[180px] truncate">{startLocation.name}</span>
          </span>
        )}
        {endLocation && (
          <span className="flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5" />
            <span className="max-w-[180px] truncate">
              {endLocation.id === startLocation?.id ? "Same as start" : endLocation.name}
            </span>
          </span>
        )}
      </div>
    );
  }

  if (!expanded) {
    const hasLocations = startLocation || endLocation;

    if (!hasLocations) {
      return (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--muted-foreground)" }}
        >
          + Set accommodation
        </button>
      );
    }

    const isSame = endLocation && startLocation && endLocation.id === startLocation.id;
    const displayEnd = isSame ? null : endLocation;

    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm transition-colors hover:bg-[var(--surface)]"
        style={{ color: "var(--muted-foreground)" }}
      >
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="max-w-[140px] truncate">{startLocation?.name ?? endLocation?.name}</span>
        {displayEnd && (
          <>
            <span style={{ color: "var(--border)" }}>&rarr;</span>
            <Flag className="h-3 w-3 shrink-0" />
            <span className="max-w-[140px] truncate">{displayEnd.name}</span>
          </>
        )}
        <Pencil className="ml-1 h-3 w-3 shrink-0 opacity-50" />
      </button>
    );
  }

  return (
    <div ref={containerRef}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <LocationFieldB
          label="Starting location"
          icon={<MapPin className="h-3.5 w-3.5" />}
          value={startLocation}
          onChange={onStartChange}
          placeholder="Search hotel, address..."
        />
        <LocationFieldB
          label="Ending location"
          icon={<Flag className="h-3.5 w-3.5" />}
          value={endLocation}
          onChange={onEndChange}
          placeholder={startLocation ? "Same as start" : "Search hotel, address..."}
          linkedValue={startLocation}
        />
      </div>
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg py-1 text-xs font-medium transition-colors hover:bg-[var(--surface)]"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ChevronUp className="h-3.5 w-3.5" />
        Done
      </button>
    </div>
  );
}

type LocationFieldBProps = {
  label: string;
  icon: React.ReactNode;
  value?: EntryPoint;
  onChange: (location: EntryPoint | undefined) => void;
  placeholder: string;
  linkedValue?: EntryPoint;
};

function LocationFieldB({
  label,
  icon,
  value,
  onChange,
  placeholder,
  linkedValue,
}: LocationFieldBProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { suggestions, isLoading, isDebouncing, retrieve, isAvailable } =
    useMapboxSearch(query);

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
      onChange({
        type: "accommodation",
        id: result.mapbox_id,
        name: result.name,
        coordinates: result.coordinates,
      });
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

  const showDropdown =
    focused && query.length >= 3 && (suggestions.length > 0 || isLoading || isDebouncing);
  const showNoResults =
    focused && !isLoading && !isDebouncing && query.length >= 3 && suggestions.length === 0;
  const isSameAsLinked = !value && linkedValue;

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <label
        className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.15em]"
        style={{ color: "var(--muted-foreground)" }}
      >
        {icon}
        {label}
      </label>

      {value ? (
        <div
          className="flex h-11 items-center gap-2 rounded-xl border px-3"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--background)",
          }}
        >
          <span
            className="flex-1 truncate text-sm"
            style={{ color: "var(--foreground)" }}
          >
            {value.name}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--muted-foreground)" }}
            aria-label="Clear"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={
            isSameAsLinked ? `Same as start · ${linkedValue.name}` : placeholder
          }
          className="h-11 w-full rounded-xl border px-3 text-base transition-colors focus:outline-none focus:ring-2"
          style={{
            borderColor: "var(--border)",
            color: "var(--foreground)",
            backgroundColor: "var(--background)",
          }}
        />
      )}

      {showDropdown && (
        <div
          className="absolute left-0 top-full z-30 mt-1 w-full rounded-xl border p-1.5"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          {(isLoading || isDebouncing) && (
            <p
              className="px-2.5 py-2 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Searching...
            </p>
          )}
          {suggestions.length > 0 && (
            <ul className="space-y-0.5">
              {suggestions.map((s) => (
                <li key={s.mapbox_id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(s)}
                    className="w-full rounded-xl px-2.5 py-2 text-left text-sm transition-colors"
                    style={{ color: "var(--foreground)" }}
                  >
                    <span className="block font-medium">{s.name}</span>
                    {(s.full_address || s.place_formatted) && (
                      <span
                        className="block truncate text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
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
        <div
          className="absolute left-0 top-full z-30 mt-1 w-full rounded-xl border p-2.5"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            No results found
          </p>
        </div>
      )}
    </div>
  );
}
