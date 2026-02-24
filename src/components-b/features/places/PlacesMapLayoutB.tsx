"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlacesMapB, type MapBounds } from "./PlacesMapB";
import { PlacesMapCardB } from "./PlacesMapCardB";
import type { Location } from "@/types/location";

const PAGE_SIZE = 40;

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
}: PlacesMapLayoutBProps) {
  const router = useRouter();
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const hoverSourceRef = useRef<"card" | "map" | null>(null);

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
    setPage(1);
  }, []);

  const handleCardHoverChange = useCallback((locationId: string | null) => {
    hoverSourceRef.current = locationId ? "card" : null;
    setHoveredLocationId(locationId);
  }, []);

  const handleMapHoverChange = useCallback((locationId: string | null) => {
    hoverSourceRef.current = locationId ? "map" : null;
    setHoveredLocationId(locationId);
  }, []);

  const handleLocationClick = useCallback(
    (location: Location) => {
      router.push(`/b/places/${location.id}`);
    },
    [router],
  );

  const boundsFilteredLocations = useMemo(() => {
    if (!mapBounds) return sortedLocations;
    const { north, south, east, west } = mapBounds;
    return sortedLocations.filter((loc) => {
      if (!loc.coordinates) return false;
      const { lat, lng } = loc.coordinates;
      return lat >= south && lat <= north && lng >= west && lng <= east;
    });
  }, [sortedLocations, mapBounds]);

  const visibleLocations = useMemo(
    () => boundsFilteredLocations.slice(0, page * PAGE_SIZE),
    [boundsFilteredLocations, page],
  );
  const hasMore = visibleLocations.length < boundsFilteredLocations.length;

  // Infinite scroll inside the pill column
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setPage((prev) => prev + 1);
      },
      { rootMargin: "0px 0px 200% 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, visibleLocations.length]);

  // Auto-scroll to highlighted pill when map pin hovered
  useEffect(() => {
    if (!hoveredLocationId || hoverSourceRef.current !== "map") return;
    const el = cardRefsMap.current.get(hoveredLocationId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [hoveredLocationId]);

  const showResetButton = mapBounds !== null && boundsFilteredLocations.length === 0;

  const setCardRef = useCallback(
    (locationId: string) => (el: HTMLDivElement | null) => {
      if (el) cardRefsMap.current.set(locationId, el);
      else cardRefsMap.current.delete(locationId);
    },
    [],
  );

  return (
    <div
      data-lenis-prevent
      className="fixed inset-x-0 bottom-0 z-20"
      style={{ top: "calc(var(--header-h) + 52px)" }}
    >
      <div className="relative h-full">
        {/* Full-width map */}
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
            onHoverChange={handleMapHoverChange}
            showResetButton={showResetButton}
          />
        </ErrorBoundary>

        {/* Floating pill column — left side, vertical scroll */}
        <div
          className="absolute top-3 left-3 bottom-3 z-10 flex w-56 flex-col pointer-events-none"
        >
          {/* Count */}
          {boundsFilteredLocations.length > 0 && (
            <div className="mb-1.5 pointer-events-auto">
              <span className="inline-block rounded-lg bg-white/80 backdrop-blur-sm px-2 py-1 text-[11px] font-medium text-[var(--muted-foreground)]" style={{ boxShadow: "var(--shadow-sm)" }}>
                {boundsFilteredLocations.length.toLocaleString()} places
              </span>
            </div>
          )}

          {/* Scrollable pills */}
          <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide space-y-1.5 pointer-events-auto">
            {visibleLocations.map((location) => (
              <PlacesMapCardB
                key={location.id}
                ref={setCardRef(location.id)}
                location={location}
                isHighlighted={hoveredLocationId === location.id}
                onHover={handleCardHoverChange}
              />
            ))}

            {hasMore && (
              <div ref={sentinelRef} className="py-2 flex justify-center">
                <div className="h-[2px] w-12 bg-white/40 rounded-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
