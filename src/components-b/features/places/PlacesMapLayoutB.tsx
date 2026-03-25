"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  onSelectLocation?: (location: Location) => void;
  useCraftTypeColors?: boolean;
};

export function PlacesMapLayoutB({
  filteredLocations,
  sortedLocations,
  onSelectLocation,
  useCraftTypeColors,
}: PlacesMapLayoutBProps) {
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<Location | null>(null);
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
      onSelectLocation?.(location);
    },
    [onSelectLocation],
  );

  const handleCardSelect = useCallback(
    (location: Location) => {
      setFlyToLocation(location);
      onSelectLocation?.(location);
    },
    [onSelectLocation],
  );

  // In map view, only show locations that have a pin on the map
  const mappableLocations = useMemo(
    () => sortedLocations.filter((loc) => loc.coordinates?.lat != null && loc.coordinates?.lng != null),
    [sortedLocations],
  );

  const boundsFilteredLocations = useMemo(() => {
    if (!mapBounds) return mappableLocations;
    const { north, south, east, west } = mapBounds;
    return mappableLocations.filter((loc) => {
      const { lat, lng } = loc.coordinates!;
      return lat >= south && lat <= north && lng >= west && lng <= east;
    });
  }, [mappableLocations, mapBounds]);

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

  const mappedCount = mapBounds ? boundsFilteredLocations.length : mappableLocations.length;
  const showResetButton = mapBounds !== null && mappedCount === 0 && mappableLocations.length > 0;

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
      style={{ top: "calc(var(--header-h) + var(--category-bar-h, 56px))" }}
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
            flyToLocation={flyToLocation}
            useCraftTypeColors={useCraftTypeColors}
          />
        </ErrorBoundary>

        {/* Mobile: horizontal snap-scroll strip at bottom */}
        <div className="absolute bottom-3 left-0 right-0 z-10 flex md:hidden pointer-events-auto overflow-x-auto overscroll-contain snap-x snap-mandatory gap-2 px-3 scrollbar-hide">
          {visibleLocations.map((location) => (
            <div key={location.id} className="w-48 shrink-0 snap-start">
              <PlacesMapCardB
                ref={setCardRef(location.id)}
                location={location}
                isHighlighted={hoveredLocationId === location.id}
                onHover={handleCardHoverChange}
                onSelect={handleCardSelect}
              />
            </div>
          ))}
        </div>

        {/* Desktop: Floating pill column — left side, vertical scroll */}
        <div
          className="absolute top-3 left-3 bottom-3 z-10 hidden w-44 lg:w-56 flex-col pointer-events-none md:flex"
        >
          {/* Count + zoom hint */}
          {boundsFilteredLocations.length > 0 && (
            <div className="mb-1.5 pointer-events-auto">
              <span className="inline-block rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-[var(--muted-foreground)]" style={{ boxShadow: "var(--shadow-sm)" }}>
                {boundsFilteredLocations.length.toLocaleString()} places
                {mapBounds && mappedCount <= 10 && mappedCount < mappableLocations.length && (
                  <span className="font-normal"> · Zoom out for more</span>
                )}
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
                onSelect={handleCardSelect}
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
