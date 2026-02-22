"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Location } from "@/types/location";
import { featureFlags } from "@/lib/env/featureFlags";
import { CategoryBar } from "./CategoryBar";
import { useAllLocationsSingle, useFilterMetadataQuery } from "@/hooks/useLocationsQuery";
import { usePlacesFilters, SORT_OPTIONS, DURATION_FILTERS } from "@/hooks/usePlacesFilters";
import type { PagesContent } from "@/types/sanitySiteContent";
import { VideoImportInput } from "@/components/features/video-import/VideoImportInput";
import { SeasonalBanner } from "./SeasonalBanner";
import { useToast } from "@/context/ToastContext";
import type { VibeId } from "@/data/vibes";

/* ── Dynamic imports ─────────────────────────────────────────────────
 * Heavy components are code-split so Turbopack compiles them in
 * separate chunks. This keeps the initial PlacesShell bundle small
 * and removes framer-motion from the critical compilation path.
 * ----------------------------------------------------------------- */

const PlacesIntro = dynamic(
  () => import("./PlacesIntro").then((m) => ({ default: m.PlacesIntro })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <p className="font-serif italic text-2xl sm:text-3xl text-foreground text-center">
          Places in Japan
        </p>
      </div>
    ),
  }
);

const FilterPanel = dynamic(
  () => import("./FilterPanel").then((m) => ({ default: m.FilterPanel })),
  { ssr: false }
);

const PlacesMapLayout = dynamic(
  () => import("./PlacesMapLayout").then((m) => ({ default: m.PlacesMapLayout })),
  { ssr: false }
);

const LocationExpanded = dynamic(
  () => import("./LocationExpanded").then((m) => ({ default: m.LocationExpanded })),
  { ssr: false }
);

const LocationEditorialGrid = dynamic(
  () => import("./LocationEditorialGrid").then((m) => ({ default: m.LocationEditorialGrid })),
  { ssr: false }
);

type PlacesShellProps = {
  content?: PagesContent;
};

export function PlacesShell({ content }: PlacesShellProps) {
  const {
    locations,
    total,
    isLoading,
    error,
  } = useAllLocationsSingle();
  const { data: filterMetadata } = useFilterMetadataQuery();

  // Filter + sort + pagination state extracted to hook
  const {
    query, setQuery,
    selectedPrefectures, setSelectedPrefectures,
    selectedPriceLevel, setSelectedPriceLevel,
    selectedDuration, setSelectedDuration,
    selectedVibes, setSelectedVibes,
    openNow, setOpenNow,
    wheelchairAccessible, setWheelchairAccessible,
    vegetarianFriendly, setVegetarianFriendly,
    selectedSort, setSelectedSort,
    setPage, hasMore,
    filteredLocations,
    sortedLocations,
    visibleLocations,
    prefectureOptions,
    activeFilters,
    activeFilterCount,
    removeFilter,
    clearAllFilters,
  } = usePlacesFilters(locations, filterMetadata);

  const handleFilterSeasonal = useCallback(() => {
    setSelectedSort("in_season");
    setSelectedVibes((prev: VibeId[]) =>
      prev.includes("in_season") ? prev : [...prev, "in_season" as VibeId]
    );
  }, [setSelectedSort, setSelectedVibes]);

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVideoImportOpen, setIsVideoImportOpen] = useState(false);
  const { showToast } = useToast();

  // Auto-open location from ?location= URL param (e.g. from video import "View" button)
  const searchParams = useSearchParams();
  const locationParam = searchParams.get("location");
  const didAutoExpandRef = useRef(false);
  const [flyToLocation, setFlyToLocation] = useState<Location | null>(null);

  useEffect(() => {
    if (!locationParam || didAutoExpandRef.current || !locations || locations.length === 0) return;

    const match = locations.find((loc) => loc.id === locationParam);
    if (match) {
      setExpandedLocation(match);
      setFlyToLocation(match);
      didAutoExpandRef.current = true;
      // Clean the URL param so back-navigation doesn't re-trigger
      window.history.replaceState(null, "", "/places");
    }
  }, [locationParam, locations]);

  // IntersectionObserver for progressive loading
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPage((current) => current + 1);
        }
      },
      { rootMargin: "0px 0px 200% 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, visibleLocations.length]);

  const handleSelectLocation = useCallback((location: Location) => {
    setExpandedLocation(location);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setExpandedLocation(null);
  }, []);

  // Determine active category for interstitials (null when using vibe filters)
  const activeCategory = null;

  const mapAvailable = useMemo(
    () => featureFlags.enableMapbox && !featureFlags.cheapMode,
    [],
  );

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Typographic Intro — always renders immediately for entrance animation */}
      <PlacesIntro totalCount={total} content={content} />

      {/* Error state */}
      {error ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="mx-auto max-w-md px-4 text-center">
            <div className="rounded-2xl border border-error/30 bg-error/10 p-4 sm:p-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/20">
                <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-error mb-2">{content?.placesErrorMessage ?? "Something went wrong loading places"}</p>
              <p className="text-sm text-error mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-error px-5 py-2.5 text-sm font-semibold text-white hover:bg-error/90 transition focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
              >
                {content?.placesRetryText ?? "Try again"}
              </button>
            </div>
          </div>
        </div>
      ) : (
      <>
      {/* Sticky Category Bar — renders immediately, doesn't wait for data */}
      <CategoryBar
        onFiltersClick={() => setIsFilterPanelOpen(true)}
        activeFilterCount={activeFilterCount}
        activeFilters={activeFilters}
        onRemoveFilter={removeFilter}
        onClearAllFilters={clearAllFilters}
        query={query}
        onQueryChange={setQuery}
        onAskKokuClick={() => setIsChatOpen(true)}
        isChatOpen={isChatOpen}
        onVideoImportClick={() => setIsVideoImportOpen((prev) => !prev)}
        isVideoImportOpen={isVideoImportOpen}
      />

      {/* Seasonal banner */}
      <div className="mt-3">
        <SeasonalBanner
          locations={locations}
          onFilterSeasonal={handleFilterSeasonal}
        />
      </div>

      {/* Breathing room between search bar and content */}
      <div className="h-4 sm:h-6" aria-hidden="true" />

      {/* Video Import Panel */}
      {isVideoImportOpen && (
        <div className="mx-auto max-w-md px-4 pb-6">
          <VideoImportInput
            onImportComplete={(locationId, isNew) => {
              setIsVideoImportOpen(false);
              showToast(
                isNew ? "New location added to Koku" : "Found in Koku",
                { variant: "success" },
              );
              const match = locations?.find((loc) => loc.id === locationId);
              if (match) {
                setExpandedLocation(match);
                setFlyToLocation(match);
              } else {
                window.location.href = `/places?location=${locationId}`;
              }
            }}
          />
        </div>
      )}

      {/* Main Content — Map starts loading tiles immediately, cards show skeleton until data arrives */}
      {mapAvailable ? (
        <PlacesMapLayout
          filteredLocations={filteredLocations}
          sortedLocations={sortedLocations}
          totalCount={total}
          onSelectLocation={handleSelectLocation}
          isLoading={isLoading}
          isChatOpen={isChatOpen}
          onChatClose={() => setIsChatOpen(false)}
          hasActiveChips={activeFilters.filter((f) => f.type !== "search").length > 0}
          flyToLocation={flyToLocation}
        />
      ) : isLoading ? (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="space-y-10">
            <div className="aspect-[16/9] rounded-xl shimmer" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="aspect-[3/4] rounded-xl shimmer" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          {/* Editorial Grid */}
          <LocationEditorialGrid
            locations={visibleLocations}
            onSelect={handleSelectLocation}
            totalCount={total}
            activeCategory={activeCategory}
          />

          {/* Progressive loading sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="py-8 flex justify-center">
              <div className="h-[2px] w-32 bg-brand-primary/30 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-brand-primary rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {/* End state */}
          {!hasMore && visibleLocations.length > 0 && (
            <div className="py-16 text-center">
              <p className="font-serif italic text-lg text-stone">
                {(content?.placesEndMessage ?? "That's all {count}. For now.").replace("{count}", sortedLocations.length.toLocaleString())}
              </p>
            </div>
          )}
        </main>
      )}

      {/* Filter Panel (right slide) */}
      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        query={query}
        onQueryChange={setQuery}
        prefectureOptions={prefectureOptions}
        selectedPrefectures={selectedPrefectures}
        onPrefecturesChange={setSelectedPrefectures}
        selectedVibes={selectedVibes}
        onVibesChange={setSelectedVibes}
        selectedPriceLevel={selectedPriceLevel}
        onPriceLevelChange={setSelectedPriceLevel}
        durationOptions={DURATION_FILTERS.map(({ id, label }) => ({
          value: id,
          label,
        }))}
        selectedDuration={selectedDuration}
        onDurationChange={setSelectedDuration}
        openNow={openNow}
        onOpenNowChange={setOpenNow}
        wheelchairAccessible={wheelchairAccessible}
        onWheelchairAccessibleChange={setWheelchairAccessible}
        vegetarianFriendly={vegetarianFriendly}
        onVegetarianFriendlyChange={setVegetarianFriendly}
        resultsCount={activeFilters.length === 0 ? total : filteredLocations.length}
        onClearAll={clearAllFilters}
        sortOptions={SORT_OPTIONS}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
      />

      {/* Location Detail Panel */}
      {expandedLocation && (
        <LocationExpanded
          location={expandedLocation}
          onClose={handleCloseExpanded}
        />
      )}
      </>
      )}
    </div>
  );
}
