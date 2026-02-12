"use client";

import Image from "next/image";
import { X, AlertTriangle, MapPin } from "lucide-react";
import { useWishlistLocations } from "@/hooks/useWishlistLocations";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { cn } from "@/lib/cn";

export type SavedLocationsPreviewProps = {
  locationIds: string[];
  selectedCities: string[] | undefined;
  onRemove: (id: string) => void;
};

export function SavedLocationsPreview({
  locationIds,
  selectedCities,
  onRemove,
}: SavedLocationsPreviewProps) {
  const { data: locations, isLoading, error } = useWishlistLocations(locationIds);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center gap-2 text-sm text-stone">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone border-t-transparent" />
          <span>Loading saved places...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-destructive">Couldn&apos;t load your saved places — try refreshing.</p>
      </div>
    );
  }

  if (!locations || locations.length === 0) {
    return null;
  }

  // Normalize selected cities for comparison
  const normalizedSelectedCities = new Set(
    (selectedCities ?? []).map((c) => c.toLowerCase().trim())
  );

  return (
    <div className="flex flex-col gap-2">
      {locations.map((location) => {
        const locationCity = location.city?.toLowerCase().trim() ?? "";
        const isCitySelected =
          normalizedSelectedCities.size === 0 ||
          normalizedSelectedCities.has(locationCity);

        return (
          <div
            key={location.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3",
              isCitySelected
                ? "border-border bg-background"
                : "border-warning/20 bg-warning/5"
            )}
          >
            {/* Location Image */}
            {location.image ? (
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={resizePhotoUrl(location.image, 400) ?? location.image}
                  alt={location.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-surface">
                <MapPin className="h-5 w-5 text-stone" />
              </div>
            )}

            {/* Location Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {location.name}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone">
                  {location.city}
                  {location.category && ` \u00b7 ${location.category}`}
                </span>
                {!isCitySelected && (
                  <span className="flex items-center gap-1 text-xs text-warning">
                    <AlertTriangle className="h-3 w-3" />
                    Not in selected cities
                  </span>
                )}
              </div>
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={() => onRemove(location.id)}
              className="flex-shrink-0 rounded-full p-2.5 text-stone hover:bg-surface hover:text-foreground"
              aria-label={`Remove ${location.name}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
