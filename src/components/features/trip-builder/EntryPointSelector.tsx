"use client";

import { useState, useEffect, useRef, useId, useCallback } from "react";
import type { EntryPoint, EntryPointType } from "@/types/trip";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { logger } from "@/lib/logger";

type AutocompletePlace = {
  placeId: string;
  displayName: string;
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
};

type QuickPick = {
  id: string;
  name: string;
  shortName: string;
  coordinates: { lat: number; lng: number };
  placeId?: string;
};

// Popular airports for quick selection (no API call needed)
const POPULAR_AIRPORTS: QuickPick[] = [
  { id: "nrt", name: "Narita International Airport", shortName: "Narita (NRT)", coordinates: { lat: 35.772, lng: 140.3929 }, placeId: "ChIJCfwSPxmwGGAR0VzU8Dkkz8s" },
  { id: "hnd", name: "Haneda Airport", shortName: "Haneda (HND)", coordinates: { lat: 35.5494, lng: 139.7798 }, placeId: "ChIJP5NotGWLGGARTOM1SfRv_TQ" },
  { id: "kix", name: "Kansai International Airport", shortName: "Kansai (KIX)", coordinates: { lat: 34.4273, lng: 135.2441 }, placeId: "ChIJ17lk_XLOAGARSC2nCeLpnvM" },
  { id: "ngo", name: "Chubu Centrair International Airport", shortName: "Centrair (NGO)", coordinates: { lat: 34.8584, lng: 136.8052 }, placeId: "ChIJK9ZI7NPGBGAR3PIU3A9UYXE" },
  { id: "cts", name: "New Chitose Airport", shortName: "Chitose (CTS)", coordinates: { lat: 42.7752, lng: 141.6925 }, placeId: "ChIJM7_5cYxpd18ROOxs7qJBG_c" },
  { id: "fuk", name: "Fukuoka Airport", shortName: "Fukuoka (FUK)", coordinates: { lat: 33.5859, lng: 130.4511 }, placeId: "ChIJQwcmrPd6QTUR7QlY7yiMfkk" },
];

// Popular cities for quick selection (no API call needed)
const POPULAR_CITIES: QuickPick[] = [
  { id: "city-tokyo", name: "Tokyo", shortName: "Tokyo", coordinates: { lat: 35.6762, lng: 139.6503 }, placeId: "ChIJXSModoWLGGARILWiCfeu2M0" },
  { id: "city-osaka", name: "Osaka", shortName: "Osaka", coordinates: { lat: 34.6937, lng: 135.5023 }, placeId: "ChIJ4eIGNFXmAGAR5y9q5G7BW8U" },
  { id: "city-kyoto", name: "Kyoto", shortName: "Kyoto", coordinates: { lat: 35.0116, lng: 135.7681 }, placeId: "ChIJ8cM8zdaoAWARPR27azYdlsA" },
  { id: "city-hiroshima", name: "Hiroshima", shortName: "Hiroshima", coordinates: { lat: 34.3853, lng: 132.4553 }, placeId: "ChIJsVxlrATRUzURs5X9WZbdnEA" },
  { id: "city-sapporo", name: "Sapporo", shortName: "Sapporo", coordinates: { lat: 43.0618, lng: 141.3545 }, placeId: "ChIJ_fLwfuyoFGARKJbmbfOctQg" },
  { id: "city-fukuoka", name: "Fukuoka", shortName: "Fukuoka", coordinates: { lat: 33.5904, lng: 130.4017 }, placeId: "ChIJV7fBZDmRQTURGXnHbKOGH0Q" },
];

const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_MS = 300;

// Japan bounding box for location restriction
const JAPAN_BOUNDS = {
  rectangle: {
    low: { latitude: 24.0, longitude: 122.0 },   // Southwest (Okinawa/Yonaguni)
    high: { latitude: 46.0, longitude: 146.0 },  // Northeast (Hokkaido)
  },
};

export type EntryPointSelectorProps = {
  value?: EntryPoint;
  onChange: (entryPoint: EntryPoint | undefined) => void;
};

export function EntryPointSelector({ value, onChange }: EntryPointSelectorProps) {
  const [entryPointType, setEntryPointType] = useState<EntryPointType | "">(value?.type ?? "");
  const [searchInput, setSearchInput] = useState(value?.name ?? "");
  const [suggestions, setSuggestions] = useState<AutocompletePlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<EntryPoint | null>(value ?? null);
  const [isFetchingCoordinates, setIsFetchingCoordinates] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const listboxId = useId();

  const typeLabels: Record<EntryPointType, string> = {
    airport: "Airport",
    city: "City",
    hotel: "Hotel",
    station: "Train Station",
  };

  const typePlaceholders: Record<EntryPointType, string> = {
    airport: "Search airports...",
    city: "Search cities...",
    hotel: "Search hotels...",
    station: "Search train stations...",
  };

  // Map entry point types to Google Places primary types
  const getPrimaryTypes = useCallback((entryType: EntryPointType): string[] => {
    switch (entryType) {
      case "hotel":
        return ["lodging"];
      case "airport":
        return ["airport"];
      case "station":
        return ["train_station", "subway_station", "transit_station"];
      case "city":
        return ["locality", "administrative_area_level_1"];
      default:
        return [];
    }
  }, []);

  // Reset when type changes
  useEffect(() => {
    if (entryPointType !== value?.type) {
      setSearchInput("");
      setSelectedPlace(null);
      setSuggestions([]);
      setShowSuggestions(false);
      onChange(undefined);
    }
  }, [entryPointType, value?.type, onChange]);

  // Debounced autocomplete search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't search if:
    // - No type selected
    // - Input too short
    // - Already have a selected place
    if (!entryPointType || !searchInput.trim() || searchInput.trim().length < MIN_SEARCH_LENGTH || selectedPlace) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: searchInput.trim(),
            includedPrimaryTypes: getPrimaryTypes(entryPointType),
            regionCode: "JP",
            locationRestriction: JAPAN_BOUNDS,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errorData.error || `Failed to fetch suggestions (${response.status})`);
        }

        const data = await response.json();
        setSuggestions(data.places || []);
        setShowSuggestions(true);
      } catch (error) {
        logger.error("Error fetching autocomplete suggestions", error instanceof Error ? error : new Error(String(error)));
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput, entryPointType, selectedPlace, getPrimaryTypes]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPlace = async (place: AutocompletePlace) => {
    if (!entryPointType) return;

    setSearchInput(place.displayName);
    setShowSuggestions(false);

    // If coordinates are already available, use them directly
    if (place.location) {
      const entryPoint: EntryPoint = {
        type: entryPointType,
        id: `ep-${place.placeId}`,
        name: place.displayName,
        coordinates: {
          lat: place.location.latitude,
          lng: place.location.longitude,
        },
        placeId: place.placeId,
      };
      setSelectedPlace(entryPoint);
      onChange(entryPoint);
      return;
    }

    // Otherwise, fetch coordinates by place ID
    setIsFetchingCoordinates(true);
    try {
      const response = await fetch(`/api/places/autocomplete?placeId=${encodeURIComponent(place.placeId)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch place coordinates");
      }

      const data = await response.json();
      if (data.place?.location) {
        const entryPoint: EntryPoint = {
          type: entryPointType,
          id: `ep-${place.placeId}`,
          name: place.displayName,
          coordinates: {
            lat: data.place.location.latitude,
            lng: data.place.location.longitude,
          },
          placeId: place.placeId,
        };
        setSelectedPlace(entryPoint);
        onChange(entryPoint);
      }
    } catch (error) {
      logger.error("Error fetching place coordinates", error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsFetchingCoordinates(false);
    }
  };

  const handleQuickPickSelect = (quickPick: QuickPick, type: EntryPointType) => {
    const entryPoint: EntryPoint = {
      type,
      id: quickPick.id,
      name: quickPick.name,
      coordinates: quickPick.coordinates,
      placeId: quickPick.placeId,
    };
    setEntryPointType(type);
    setSearchInput(quickPick.name);
    setSelectedPlace(entryPoint);
    onChange(entryPoint);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setSelectedPlace(null);
    onChange(undefined);
  };

  const handleClear = () => {
    setSearchInput("");
    setSelectedPlace(null);
    setSuggestions([]);
    setShowSuggestions(false);
    onChange(undefined);
  };

  const entryPointTypeOptions = [
    { label: "Airport", value: "airport" },
    { label: "Train Station", value: "station" },
    { label: "City", value: "city" },
    { label: "Hotel", value: "hotel" },
  ];

  return (
    <div className="space-y-4">
      {/* Quick Picks - shown when no type selected, or airport/city selected */}
      {!selectedPlace && (!entryPointType || entryPointType === "airport" || entryPointType === "city") && (
        <div className="space-y-3">
          {/* Airport quick picks */}
          {(!entryPointType || entryPointType === "airport") && (
            <div>
              <p className="mb-2 text-xs font-medium text-stone uppercase tracking-wide">
                Popular Airports
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_AIRPORTS.map((airport) => (
                  <button
                    key={airport.id}
                    type="button"
                    onClick={() => handleQuickPickSelect(airport, "airport")}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-warm-gray hover:border-brand-primary hover:text-sage transition-colors"
                  >
                    {airport.shortName}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* City quick picks */}
          {(!entryPointType || entryPointType === "city") && (
            <div>
              <p className="mb-2 text-xs font-medium text-stone uppercase tracking-wide">
                Popular Cities
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CITIES.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleQuickPickSelect(city, "city")}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-warm-gray hover:border-brand-primary hover:text-sage transition-colors"
                  >
                    {city.shortName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Type Selector */}
        <FormField id="entry-point-type" label="Entry Point Type">
          <Select
            id="entry-point-type"
            placeholder="Select type"
            options={entryPointTypeOptions}
            value={entryPointType}
            onChange={(e) => {
              const newType = e.target.value as EntryPointType | "";
              setEntryPointType(newType);
            }}
          />
        </FormField>

        {/* Search Input */}
        <FormField
          id="entry-point-search"
          label="Entry Point"
          help={
            !entryPointType
              ? "Select a type first"
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
              placeholder={entryPointType ? typePlaceholders[entryPointType] : "Select type first"}
              disabled={!entryPointType}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-surface disabled:cursor-not-allowed"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-controls={showSuggestions && suggestions.length > 0 ? listboxId : undefined}
              autoComplete="off"
            />
            {/* Loading spinner */}
            {(isLoading || isFetchingCoordinates) && (
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
            {selectedPlace && !isLoading && !isFetchingCoordinates && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-warm-gray"
                aria-label="Clear selection"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </FormField>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="relative z-50 rounded-lg border border-border bg-background shadow-lg max-h-60 overflow-auto"
          role="listbox"
          id={listboxId}
        >
          {suggestions.map((place) => (
            <button
              key={place.placeId}
              type="button"
              onClick={() => handleSelectPlace(place)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-sand focus:bg-sand focus:outline-none"
              role="option"
              aria-selected="false"
            >
              <div className="font-medium text-charcoal">{place.displayName}</div>
              {place.formattedAddress && (
                <div className="text-xs text-stone">{place.formattedAddress}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected place display */}
      {selectedPlace && (
        <div className="rounded-lg border border-success/20 bg-success/10 px-4 py-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-success/20 px-2 py-0.5 text-xs font-medium text-success">
                  {typeLabels[selectedPlace.type]}
                </span>
                <span className="font-medium text-charcoal">{selectedPlace.name}</span>
              </div>
              <div className="mt-1 text-xs text-stone">
                {selectedPlace.coordinates.lat.toFixed(4)}, {selectedPlace.coordinates.lng.toFixed(4)}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-stone hover:text-warm-gray"
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
