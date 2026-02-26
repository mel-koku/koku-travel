"use client";

import Image from "next/image";
import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { useAppState } from "@/state/AppState";
import { useSavedLocations } from "@/hooks/useSavedLocations";
import { resizePhotoUrl } from "@/lib/google/transformations";

export type SavedInTripPreviewProps = {
  selectedCities: string[] | undefined;
};

export function SavedInTripPreview({
  selectedCities,
}: SavedInTripPreviewProps) {
  const { saved } = useAppState();
  const { data: locations, isLoading } = useSavedLocations(saved);

  // Normalize selected cities for comparison
  const normalizedSelectedCities = useMemo(
    () => new Set((selectedCities ?? []).map((c) => c.toLowerCase().trim())),
    [selectedCities],
  );

  // Filter to locations matching selected cities
  const matchingLocations = useMemo(() => {
    if (!locations || locations.length === 0) return [];
    if (normalizedSelectedCities.size === 0) return locations;
    return locations.filter((loc) => {
      const locationCity = loc.city?.toLowerCase().trim() ?? "";
      return normalizedSelectedCities.has(locationCity);
    });
  }, [locations, normalizedSelectedCities]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 text-sm text-stone">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone border-t-transparent" />
          <span>Checking your saved places...</span>
        </div>
      </div>
    );
  }

  if (matchingLocations.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {matchingLocations.map((location) => (
        <div
          key={location.id}
          className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
        >
          {location.image ? (
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl">
              <Image
                src={resizePhotoUrl(location.image, 400) ?? location.image}
                alt={location.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-surface">
              <MapPin className="h-5 w-5 text-stone" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {location.name}
            </p>
            <span className="text-xs text-stone">
              {location.city}
              {location.category && ` \u00b7 ${location.category}`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
