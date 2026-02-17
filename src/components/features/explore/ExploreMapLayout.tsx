"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { durationSlow, durationFast, easePageTransitionMut, easeReveal } from "@/lib/motion";
import { ExploreMap, type MapBounds } from "./ExploreMap";
import { ExploreCardPanel } from "./ExploreCardPanel";
import { AskKokuChat } from "@/components/features/ask-koku/AskKokuChat";
import type { Location } from "@/types/location";

type ExploreMapLayoutProps = {
  filteredLocations: Location[];
  sortedLocations: Location[];
  totalCount: number;
  onSelectLocation: (location: Location) => void;
  isLoading?: boolean;
  isChatOpen?: boolean;
  onChatClose?: () => void;
  hasActiveChips?: boolean;
};

export function ExploreMapLayout({
  filteredLocations,
  sortedLocations,
  totalCount,
  onSelectLocation,
  isLoading,
  isChatOpen = false,
  onChatClose,
  hasActiveChips = false,
}: ExploreMapLayoutProps) {
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
      if (!loc.coordinates) return false;
      const { lat, lng } = loc.coordinates;
      return lat >= south && lat <= north && lng >= west && lng <= east;
    });
  }, [sortedLocations, mapBounds]);

  const countLabel = mapBounds
    ? `${boundsFilteredLocations.length.toLocaleString()} of ${totalCount.toLocaleString()} places in view`
    : `${totalCount.toLocaleString()} places`;

  // Show reset button when the map has loaded bounds but no places are visible
  const showResetButton = mapBounds !== null && boundsFilteredLocations.length === 0;

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
            <ExploreMap
              locations={filteredLocations}
              onBoundsChange={handleBoundsChange}
              onLocationClick={onSelectLocation}
              highlightedLocationId={hoveredLocationId}
              onHoverChange={handleHoverChange}
              showResetButton={showResetButton}
            />
          </ErrorBoundary>

          {/* Count badge */}
          <div className="pointer-events-none absolute top-3 left-3 z-10">
            <span className="rounded-lg bg-background/80 px-3 py-1.5 text-xs text-foreground-secondary backdrop-blur-sm shadow-sm">
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
                className="absolute top-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-xl bg-charcoal/80 text-white/90 backdrop-blur-sm transition-colors hover:bg-charcoal"
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
        <ExploreCardPanel
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
          <ExploreCardPanel
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
          <div data-lenis-prevent className="relative h-full rounded-2xl overflow-hidden border border-border">
            <ErrorBoundary
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-stone">
                  Map unavailable
                </div>
              }
            >
              <ExploreMap
                locations={filteredLocations}
                onBoundsChange={handleBoundsChange}
                onLocationClick={onSelectLocation}
                highlightedLocationId={hoveredLocationId}
                onHoverChange={handleHoverChange}
                showResetButton={showResetButton}
              />
            </ErrorBoundary>
            <div className="pointer-events-none absolute top-3 left-3 z-10">
              <span className="rounded-lg bg-background/80 px-3 py-1.5 text-xs text-foreground-secondary backdrop-blur-sm shadow-sm">
                {countLabel}
              </span>
            </div>

          </div>
        </div>
      </div>

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
              className="fixed z-50 flex flex-col bg-background shadow-2xl
                inset-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[480px] sm:max-w-[95vw] sm:border-l sm:border-border"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: durationFast, ease: easeReveal }}
              style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
                <h2 className="font-serif italic text-lg text-foreground">Ask Koku</h2>
                <button
                  onClick={onChatClose}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-md backdrop-blur-md transition-transform hover:scale-105 hover:bg-surface"
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
