"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { featureFlags } from "@/lib/env/featureFlags";
import { CategoryBarB } from "./CategoryBarB";
import type { InputMode } from "./CategoryBarB";
import { useAllLocationsSingle, useFilterMetadataQuery } from "@/hooks/useLocationsQuery";
import { usePlacesFilters, SORT_OPTIONS, DURATION_FILTERS } from "@/hooks/usePlacesFilters";
import type { PagesContent } from "@/types/sanitySiteContent";
import type { Location } from "@/types/location";
import { useVideoImport } from "@/hooks/useVideoImport";
import { isValidVideoUrl, detectPlatform } from "@/lib/video/platforms";

import { SeasonalBanner } from "@/components/features/places/SeasonalBanner";
import { useToast } from "@/context/ToastContext";
import { getParentCategoryForDatabaseCategory } from "@/data/categoryHierarchy";
import type { VibeId } from "@/data/vibes";

/* ── Dynamic imports — B components ────────────────────────────── */

const PlacesIntroB = dynamic(
  () => import("./PlacesIntroB").then((m) => ({ default: m.PlacesIntroB })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <p className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.02em] text-[var(--foreground)] text-center">
          Places in Japan
        </p>
      </div>
    ),
  },
);

const FilterPanelB = dynamic(
  () => import("./FilterPanelB").then((m) => ({ default: m.FilterPanelB })),
  { ssr: false },
);

const PlacesGridB = dynamic(
  () => import("./PlacesGridB").then((m) => ({ default: m.PlacesGridB })),
  { ssr: false },
);

const PlacesMapLayoutB = dynamic(
  () => import("./PlacesMapLayoutB").then((m) => ({ default: m.PlacesMapLayoutB })),
  { ssr: false },
);

const PlaceDetailPanelB = dynamic(
  () => import("./PlaceDetailPanelB").then((m) => ({ default: m.PlaceDetailPanelB })),
  { ssr: false },
);

type PlacesShellBProps = {
  content?: PagesContent;
};

/* ── Helpers ──────────────────────────────────────────────────── */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ── Category tab definitions ─────────────────────────────────── */

const PARENT_CATEGORIES = [
  { id: "Culture", label: "Culture" },
  { id: "Food", label: "Food" },
  { id: "Nature", label: "Nature" },
  { id: "Shopping", label: "Shopping" },
  { id: "View", label: "View" },
] as const;

export function PlacesShellB({ content }: PlacesShellBProps) {
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
      router.replace(`/b/places${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams],
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { showToast } = useToast();

  // ── Category tab counts ──
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

  // ── Category-filtered locations ──
  const categoryFilteredLocations = useMemo(() => {
    if (!selectedCategory) return sortedLocations;
    return sortedLocations.filter((loc) => {
      const parent = getParentCategoryForDatabaseCategory(loc.category);
      return parent === selectedCategory;
    });
  }, [sortedLocations, selectedCategory]);

  // ── Unified input state ──
  const [inputValue, setInputValue] = useState("");

  const {
    state: importState,
    hintValue: importHintValue,
    setHintValue: setImportHintValue,
    handleImport,
    handleRetryWithHint,
    reset: resetImport,
  } = useVideoImport({
    onImportComplete: (locationId, isNew) => {
      showToast(
        isNew ? "New location added to Koku" : "Found in Koku",
        { variant: "success" },
      );
      // Reset input so user can search or import again
      resetImport();
      setInputValue("");
      router.push(`/b/places/${locationId}`);
    },
  });

  const detectedPlatform = useMemo(
    () => detectPlatform(inputValue.trim()),
    [inputValue],
  );
  const inputMode: InputMode = useMemo(() => {
    if (importState.status === "extracting") return "extracting";
    if (detectedPlatform) return "url-detected";
    return "search";
  }, [importState.status, detectedPlatform]);

  useEffect(() => {
    if (inputMode === "search") {
      setQuery(inputValue);
    } else {
      setQuery("");
    }
  }, [inputValue, inputMode, setQuery]);

  const handleInputChange = (value: string) => {
    if (!value.trim() && importState.status === "error") {
      resetImport();
    }
    setInputValue(value);
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").trim();
    if (text && isValidVideoUrl(text)) {
      e.preventDefault();
      setInputValue(text);
      handleImport(text);
    }
  };

  const handleInputSubmit = () => {
    const trimmed = inputValue.trim();
    if (trimmed && isValidVideoUrl(trimmed)) {
      handleImport(trimmed);
    }
  };

  const handleTryAnother = () => {
    resetImport();
    setInputValue("");
  };

  // ── Slug maps for clean ?location= URLs ──
  const { idToSlug, slugToLocation } = useMemo(() => {
    if (!locations || locations.length === 0) return { idToSlug: new Map<string, string>(), slugToLocation: new Map<string, Location>() };

    // Group by name slug to detect duplicates
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

  // ── Detail panel state ──
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);
  const deepLinkHandled = useRef(false);

  const handleSelectLocation = useCallback((location: Location) => {
    setExpandedLocation(location);
    const slug = idToSlug.get(location.id) ?? location.id;
    const params = new URLSearchParams(searchParams.toString());
    params.set("location", slug);
    const qs = params.toString();
    window.history.pushState(null, "", `/b/places${qs ? `?${qs}` : ""}`);
  }, [searchParams, idToSlug]);

  const handleCloseExpanded = useCallback(() => {
    setExpandedLocation(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("location");
    const qs = params.toString();
    window.history.replaceState(null, "", `/b/places${qs ? `?${qs}` : ""}`);
  }, [searchParams]);

  // Deep link: ?location={slug} → auto-open panel
  const locationParam = searchParams.get("location");

  useEffect(() => {
    if (!locationParam || deepLinkHandled.current) return;
    if (!locations || locations.length === 0) return;

    deepLinkHandled.current = true;
    const match = slugToLocation.get(locationParam);
    if (match) {
      setExpandedLocation(match);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("location");
      const qs = params.toString();
      window.history.replaceState(null, "", `/b/places${qs ? `?${qs}` : ""}`);
    }
  }, [locationParam, locations, searchParams, slugToLocation]);

  const mapAvailable = useMemo(
    () => featureFlags.enableMapbox && !featureFlags.cheapMode,
    [],
  );

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      {viewMode !== "map" && <PlacesIntroB totalCount={total} content={content} />}

      {/* Error state */}
      {error ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="mx-auto max-w-md px-4 text-center">
            <div className="rounded-2xl border border-[var(--error)]/30 bg-[var(--error)]/5 p-4 sm:p-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--error)]/10">
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
                className="rounded-xl bg-[var(--error)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--error)] focus:ring-offset-2"
              >
                {content?.placesRetryText ?? "Try again"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <CategoryBarB
            onFiltersClick={() => setIsFilterPanelOpen(true)}
            activeFilterCount={activeFilterCount}
            activeFilters={activeFilters}
            onRemoveFilter={removeFilter}
            onClearAllFilters={clearAllFilters}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onInputPaste={handleInputPaste}
            onInputSubmit={handleInputSubmit}
            inputMode={inputMode}
            detectedPlatform={detectedPlatform}
            tabs={categoryTabs}
            activeTab={selectedCategory}
            onTabChange={setSelectedCategory}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            mapAvailable={mapAvailable}
          />

          {/* Import feedback */}
          {importState.status === "extracting" && (
            <div className="mx-auto max-w-sm px-4 mt-3">
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                <span>Identifying location...</span>
              </div>
            </div>
          )}

          {importState.status === "error" && (
            <div className="mx-auto max-w-sm px-4 mt-3 space-y-2.5">
              <p className="text-sm text-[var(--error)]">{importState.message}</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={importHintValue}
                  onChange={(e) => setImportHintValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRetryWithHint();
                  }}
                  placeholder="e.g. ramen shop in Shibuya"
                  maxLength={200}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-base sm:text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition"
                />
                <button
                  type="button"
                  onClick={handleRetryWithHint}
                  disabled={!importHintValue.trim()}
                  className="shrink-0 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--brand-secondary)] transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Retry
                </button>
              </div>
              <button
                type="button"
                onClick={handleTryAnother}
                className="text-xs font-medium text-[var(--muted-foreground)] underline underline-offset-2 hover:text-[var(--foreground)]"
              >
                Try another URL
              </button>
            </div>
          )}

          {/* Main content — grid or map based on viewMode */}
          {viewMode === "grid" ? (
            <>
              {/* Seasonal banner */}
              <div className="mx-auto mt-3 max-w-2xl">
                <SeasonalBanner
                  locations={locations}
                  onFilterSeasonal={handleFilterSeasonal}
                />
              </div>

              <div className="h-4 sm:h-6" aria-hidden="true" />

              <PlacesGridB
                locations={categoryFilteredLocations}
                totalCount={total}
                isLoading={isLoading}
                onClearFilters={() => { clearAllFilters(); setSelectedCategory(null); }}
                onSelectLocation={handleSelectLocation}
              />
            </>
          ) : mapAvailable ? (
            <PlacesMapLayoutB
              filteredLocations={filteredLocations}
              sortedLocations={categoryFilteredLocations}
              totalCount={total}
              isLoading={isLoading}
              hasActiveChips={activeFilters.filter((f) => f.type !== "search").length > 0}
              onSelectLocation={handleSelectLocation}
            />
          ) : (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 text-center">
              <p className="text-[var(--muted-foreground)]">Map requires Mapbox to be enabled.</p>
            </div>
          )}

          {/* Detail panel */}
          <AnimatePresence>
            {expandedLocation && (
              <PlaceDetailPanelB
                key={expandedLocation.id}
                location={expandedLocation}
                onClose={handleCloseExpanded}
              />
            )}
          </AnimatePresence>

          {/* Filter panel */}
          <FilterPanelB
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
        </>
      )}
    </div>
  );
}
