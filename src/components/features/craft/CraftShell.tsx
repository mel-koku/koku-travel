"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { featureFlags } from "@/lib/env/featureFlags";
import { CategoryBar } from "@/components/features/places/CategoryBar";
import { useCraftLocations } from "@/hooks/useCraftLocations";
import { useCraftFilters, CRAFT_SORT_OPTIONS, DURATION_FILTERS } from "@/hooks/useCraftFilters";
import type { Location } from "@/types/location";
import { CRAFT_TYPES, type CraftTypeId } from "@/data/craftTypes";

/* ── Dynamic imports ────────────────────────────────────── */

const CraftIntro = dynamic(
  () => import("./CraftIntro").then((m) => ({ default: m.CraftIntro })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <p className="font-serif text-2xl sm:text-3xl text-foreground text-center">
          Traditional Crafts
        </p>
      </div>
    ),
  },
);

const CraftTaxonomy = dynamic(
  () => import("./CraftTaxonomy").then((m) => ({ default: m.CraftTaxonomy })),
  { ssr: false },
);

const CraftFilterPanel = dynamic(
  () => import("./CraftFilterPanel").then((m) => ({ default: m.CraftFilterPanel })),
  { ssr: false },
);

const CraftWorkshopSection = dynamic(
  () => import("./CraftWorkshopSection").then((m) => ({ default: m.CraftWorkshopSection })),
  { ssr: false },
);

const CraftSeasonalBanner = dynamic(
  () => import("./CraftSeasonalBanner").then((m) => ({ default: m.CraftSeasonalBanner })),
  { ssr: false },
);

const PlacesMapLayout = dynamic(
  () => import("@/components/features/places/PlacesMapLayout").then((m) => ({ default: m.PlacesMapLayout })),
  { ssr: false },
);

const LocationExpanded = dynamic(
  () => import("@/components/features/places/LocationExpanded").then((m) => ({ default: m.LocationExpanded })),
  { ssr: false },
);

const LocationEditorialGrid = dynamic(
  () => import("@/components/features/places/LocationEditorialGrid").then((m) => ({ default: m.LocationEditorialGrid })),
  { ssr: false },
);

/* ── Shell ────────────────────────────────────────────────── */

export function CraftShell() {
  const searchParams = useSearchParams();
  const { locations, total, isLoading, isError, error } = useCraftLocations();

  const {
    setQuery,
    selectedCraftType, setSelectedCraftType,
    selectedPrefectures, setSelectedPrefectures,
    selectedDuration, setSelectedDuration,
    selectedSort, setSelectedSort,
    setPage, hasMore,
    filteredLocations,
    sortedLocations,
    visibleLocations,
    prefectureOptions,
    craftTypeCounts,
    activeFilters,
    activeFilterCount,
    removeFilter,
    clearAllFilters,
  } = useCraftFilters(locations);

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<Location | null>(null);

  // ── Search input state ──
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    setQuery(inputValue);
  }, [inputValue, setQuery]);

  // ── Sync ?type= URL param ──
  const typeParam = searchParams.get("type");

  useEffect(() => {
    if (typeParam && CRAFT_TYPES.some((ct) => ct.id === typeParam)) {
      setSelectedCraftType(typeParam as CraftTypeId);
    }
  }, [typeParam, setSelectedCraftType]);

  // ── Deep-link ?location= ──
  const locationParam = searchParams.get("location");
  const didAutoExpandRef = useRef(false);

  useEffect(() => {
    if (!locationParam || didAutoExpandRef.current || !locations || locations.length === 0) return;

    const match = locations.find((loc) => loc.id === locationParam);
    if (match) {
      setExpandedLocation(match);
      setFlyToLocation(match);
      didAutoExpandRef.current = true;
      window.history.replaceState(null, "", "/crafts");
    }
  }, [locationParam, locations]);

  // ── Infinite scroll ──
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
  }, [hasMore, visibleLocations.length, setPage]);

  const handleSelectLocation = useCallback((location: Location) => {
    setExpandedLocation(location);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setExpandedLocation(null);
  }, []);

  const mapAvailable = useMemo(
    () => featureFlags.enableMapbox && !featureFlags.cheapMode,
    [],
  );

  // ── Best photo per craft type for taxonomy cards ──
  // Prefer unique location photos; fall back to curated thumbnails from CRAFT_TYPES
  const craftTypeImages = useMemo(() => {
    const map = new Map<string, string>();
    // Collect distinct photos per type from real location data
    if (locations?.length) {
      const seen = new Map<string, Set<string>>();
      const best = new Map<string, { photo: string; rating: number }>();
      for (const loc of locations) {
        const photo = loc.primaryPhotoUrl || loc.image;
        if (!loc.craftType || !photo) continue;
        const urls = seen.get(loc.craftType) ?? new Set();
        urls.add(photo);
        seen.set(loc.craftType, urls);
        const prev = best.get(loc.craftType);
        if (!prev || (loc.rating ?? 0) > prev.rating) {
          best.set(loc.craftType, { photo, rating: loc.rating ?? 0 });
        }
      }
      // Only use location photos if the type has more than one distinct image
      for (const [type, urls] of seen) {
        if (urls.size > 1) {
          map.set(type, best.get(type)!.photo);
        }
      }
    }
    // Fill remaining types with curated thumbnails
    for (const ct of CRAFT_TYPES) {
      if (!map.has(ct.id)) {
        map.set(ct.id, ct.thumbnail);
      }
    }
    return map;
  }, [locations]);

  const handleTaxonomySelect = useCallback((craftType: CraftTypeId) => {
    setSelectedCraftType(craftType);
  }, [setSelectedCraftType]);

  return (
    <div className="min-h-[100dvh] bg-background">
      <CraftIntro totalCount={total} />

      <CraftSeasonalBanner onSelectCraftType={handleTaxonomySelect} />

      {/* Error state */}
      {isError ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="mx-auto max-w-md px-4 text-center">
            <div className="rounded-xl border border-error/30 bg-error/10 p-4 sm:p-8">
              <p className="text-base font-semibold text-error mb-2">Something went wrong loading workshops</p>
              <p className="text-sm text-error mb-6">{error ?? "Please try again."}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-error px-5 py-2.5 text-sm font-semibold text-white hover:bg-error/90 transition focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <CategoryBar
            onFiltersClick={() => setIsFilterPanelOpen(true)}
            activeFilterCount={activeFilterCount}
            activeFilters={activeFilters}
            onRemoveFilter={removeFilter}
            onClearAllFilters={clearAllFilters}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onInputSubmit={() => {}}
          />

          {/* Taxonomy grid — shown when no active type filter */}
          {!selectedCraftType && (
            <div className="mt-4">
              <CraftTaxonomy counts={craftTypeCounts} onSelect={handleTaxonomySelect} images={craftTypeImages} />
            </div>
          )}

          {/* Workshop experiences carousel */}
          <CraftWorkshopSection selectedCraftType={selectedCraftType} />

          {/* Breathing room */}
          <div className="h-4 sm:h-6" aria-hidden="true" />

          {/* Main content */}
          {mapAvailable ? (
            <PlacesMapLayout
              filteredLocations={filteredLocations}
              sortedLocations={sortedLocations}
              totalCount={total}
              onSelectLocation={handleSelectLocation}
              isLoading={isLoading}
              isChatOpen={false}
              onChatClose={() => {}}
              hasActiveChips={activeFilters.filter((f) => f.type !== "search").length > 0}
              flyToLocation={flyToLocation}
              useCraftTypeColors
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
              <LocationEditorialGrid
                locations={visibleLocations}
                onSelect={handleSelectLocation}
                totalCount={total}
                activeCategory={null}
              />

              {hasMore && (
                <div ref={sentinelRef} className="py-8 flex justify-center">
                  <div className="h-[2px] w-32 bg-brand-primary/30 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-brand-primary rounded-full animate-pulse" />
                  </div>
                </div>
              )}

              {!hasMore && visibleLocations.length > 0 && (
                <div className="py-16 text-center">
                  <p className="font-serif text-lg text-stone">
                    That&apos;s all {sortedLocations.length.toLocaleString()} workshops.
                  </p>
                </div>
              )}
            </main>
          )}

          {/* Filter Panel */}
          <CraftFilterPanel
            isOpen={isFilterPanelOpen}
            onClose={() => setIsFilterPanelOpen(false)}
            selectedCraftType={selectedCraftType}
            onCraftTypeChange={setSelectedCraftType}
            craftTypeCounts={craftTypeCounts}
            prefectureOptions={prefectureOptions}
            selectedPrefectures={selectedPrefectures}
            onPrefecturesChange={setSelectedPrefectures}
            durationOptions={DURATION_FILTERS.map(({ id, label }) => ({
              value: id,
              label,
            }))}
            selectedDuration={selectedDuration}
            onDurationChange={setSelectedDuration}
            sortOptions={CRAFT_SORT_OPTIONS}
            selectedSort={selectedSort}
            onSortChange={setSelectedSort}
            resultsCount={activeFilters.length === 0 ? total : filteredLocations.length}
            onClearAll={clearAllFilters}
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
