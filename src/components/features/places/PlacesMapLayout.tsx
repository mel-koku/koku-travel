"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { durationSlow, durationFast, easePageTransitionMut, easeReveal } from "@/lib/motion";
import { PlacesMap, type MapBounds } from "./PlacesMap";
import { PlacesCardPanel } from "./PlacesCardPanel";
import { AskKokuChat } from "@/components/features/ask-koku/AskKokuChat";
import type { Location } from "@/types/location";

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
};

export function PlacesMapLayout({
  filteredLocations,
  sortedLocations,
  totalCount,
  onSelectLocation,
  isLoading,
  isChatOpen = false,
  onChatClose,
  hasActiveChips = false,
  flyToLocation,
  useCraftTypeColors,
}: PlacesMapLayoutProps) {
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const mobileMapRef = useRef<HTMLDivElement>(null);

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  const handleHoverChange = useCallback((locationId: string | null) => {
    setHoveredLocationId(locationId);
  }, []);

  // Filter locations to those within map bounds
  const boundsFilteredLocations = useMemo(() => {
    if (!mapBounds) return sortedLocations;

    const { north, south, east, west } = mapBounds;
    return sortedLocations.filter((loc) => {
      if (!loc.coordinates) return true; // no coords → show in list, no map pin
      const { lat, lng } = loc.coordinates;
      return lat >= south && lat <= north && lng >= west && lng <= east;
    });
  }, [sortedLocations, mapBounds]);

  // Locations that actually have map pins (coords within bounds)
  const mappedCount = mapBounds
    ? boundsFilteredLocations.filter((loc) => loc.coordinates).length
    : sortedLocations.filter((loc) => loc.coordinates).length;

  const showZoomHint = mapBounds !== null && mappedCount <= 10 && mappedCount < totalCount;

  const countLabel = mapBounds
    ? `${boundsFilteredLocations.length.toLocaleString()} of ${totalCount.toLocaleString()} places in view${showZoomHint ? " — Zoom out to see more" : ""}`
    : `${totalCount.toLocaleString()} places`;

  // Show reset button when the map has bounds but no pinned places are visible
  const showResetButton = mapBounds !== null && mappedCount === 0 && sortedLocations.filter((loc) => loc.coordinates).length > 0;

  // Trigger map resize after mobile expand/collapse animation
  const handleAnimationComplete = useCallback(() => {
    const container = mobileMapRef.current?.querySelector<
      HTMLDivElement & { __resizeMap?: () => void }
    >("[aria-label]");
    if (container?.__resizeMap) {
      container.__resizeMap();
    }
  }, []);

  return (
    <>
      {/* Mobile layout (<lg) */}
      <div className="relative lg:hidden">
        <motion.div
          ref={mobileMapRef}
          animate={{ height: mapExpanded ? "70dvh" : "30vh" }}
          transition={{
            duration: durationSlow,
            ease: easePageTransitionMut,
          }}
          onAnimationComplete={handleAnimationComplete}
          className={mapExpanded ? "relative overflow-hidden pt-[env(safe-area-inset-top)]" : "relative overflow-hidden"}
        >
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
              onLocationClick={onSelectLocation}
              highlightedLocationId={hoveredLocationId}
              onHoverChange={handleHoverChange}
              showResetButton={showResetButton}
              flyToLocation={flyToLocation}
              useCraftTypeColors={useCraftTypeColors}
            />
          </ErrorBoundary>

          {/* Count badge */}
          <div className="pointer-events-none absolute top-3 left-3 z-10">
            <span className="rounded-lg bg-background/80 px-3 py-1.5 text-xs text-foreground-secondary backdrop-blur-sm shadow-[var(--shadow-sm)]">
              {countLabel}
            </span>
          </div>

          {/* Tap-to-expand overlay (when collapsed) */}
          {!mapExpanded && (
            <button
              type="button"
              onClick={() => setMapExpanded(true)}
              className="absolute inset-0 z-10"
              aria-label="Expand map"
            >
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-charcoal/60 to-transparent pb-2.5 pt-8">
                <span className="rounded-full bg-charcoal/80 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                  Tap to expand map
                </span>
              </div>
            </button>
          )}

          {/* Collapse button (when expanded) */}
          <AnimatePresence>
            {mapExpanded && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: durationFast, ease: easeReveal }}
                onClick={() => setMapExpanded(false)}
                className="absolute top-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-lg bg-charcoal/80 text-white/90 backdrop-blur-sm transition-colors hover:bg-charcoal"
                aria-label="Collapse map"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Card panel below mobile map */}
        <PlacesCardPanel
          locations={boundsFilteredLocations}
          totalCount={totalCount}
          hasBoundsFilter={mapBounds !== null}
          onSelectLocation={onSelectLocation}
          highlightedLocationId={hoveredLocationId}
          onHoverChange={handleHoverChange}
          isLoading={isLoading}
        />

      </div>

      {/* Desktop layout (lg+) — cards in normal flow, map sticky */}
      <div className="hidden lg:flex lg:flex-row lg:gap-4 lg:px-4">
        {/* Left: Cards flow with the page */}
        <div className="lg:w-1/2">
          <PlacesCardPanel
            locations={boundsFilteredLocations}
            totalCount={totalCount}
            hasBoundsFilter={mapBounds !== null}
            onSelectLocation={onSelectLocation}
            highlightedLocationId={hoveredLocationId}
            onHoverChange={handleHoverChange}
            isLoading={isLoading}
          />
        </div>

        {/* Right: Sticky map pins to viewport while cards scroll */}
        <div className={cn(
          "lg:sticky lg:w-1/2 lg:self-start transition-all duration-300",
          hasActiveChips
            ? "lg:top-[196px] lg:h-[calc(100dvh-212px)]"
            : "lg:top-[160px] lg:h-[calc(100dvh-176px)]"
        )}>
          <div data-lenis-prevent className="relative h-full rounded-lg overflow-hidden border border-border">
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
                onLocationClick={onSelectLocation}
                highlightedLocationId={hoveredLocationId}
                onHoverChange={handleHoverChange}
                showResetButton={showResetButton}
                flyToLocation={flyToLocation}
              />
            </ErrorBoundary>
            <div className="pointer-events-none absolute top-3 left-3 z-10">
              <span className="rounded-lg bg-background/80 px-3 py-1.5 text-xs text-foreground-secondary backdrop-blur-sm shadow-[var(--shadow-sm)]">
                {countLabel}
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* Sticky "Open map" pill — visible on mobile when map is collapsed and scrolled past */}
      {!mapExpanded && (
        <div className="pointer-events-none fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] inset-x-0 z-40 flex justify-center lg:hidden">
          <button
            type="button"
            onClick={() => {
              setMapExpanded(true);
              mobileMapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-charcoal/90 px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-elevated)] backdrop-blur-sm active:scale-[0.98]"
            aria-label="Open map"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Open map
          </button>
        </div>
      )}

      {/* Chat panel — right slide (matches LocationExpanded) */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: durationFast, ease: easeReveal }}
              onClick={onChatClose}
            />
            <motion.div
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
                <h2 className="font-serif text-lg text-foreground">Ask Koku</h2>
                <button
                  onClick={onChatClose}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-[var(--shadow-card)] backdrop-blur-md transition-transform hover:scale-105 hover:bg-surface"
                  aria-label="Close chat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <AskKokuChat onClose={onChatClose} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
