"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { m, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { durationFast, easeReveal } from "@/lib/motion";
import { PlacesMap, type MapBounds } from "./PlacesMap";
import { PlacesMapCard } from "./PlacesMapCard";
import { AskYukuChat } from "@/components/features/ask-yuku/AskYukuChat";
import type { Location } from "@/types/location";

const PAGE_SIZE = 40;

type PlacesMapLayoutProps = {
  filteredLocations: Location[];
  sortedLocations: Location[];
  totalCount: number;
  onSelectLocation: (location: Location) => void;
  isLoading?: boolean;
  isChatOpen?: boolean;
  onChatClose?: () => void;
  hasActiveChips?: boolean;
  /** When set, the map flies to this location. */
  flyToLocation?: Location | null;
  useCraftTypeColors?: boolean;
  /** When set, drops a "you are here" marker and re-centers on first activation. */
  userLocation?: { lat: number; lng: number } | null;
  /** Distance in km, keyed by location id. Rendered on cards when present. */
  locationDistanceKm?: Map<string, number> | null;
  /** Spatial anchor identifier; when it changes, the map re-fits its bounds. */
  anchorKey?: string;
};

export function PlacesMapLayout({
  filteredLocations,
  sortedLocations,
  onSelectLocation,
  isChatOpen = false,
  onChatClose,
  flyToLocation: externalFlyTo,
  useCraftTypeColors,
  userLocation,
  locationDistanceKm,
  anchorKey,
}: PlacesMapLayoutProps) {
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<Location | null>(null);
  const [page, setPage] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const hoverSourceRef = useRef<"card" | "map" | null>(null);

  // Forward external fly-to (e.g. from URL deep-link)
  useEffect(() => {
    if (externalFlyTo) setFlyToLocation(externalFlyTo);
  }, [externalFlyTo]);

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
      onSelectLocation(location);
    },
    [onSelectLocation],
  );

  const handleCardSelect = useCallback(
    (location: Location) => {
      setFlyToLocation(location);
      onSelectLocation(location);
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

  // Mobile horizontal scroll: track whether right edge is still reachable
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollEdge = useCallback(() => {
    const el = mobileScrollRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  const handleMobileScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    },
    [],
  );

  // Re-check edge when visible locations change
  useEffect(() => {
    checkScrollEdge();
  }, [visibleLocations, checkScrollEdge]);

  const setCardRef = useCallback(
    (locationId: string) => (el: HTMLDivElement | null) => {
      if (el) cardRefsMap.current.set(locationId, el);
      else cardRefsMap.current.delete(locationId);
    },
    [],
  );

  return (
    <>
      {/* Map fills its positioned ancestor (the modal scroll container on
          /places, the page on legacy callers — both work because absolute
          falls back through the tree). top offset still tracks
          --category-bar-h so the map starts below the sticky CategoryBar. */}
      <div
        data-lenis-prevent
        className="absolute inset-x-0 bottom-0 z-20"
        style={{ top: "calc(var(--header-h) + var(--category-bar-h, 56px))" }}
      >
        <div className="relative h-full">
          {/* Full-width map */}
          <ErrorBoundary
            fallback={
              <div className="flex h-full items-center justify-center text-sm text-stone">
                Map unavailable
              </div>
            }
          >
            <PlacesMap
              locations={filteredLocations}
              onBoundsChange={handleBoundsChange}
              onLocationClick={handleLocationClick}
              highlightedLocationId={hoveredLocationId}
              onHoverChange={handleMapHoverChange}
              showResetButton={showResetButton}
              flyToLocation={flyToLocation}
              useCraftTypeColors={useCraftTypeColors}
              userLocation={userLocation ?? null}
              anchorKey={anchorKey}
            />
          </ErrorBoundary>

          {/* Mobile: horizontal snap-scroll strip at bottom */}
          <div className="absolute bottom-3 left-0 right-0 z-10 md:hidden">
            <div
              ref={mobileScrollRef}
              onScroll={handleMobileScroll}
              className="flex pointer-events-auto overflow-x-auto overscroll-contain snap-x snap-mandatory gap-2 px-3 scrollbar-hide"
            >
              {visibleLocations.map((location) => (
                <div key={location.id} className="w-48 shrink-0 snap-start">
                  <PlacesMapCard
                    ref={setCardRef(location.id)}
                    location={location}
                    isHighlighted={hoveredLocationId === location.id}
                    onHover={handleCardHoverChange}
                    onSelect={handleCardSelect}
                    distanceKm={locationDistanceKm?.get(location.id)}
                  />
                </div>
              ))}
            </div>
            {/* Fade edge hint: more cards to the right */}
            <div
              className={cn(
                "pointer-events-none absolute right-0 top-0 bottom-0 w-10 scrim-20 scrim-to-l transition-opacity duration-300",
                canScrollRight ? "opacity-100" : "opacity-0",
              )}
              aria-hidden="true"
            />
          </div>

          {/* Desktop: Floating pill column on left */}
          <div className="absolute top-3 left-3 bottom-3 z-10 hidden w-44 lg:w-56 flex-col pointer-events-none md:flex">
            {/* Count + zoom hint */}
            {boundsFilteredLocations.length > 0 && (
              <div className="mb-1.5 pointer-events-auto">
                <span className="inline-block rounded-lg bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground-secondary backdrop-blur-sm shadow-[var(--shadow-sm)]">
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
                <PlacesMapCard
                  key={location.id}
                  ref={setCardRef(location.id)}
                  location={location}
                  isHighlighted={hoveredLocationId === location.id}
                  onHover={handleCardHoverChange}
                  onSelect={handleCardSelect}
                  distanceKm={locationDistanceKm?.get(location.id)}
                />
              ))}

              {hasMore && (
                <div ref={sentinelRef} className="py-2 flex justify-center">
                  <div className="h-[2px] w-12 bg-charcoal/20 rounded-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <m.div
              className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: durationFast, ease: easeReveal }}
              onClick={onChatClose}
            />
            <m.div
              data-lenis-prevent
              className="fixed z-50 flex flex-col bg-background shadow-[var(--shadow-elevated)]
                inset-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[480px] sm:max-w-[95vw] sm:border-l sm:border-border"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: durationFast, ease: easeReveal }}
              style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
                <h2 className={cn(typography({ intent: "editorial-h3" }), "text-lg md:text-lg")}>Ask Yuku</h2>
                <button
                  onClick={onChatClose}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-[var(--shadow-card)] backdrop-blur-md transition-transform hover:scale-105 hover:bg-surface"
                  aria-label="Close chat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <AskYukuChat onClose={onChatClose} />
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
