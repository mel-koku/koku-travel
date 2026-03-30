"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Location } from "@/types/location";
import { featureFlags } from "@/lib/env/featureFlags";
import { CategoryBar } from "./CategoryBar";
import { useAllLocationsSingle, useFilterMetadataQuery } from "@/hooks/useLocationsQuery";
import { usePlacesFilters, SORT_OPTIONS, DURATION_FILTERS } from "@/hooks/usePlacesFilters";
import type { PagesContent } from "@/types/sanitySiteContent";

import { SeasonalBanner } from "./SeasonalBanner";
import { getActiveSeasonalHighlight } from "@/lib/utils/seasonUtils";

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
        <p className="font-serif text-2xl sm:text-3xl text-foreground text-center">
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
  const router = useRouter();
  const {
    locations,
    total,
    isLoading,
    error,
  } = useAllLocationsSingle();
  const { data: filterMetadata } = useFilterMetadataQuery();

  const {
    query, setQuery,
    selectedPrefectures, setSelectedPrefectures,
    selectedPriceLevel, setSelectedPriceLevel,
    selectedDuration, setSelectedDuration,
    selectedVibes, setSelectedVibes,
    openNow, setOpenNow,
    wheelchairAccessible, setWheelchairAccessible,
    vegetarianFriendly, setVegetarianFriendly,
    featuredOnly, setFeaturedOnly,
    kokuIds, setKokuIds, clearKokuFilter,
    selectedCity, setSelectedCity,
    selectedCategory, setSelectedCategory,
    jtaApprovedOnly, setJtaApprovedOnly,
    unescoOnly, setUnescoOnly,
    selectedSort, setSelectedSort,
    setPage, hasMore, filterVersion,
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
    setSelectedCategory("in_season");
  }, [setSelectedCategory]);

  const seasonalHighlight = useMemo(() => getActiveSeasonalHighlight(), []);

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  // ── Search input state ──
  const [inputValue, setInputValue] = useState("");

  // Unified clear that resets both hook state and local shell state
  const handleClearAll = useCallback(() => {
    clearAllFilters();
    setInputValue("");
  }, [clearAllFilters]);

  // Sync input → search query
  useEffect(() => {
    setQuery(inputValue);
  }, [inputValue, setQuery]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleInputSubmit = () => {
    // Search is live via useEffect — no-op on submit
  };

  // Auto-open location from ?location= URL param
  const searchParams = useSearchParams();
  const locationParam = searchParams.get("location");
  const didAutoExpandRef = useRef(false);

  // Read URL params once on mount
  const didApplyParamsRef = useRef(false);
  useEffect(() => {
    if (didApplyParamsRef.current) return;
    didApplyParamsRef.current = true;
    const kokuParam = searchParams.get("koku");
    const cityParam = searchParams.get("city");
    const categoryParam = searchParams.get("category");
    const qParam = searchParams.get("q");
    const jtaParam = searchParams.get("jta");
    if (kokuParam) {
      const ids = kokuParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) setKokuIds(ids);
    }
    if (cityParam) setSelectedCity(cityParam);
    if (categoryParam) setSelectedCategory(categoryParam);
    if (qParam) setInputValue(qParam);
    if (jtaParam === "true") setJtaApprovedOnly(true);
    // New filter params
    const sortParam = searchParams.get("sort");
    if (sortParam && ["recommended", "highest_rated", "most_reviews", "price_low", "duration_short"].includes(sortParam)) {
      setSelectedSort(sortParam as typeof selectedSort);
    }
    const prefParam = searchParams.get("prefectures");
    if (prefParam) setSelectedPrefectures(prefParam.split(",").filter(Boolean));
    const vibesParam = searchParams.get("vibes");
    if (vibesParam) setSelectedVibes(vibesParam.split(",").filter(Boolean) as typeof selectedVibes);
    const priceParam = searchParams.get("price");
    if (priceParam !== null && priceParam !== "") setSelectedPriceLevel(Number(priceParam));
    const durParam = searchParams.get("duration");
    if (durParam) setSelectedDuration(durParam);
    if (searchParams.get("openNow") === "true") setOpenNow(true);
    if (searchParams.get("wheelchair") === "true") setWheelchairAccessible(true);
    if (searchParams.get("vegetarian") === "true") setVegetarianFriendly(true);
    if (searchParams.get("featured") === "true") setFeaturedOnly(true);
    if (searchParams.get("unesco") === "true") setUnescoOnly(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [flyToLocation, setFlyToLocation] = useState<Location | null>(null);

  useEffect(() => {
    if (!locationParam || didAutoExpandRef.current || !locations || locations.length === 0) return;

    const match = locations.find((loc) => loc.id === locationParam);
    if (match) {
      setExpandedLocation(match);
      setFlyToLocation(match);
      didAutoExpandRef.current = true;
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
  }, [hasMore, visibleLocations.length, setPage]);

  const handleSelectLocation = useCallback((location: Location) => {
    setExpandedLocation(location);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setExpandedLocation(null);
  }, []);

  const activeCategory = useMemo(() => {
    // Map selected vibes to the closest editorial category for interstitial messages
    const vibeToCategory: Record<string, string> = {
      temples_tradition: "culture",
      foodie_paradise: "food",
      nature_adventure: "nature",
      modern_japan: "shopping",
      art_architecture: "culture",
      zen_wellness: "nature",
    };
    if (selectedVibes.length === 1) {
      return vibeToCategory[selectedVibes[0]!] ?? null;
    }
    return null;
  }, [selectedVibes]);

  const mapAvailable = useMemo(
    () => featureFlags.enableMapbox && !featureFlags.cheapMode,
    [],
  );

  // Grid/Map toggle synced to URL param
  const viewParam = searchParams.get("view");
  const [viewMode, setViewModeState] = useState<"grid" | "map">(
    viewParam === "map" && mapAvailable ? "map" : "grid",
  );

  // Scroll to top when filters change (skip initial mount)
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (viewMode === "grid") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [filterVersion, viewMode]);

  const setViewMode = useCallback(
    (mode: "grid" | "map") => {
      setViewModeState(mode);
    },
    [],
  );

  // Sync all filter state to URL params (debounced)
  const isUrlInitializedRef = useRef(false);
  useEffect(() => {
    if (!isUrlInitializedRef.current) {
      isUrlInitializedRef.current = true;
      return;
    }
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (viewMode === "map") params.set("view", "map");
      if (query) params.set("q", query);
      if (selectedCity) params.set("city", selectedCity);
      if (selectedCategory) params.set("category", selectedCategory);
      if (jtaApprovedOnly) params.set("jta", "true");
      if (selectedSort !== "recommended") params.set("sort", selectedSort);
      if (selectedPrefectures.length > 0) params.set("prefectures", selectedPrefectures.join(","));
      if (selectedVibes.length > 0) params.set("vibes", selectedVibes.join(","));
      if (selectedPriceLevel !== null) params.set("price", String(selectedPriceLevel));
      if (selectedDuration) params.set("duration", selectedDuration);
      if (openNow) params.set("openNow", "true");
      if (wheelchairAccessible) params.set("wheelchair", "true");
      if (vegetarianFriendly) params.set("vegetarian", "true");
      if (featuredOnly) params.set("featured", "true");
      if (unescoOnly) params.set("unesco", "true");
      if (kokuIds.length > 0) params.set("koku", kokuIds.join(","));
      if (locationParam) params.set("location", locationParam);
      const qs = params.toString();
      router.replace(`/places${qs ? `?${qs}` : ""}`, { scroll: false });
    }, 300);
    return () => clearTimeout(timeout);
  }, [
    viewMode, query, selectedCity, selectedCategory, jtaApprovedOnly,
    selectedSort, selectedPrefectures, selectedVibes, selectedPriceLevel,
    selectedDuration, openNow, wheelchairAccessible, vegetarianFriendly,
    featuredOnly, unescoOnly, kokuIds, locationParam, router,
  ]);

  return (
    <div className="min-h-[100dvh] bg-background">
      {viewMode === "grid" && (
        <PlacesIntro totalCount={total} content={content}>
          <SeasonalBanner
            locations={locations}
            onFilterSeasonal={handleFilterSeasonal}
          />
        </PlacesIntro>
      )}

      {/* Error state */}
      {error ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="mx-auto max-w-md px-4 text-center">
            <div className="rounded-lg border border-error/30 bg-error/10 p-4 sm:p-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/20">
                <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-error mb-2">{content?.placesErrorMessage ?? "Something went wrong loading places"}</p>
              <p className="text-sm text-error mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-error px-5 py-2.5 text-sm font-semibold text-white hover:bg-error/90 transition focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
              >
                {content?.placesRetryText ?? "Try again"}
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
        onClearAllFilters={handleClearAll}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onInputSubmit={handleInputSubmit}
        totalCount={activeFilterCount > 0 || kokuIds.length > 0 ? filteredLocations.length : total}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        mapAvailable={mapAvailable}
      />

      {/* Koku filter banner */}
      {kokuIds.length > 0 && (
        <div className="mx-auto mt-3 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-brand-primary/30 bg-brand-primary/10 px-4 py-3 text-sm">
            <div className="flex items-start gap-2.5">
              <svg className="h-5 w-5 shrink-0 text-brand-primary mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 16v-4m0-4h.01" />
              </svg>
              <div>
                <span className="font-medium text-brand-primary">
                  Koku suggested {kokuIds.length} place{kokuIds.length !== 1 ? "s" : ""} for you
                </span>
                <p className="text-xs text-foreground-secondary mt-0.5">
                  Other filters are paused while viewing suggestions.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearKokuFilter}
              className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-primary/10 transition"
            >
              Show all places
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {viewMode === "map" && mapAvailable ? (
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-12 sm:pt-8 sm:pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="rounded-lg bg-surface animate-pulse">
                <div className="aspect-[4/3]" />
                <div className="p-3.5 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-border" />
                  <div className="h-3 w-1/2 rounded bg-border" />
                  <div className="h-3 w-full rounded bg-border" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-12 sm:pt-8 sm:pb-16">
          <LocationEditorialGrid
            locations={visibleLocations}
            onSelect={handleSelectLocation}
            totalCount={total}
            activeCategory={activeCategory}
            onClearFilters={activeFilterCount > 0 ? handleClearAll : undefined}
          />

          {hasMore && (
            <div ref={sentinelRef} className="py-8 flex flex-col items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone/30 border-t-stone" />
              <p className="text-sm text-stone">Loading more places...</p>
            </div>
          )}

          {!hasMore && visibleLocations.length > 0 && (
            <div className="py-16 text-center">
              <p className="font-serif text-lg text-stone">
                {(content?.placesEndMessage ?? "That's all {count}. For now.").replace("{count}", sortedLocations.length.toLocaleString())}
              </p>
            </div>
          )}
        </main>
      )}

      {/* Filter Panel */}
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
        featuredOnly={featuredOnly}
        onFeaturedToggle={setFeaturedOnly}
        unescoOnly={unescoOnly}
        onUnescoToggle={setUnescoOnly}
        resultsCount={activeFilters.length === 0 ? total : filteredLocations.length}
        onClearAll={handleClearAll}
        sortOptions={SORT_OPTIONS}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        seasonalHighlight={seasonalHighlight}
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
