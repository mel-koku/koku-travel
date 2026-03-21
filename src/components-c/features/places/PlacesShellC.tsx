"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { featureFlags } from "@/lib/env/featureFlags";
import { CategoryBarC } from "./CategoryBarC";
import { useAllLocationsSingle, useFilterMetadataQuery } from "@/hooks/useLocationsQuery";
import { usePlacesFilters, SORT_OPTIONS, DURATION_FILTERS } from "@/hooks/usePlacesFilters";
import type { PagesContent } from "@/types/sanitySiteContent";
import type { Location } from "@/types/location";

import { SeasonalBannerC } from "./SeasonalBannerC";

import { getParentCategoryForDatabaseCategory } from "@/data/categoryHierarchy";
import type { VibeId } from "@/data/vibes";

/* -- Dynamic imports -- */

const PlacesIntroC = dynamic(
  () => import("./PlacesIntroC").then((m) => ({ default: m.PlacesIntroC })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-start px-6 lg:px-10 pt-32 lg:pt-36 pb-4">
        <div className="h-3 w-40 bg-[var(--border)] mb-4" />
        <div className="h-10 w-96 max-w-full bg-[var(--border)]" />
      </div>
    ),
  },
);

const FilterPanelC = dynamic(
  () => import("./FilterPanelC").then((m) => ({ default: m.FilterPanelC })),
  { ssr: false },
);

const PlacesGridC = dynamic(
  () => import("./PlacesGridC").then((m) => ({ default: m.PlacesGridC })),
  { ssr: false },
);

const PlacesMapLayoutC = dynamic(
  () => import("./PlacesMapLayoutC").then((m) => ({ default: m.PlacesMapLayoutC })),
  { ssr: false },
);

const PlaceDetailPanelC = dynamic(
  () => import("./PlaceDetailPanelC").then((m) => ({ default: m.PlaceDetailPanelC })),
  { ssr: false },
);

type PlacesShellCProps = {
  content?: PagesContent;
};

/* -- Helpers -- */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* -- Category tab definitions -- */

const PARENT_CATEGORIES = [
  { id: "culture", label: "Culture" },
  { id: "food", label: "Food" },
  { id: "nature", label: "Nature" },
  { id: "shopping", label: "Shopping" },
  { id: "view", label: "View" },
  { id: "entertainment", label: "Entertainment" },
] as const;

export function PlacesShellC({ content }: PlacesShellCProps) {
  const router = useRouter();
  const { locations, total, isLoading, error } = useAllLocationsSingle();
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
    setSelectedCity,
    setSelectedCategory: applyKokuCategory,
    setJtaApprovedOnly,
    selectedSort, setSelectedSort,
    filteredLocations,
    sortedLocations,
    prefectureOptions,
    activeFilters,
    activeFilterCount,
    removeFilter,
    clearAllFilters,
  } = usePlacesFilters(locations, filterMetadata);

  const handleFilterSeasonal = useCallback(() => {
    setSelectedSort("in_season");
    setSelectedVibes((prev: VibeId[]) =>
      prev.includes("in_season") ? prev : [...prev, "in_season" as VibeId],
    );
  }, [setSelectedSort, setSelectedVibes]);

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const [viewMode, setViewModeState] = useState<"grid" | "map">(
    viewParam === "map" ? "map" : "grid",
  );

  // Sync viewMode to ?view= search param so back-navigation restores it
  const setViewMode = useCallback(
    (mode: "grid" | "map") => {
      setViewModeState(mode);
      const params = new URLSearchParams(searchParams.toString());
      if (mode === "map") {
        params.set("view", "map");
      } else {
        params.delete("view");
      }
      const qs = params.toString();
      router.replace(`/c/places${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams],
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // -- Category tab counts --
  const categoryCounts = useMemo(() => {
    if (!sortedLocations) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (const loc of sortedLocations) {
      const parent = getParentCategoryForDatabaseCategory(loc.category);
      if (parent) {
        counts.set(parent, (counts.get(parent) ?? 0) + 1);
      }
    }
    return counts;
  }, [sortedLocations]);

  const categoryTabs = useMemo(() => {
    const allCount = sortedLocations?.length ?? 0;
    const tabs = [{ id: null as string | null, label: "All", count: allCount }];
    for (const cat of PARENT_CATEGORIES) {
      const count = categoryCounts.get(cat.id) ?? 0;
      if (count > 0) {
        tabs.push({ id: cat.id, label: cat.label, count });
      }
    }
    return tabs;
  }, [sortedLocations, categoryCounts]);

  // -- Category-filtered locations --
  const categoryFilteredLocations = useMemo(() => {
    if (!selectedCategory) return sortedLocations;
    return sortedLocations.filter((loc) => {
      const parent = getParentCategoryForDatabaseCategory(loc.category);
      return parent === selectedCategory;
    });
  }, [sortedLocations, selectedCategory]);

  // -- Search input state --
  const [inputValue, setInputValue] = useState("");

  // Sync input to search query
  useEffect(() => {
    setQuery(inputValue);
  }, [inputValue, setQuery]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleInputSubmit = () => {
    // Search is live via useEffect
  };

  // -- Slug maps for clean ?location= URLs --
  const { idToSlug, slugToLocation } = useMemo(() => {
    if (!locations || locations.length === 0) return { idToSlug: new Map<string, string>(), slugToLocation: new Map<string, Location>() };

    const groups = new Map<string, Location[]>();
    for (const loc of locations) {
      const s = slugify(loc.name);
      const group = groups.get(s) ?? [];
      group.push(loc);
      groups.set(s, group);
    }

    const id2s = new Map<string, string>();
    const s2loc = new Map<string, Location>();

    for (const [nameSlug, locs] of groups) {
      if (locs.length === 1) {
        const only = locs[0]!;
        id2s.set(only.id, nameSlug);
        s2loc.set(nameSlug, only);
      } else {
        for (const loc of locs) {
          const withCity = loc.city ? `${nameSlug}-${slugify(loc.city)}` : nameSlug;
          id2s.set(loc.id, withCity);
          s2loc.set(withCity, loc);
        }
      }
    }

    return { idToSlug: id2s, slugToLocation: s2loc };
  }, [locations]);

  // -- Detail panel state --
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);
  const deepLinkHandled = useRef(false);

  const handleSelectLocation = useCallback((location: Location) => {
    setExpandedLocation(location);
    const slug = idToSlug.get(location.id) ?? location.id;
    const params = new URLSearchParams(searchParams.toString());
    params.set("location", slug);
    const qs = params.toString();
    window.history.pushState(null, "", `/c/places${qs ? `?${qs}` : ""}`);
  }, [searchParams, idToSlug]);

  const handleCloseExpanded = useCallback(() => {
    setExpandedLocation(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("location");
    const qs = params.toString();
    window.history.replaceState(null, "", `/c/places${qs ? `?${qs}` : ""}`);
  }, [searchParams]);

  // Read Koku-generated URL params once on mount
  const kokuParam = searchParams.get("koku");
  const cityParam = searchParams.get("city");
  const categoryParam = searchParams.get("category");
  const qParam = searchParams.get("q");
  const jtaParam = searchParams.get("jta");
  const didApplyKokuRef = useRef(false);
  useEffect(() => {
    if (didApplyKokuRef.current) return;
    didApplyKokuRef.current = true;
    if (kokuParam) {
      const ids = kokuParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) setKokuIds(ids);
    }
    if (cityParam) setSelectedCity(cityParam);
    if (categoryParam) applyKokuCategory(categoryParam);
    if (qParam) setInputValue(qParam);
    if (jtaParam === "true") setJtaApprovedOnly(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep link: ?location={slug} -> auto-open panel
  const locationParam = searchParams.get("location");

  useEffect(() => {
    if (!locationParam || deepLinkHandled.current) return;
    if (!locations || locations.length === 0) return;

    deepLinkHandled.current = true;
    const match = slugToLocation.get(locationParam);
    if (match) {
      setExpandedLocation(match);
    }
  }, [locationParam, locations, searchParams, slugToLocation]);

  const mapAvailable = useMemo(
    () => featureFlags.enableMapbox && !featureFlags.cheapMode,
    [],
  );

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      {viewMode !== "map" && <PlacesIntroC totalCount={total} content={content} />}

      {/* Error state */}
      {error ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="mx-auto max-w-md px-6 text-center">
            <div className="border border-[var(--error)]/30 bg-[var(--error)]/5 p-4 sm:p-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-[var(--error)]/10">
                <svg className="h-6 w-6 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-[var(--error)] mb-2">
                {content?.placesErrorMessage ?? "Something went wrong loading places"}
              </p>
              <p className="text-sm text-[var(--error)] mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-[var(--error)] px-7 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-all hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--error)] focus:ring-offset-2"
              >
                {content?.placesRetryText ?? "Try again"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <CategoryBarC
            onFiltersClick={() => setIsFilterPanelOpen(true)}
            activeFilterCount={activeFilterCount}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onInputSubmit={handleInputSubmit}
            tabs={categoryTabs}
            activeTab={selectedCategory}
            onTabChange={setSelectedCategory}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            mapAvailable={mapAvailable}
          />

          {/* Main content */}
          {viewMode === "grid" ? (
            <>
              {/* Seasonal banner */}
              <div className="mx-auto mt-4 max-w-[1400px] px-6 lg:px-10">
                <SeasonalBannerC
                  locations={locations}
                  onFilterSeasonal={handleFilterSeasonal}
                />
              </div>

              {/* Koku filter banner */}
              {kokuIds.length > 0 && (
                <div className="mx-auto mt-4 max-w-[1400px] px-6 lg:px-10">
                  <div className="flex items-center justify-between gap-3 border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary)]">Koku suggested</span>
                      <span className="text-[var(--muted-foreground)]">Showing {kokuIds.length} place{kokuIds.length !== 1 ? "s" : ""}</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearKokuFilter}
                      className="shrink-0 text-xs font-medium text-[var(--muted-foreground)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <div className="h-4 sm:h-6" aria-hidden="true" />

              <PlacesGridC
                locations={categoryFilteredLocations}
                totalCount={total}
                isLoading={isLoading}
                onClearFilters={() => { clearAllFilters(); setSelectedCategory(null); }}
                onSelectLocation={handleSelectLocation}
              />
            </>
          ) : mapAvailable ? (
            <PlacesMapLayoutC
              filteredLocations={filteredLocations}
              sortedLocations={categoryFilteredLocations}
              totalCount={total}
              isLoading={isLoading}
              onSelectLocation={handleSelectLocation}
            />
          ) : (
            <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-12 text-center">
              <p className="text-[var(--muted-foreground)]">Map requires Mapbox to be enabled.</p>
            </div>
          )}

          {/* Detail panel */}
          <AnimatePresence>
            {expandedLocation && (
              <PlaceDetailPanelC
                key={expandedLocation.id}
                location={expandedLocation}
                onClose={handleCloseExpanded}
              />
            )}
          </AnimatePresence>

          {/* Filter panel */}
          <FilterPanelC
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
            onFeaturedOnlyChange={setFeaturedOnly}
            resultsCount={activeFilters.length === 0 ? total : filteredLocations.length}
            onClearAll={clearAllFilters}
            sortOptions={SORT_OPTIONS}
            selectedSort={selectedSort}
            onSortChange={setSelectedSort}
            activeFilters={activeFilters}
            onRemoveFilter={removeFilter}
            categoryTabs={categoryTabs}
            activeCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </>
      )}
    </div>
  );
}
