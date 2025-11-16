"use client";

import { useState, useEffect, useRef } from "react";
import type { EntryPoint, EntryPointType } from "@/types/trip";
import { Button } from "@/components/ui/Button";

type AutocompletePlace = {
  placeId: string;
  displayName: string;
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
};

type PlaceWithCoordinates = {
  placeId: string;
  displayName: string;
  formattedAddress?: string;
  location: {
    latitude: number;
    longitude: number;
  };
};

type EntryPointSearchInputProps = {
  type: EntryPointType;
  onSelect: (entryPoint: EntryPoint) => void;
  placeholder?: string;
  initialValue?: EntryPoint;
};

export function EntryPointSearchInput({
  type,
  onSelect,
  placeholder,
  initialValue,
}: EntryPointSearchInputProps) {
  const [searchInput, setSearchInput] = useState(initialValue?.name ?? "");
  const [suggestions, setSuggestions] = useState<AutocompletePlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithCoordinates | null>(null);
  const [cityId, setCityId] = useState<EntryPoint["cityId"]>(initialValue?.cityId);
  const [errors, setErrors] = useState<{ name?: string; coordinates?: string }>({});
  const [isFetchingCoordinates, setIsFetchingCoordinates] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const typeLabels: Record<EntryPointType, string> = {
    airport: "Airport",
    city: "City",
    hotel: "Hotel",
    station: "Station",
  };

  // Map entry point types to Google Places primary types
  const getPrimaryTypes = (entryType: EntryPointType): string[] => {
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
  };

  // Debounced autocomplete search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchInput.trim() || selectedPlace) {
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
            includedPrimaryTypes: getPrimaryTypes(type),
            regionCode: "JP",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          const errorMessage = errorData.error || errorData.message || `Failed to fetch suggestions (${response.status})`;
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setSuggestions(data.places || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Error fetching autocomplete suggestions:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch suggestions";
        setErrors({ name: errorMessage });
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput, type, selectedPlace]);

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
    setSearchInput(place.displayName);
    setShowSuggestions(false);

    // If coordinates are already available from search, use them directly
    if (place.location) {
      setSelectedPlace({
        placeId: place.placeId,
        displayName: place.displayName,
        formattedAddress: place.formattedAddress,
        location: place.location,
      });
      setErrors({});
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
      if (data.place && data.place.location) {
        setSelectedPlace(data.place);
        setErrors({});
      } else {
        throw new Error("Place coordinates not found");
      }
    } catch (error) {
      console.error("Error fetching place coordinates:", error);
      setErrors({ coordinates: "Failed to get location coordinates. Please try again." });
    } finally {
      setIsFetchingCoordinates(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: typeof errors = {};
    if (!searchInput.trim()) {
      newErrors.name = `${typeLabels[type]} name is required`;
    }

    if (!selectedPlace || !selectedPlace.location) {
      newErrors.coordinates = "Please select a place from the suggestions";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Create entry point
    const entryPoint: EntryPoint = {
      type,
      id: initialValue?.id ?? `ep-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: selectedPlace.displayName,
      coordinates: {
        lat: selectedPlace.location.latitude,
        lng: selectedPlace.location.longitude,
      },
      cityId,
      placeId: selectedPlace.placeId, // Store Google Place ID for fetching details
    };

    onSelect(entryPoint);
    setErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setSelectedPlace(null);
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <label htmlFor="entry-point-search" className="block text-sm font-medium text-gray-700 mb-1">
          {typeLabels[type]} Name
        </label>
        <div className="relative">
          <input
            ref={searchInputRef}
            id="entry-point-search"
            type="text"
            value={searchInput}
            onChange={handleInputChange}
            placeholder={placeholder ?? `Search for ${typeLabels[type].toLowerCase()}...`}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-invalid={errors.name ? "true" : "false"}
            aria-describedby={errors.name ? "name-error" : undefined}
            aria-autocomplete="list"
            aria-expanded={showSuggestions && suggestions.length > 0}
            autoComplete="off"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                className="h-4 w-4 animate-spin text-gray-400"
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
            </div>
          )}
        </div>
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600">
            {errors.name}
          </p>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-auto"
            role="listbox"
          >
            {suggestions.map((place) => (
              <button
                key={place.placeId}
                type="button"
                onClick={() => handleSelectPlace(place)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                role="option"
              >
                <div className="font-medium text-gray-900">{place.displayName}</div>
                {place.formattedAddress && (
                  <div className="text-xs text-gray-500">{place.formattedAddress}</div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Selected place info */}
        {selectedPlace && (
          <div className="mt-2 rounded-lg bg-gray-50 p-2 text-sm">
            <div className="font-medium text-gray-900">{selectedPlace.displayName}</div>
            {selectedPlace.formattedAddress && (
              <div className="text-xs text-gray-600">{selectedPlace.formattedAddress}</div>
            )}
            <div className="mt-1 text-xs text-gray-500">
              Coordinates: {selectedPlace.location.latitude.toFixed(4)},{" "}
              {selectedPlace.location.longitude.toFixed(4)}
            </div>
          </div>
        )}

        {isFetchingCoordinates && (
          <div className="mt-2 text-sm text-gray-500">Fetching location...</div>
        )}

        {errors.coordinates && (
          <p className="mt-1 text-sm text-red-600">{errors.coordinates}</p>
        )}
      </div>

      <div>
        <label htmlFor="entry-point-city" className="block text-sm font-medium text-gray-700 mb-1">
          City (Optional)
        </label>
        <select
          id="entry-point-city"
          value={cityId ?? ""}
          onChange={(e) => setCityId((e.target.value || undefined) as EntryPoint["cityId"])}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">None</option>
          <option value="kyoto">Kyoto</option>
          <option value="osaka">Osaka</option>
          <option value="nara">Nara</option>
          <option value="tokyo">Tokyo</option>
          <option value="yokohama">Yokohama</option>
        </select>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="submit" variant="primary" disabled={isFetchingCoordinates}>
          {isFetchingCoordinates ? "Loading..." : "Save Entry Point"}
        </Button>
      </div>
    </form>
  );
}

