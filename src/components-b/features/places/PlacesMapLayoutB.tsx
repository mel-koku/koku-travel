"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlacesMapB, type MapBounds } from "./PlacesMapB";
import { resizePhotoUrl } from "@/lib/google/transformations";
import type { Location } from "@/types/location";

type PlacesMapLayoutBProps = {
  filteredLocations: Location[];
  sortedLocations: Location[];
  totalCount: number;
  isLoading?: boolean;
  hasActiveChips?: boolean;
};

export function PlacesMapLayoutB({
  filteredLocations,
  sortedLocations,
  totalCount,
}: PlacesMapLayoutBProps) {
  const router = useRouter();
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  const handleHoverChange = useCallback((locationId: string | null) => {
    setHoveredLocationId(locationId);
  }, []);

  const handleLocationClick = useCallback((location: Location) => {
    router.push(`/b/places/${location.id}`);
  }, [router]);

  const boundsFilteredLocations = useMemo(() => {
    if (!mapBounds) return sortedLocations;
    const { north, south, east, west } = mapBounds;
    return sortedLocations.filter((loc) => {
      if (!loc.coordinates) return false;
      const { lat, lng } = loc.coordinates;
      return lat >= south && lat <= north && lng >= west && lng <= east;
    });
  }, [sortedLocations, mapBounds]);

  const showZoomHint = mapBounds !== null && boundsFilteredLocations.length <= 10 && boundsFilteredLocations.length < totalCount;

  const countLabel = mapBounds
    ? `${boundsFilteredLocations.length.toLocaleString()} of ${totalCount.toLocaleString()} places in view${showZoomHint ? " — Zoom out to see more" : ""}`
    : `${totalCount.toLocaleString()} places`;

  const showResetButton = mapBounds !== null && boundsFilteredLocations.length === 0;

  // Floating strip shows top 20 in-bounds locations
  const stripLocations = boundsFilteredLocations.slice(0, 20);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ height: "calc(100dvh - var(--header-h) - 120px)" }}
      >
        <ErrorBoundary
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">
              Map unavailable
            </div>
          }
        >
          <PlacesMapB
            locations={filteredLocations}
            onBoundsChange={handleBoundsChange}
            onLocationClick={handleLocationClick}
            highlightedLocationId={hoveredLocationId}
            onHoverChange={handleHoverChange}
            showResetButton={showResetButton}
          />
        </ErrorBoundary>

        {/* Count badge */}
        <div className="pointer-events-none absolute top-3 left-3 z-10">
          <span
            className="rounded-lg bg-white/85 px-3 py-1.5 text-xs text-[var(--muted-foreground)] backdrop-blur-sm"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            {countLabel}
          </span>
        </div>

        {/* Floating card strip */}
        {stripLocations.length > 0 && (
          <div className="absolute bottom-4 inset-x-4 z-10">
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1">
              {stripLocations.map((loc) => {
                const thumb = resizePhotoUrl(loc.primaryPhotoUrl ?? loc.image, 128);
                return (
                  <Link
                    key={loc.id}
                    href={`/b/places/${loc.id}`}
                    className="snap-start shrink-0 flex items-center gap-2.5 rounded-xl bg-white/95 backdrop-blur-sm px-3 py-2.5 transition hover:shadow-[var(--shadow-elevated)]"
                    style={{ boxShadow: "var(--shadow-card)" }}
                    onMouseEnter={() => handleHoverChange(loc.id)}
                    onMouseLeave={() => handleHoverChange(null)}
                  >
                    {thumb && (
                      <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden">
                        <Image
                          src={thumb}
                          alt={loc.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    )}
                    <div className="min-w-0 max-w-[140px]">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{loc.name}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)] truncate">{loc.city}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
