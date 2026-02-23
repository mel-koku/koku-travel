"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { featureFlags } from "@/lib/env/featureFlags";
import { CategoryBarB } from "./CategoryBarB";
import type { InputMode } from "./CategoryBarB";
import { useAllLocationsSingle, useFilterMetadataQuery } from "@/hooks/useLocationsQuery";
import { usePlacesFilters, SORT_OPTIONS, DURATION_FILTERS } from "@/hooks/usePlacesFilters";
import type { PagesContent } from "@/types/sanitySiteContent";
import { useVideoImport } from "@/hooks/useVideoImport";
import { isValidVideoUrl, detectPlatform } from "@/lib/video/platforms";
import { VideoImportResult } from "@/components/features/video-import/VideoImportResult";
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

type PlacesShellBProps = {
  content?: PagesContent;
};

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
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
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

  const videoImport = useVideoImport({
    onImportComplete: (locationId, isNew) => {
      showToast(
        isNew ? "New location added to Koku" : "Found in Koku",
        { variant: "success" },
      );
      router.push(`/b/places/${locationId}`);
    },
  });

  const detectedPlatform = useMemo(
    () => detectPlatform(inputValue.trim()),
    [inputValue],
  );
  const inputMode: InputMode = useMemo(() => {
    if (videoImport.state.status === "extracting") return "extracting";
    if (detectedPlatform) return "url-detected";
    return "search";
  }, [videoImport.state.status, detectedPlatform]);

  useEffect(() => {
    if (inputMode === "search") {
      setQuery(inputValue);
    } else {
      setQuery("");
    }
  }, [inputValue, inputMode, setQuery]);

  const handleInputChange = useCallback((value: string) => {
    if (!value.trim() && videoImport.state.status === "error") {
      videoImport.reset();
    }
    setInputValue(value);
  }, [videoImport]);

  const handleInputPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData("text").trim();
      if (text && isValidVideoUrl(text)) {
        e.preventDefault();
        setInputValue(text);
        videoImport.handleImport(text);
      }
    },
    [videoImport],
  );

  const handleInputSubmit = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && isValidVideoUrl(trimmed)) {
      videoImport.handleImport(trimmed);
    }
  }, [inputValue, videoImport]);

  const handleTryAnother = useCallback(() => {
    videoImport.reset();
    setInputValue("");
  }, [videoImport]);

  // ── Deep link redirect — redirect ?location= to detail page ──
  const searchParams = useSearchParams();
  const locationParam = searchParams.get("location");

  useEffect(() => {
    if (!locationParam) return;
    router.replace(`/b/places/${locationParam}`);
  }, [locationParam, router]);

  const mapAvailable = useMemo(
    () => featureFlags.enableMapbox && !featureFlags.cheapMode,
    [],
  );

  const importState = videoImport.state;

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      <PlacesIntroB totalCount={total} content={content} />

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
                className="rounded-xl bg-[var(--error)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-[var(--error)] focus:ring-offset-2"
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
                  value={videoImport.hintValue}
                  onChange={(e) => videoImport.setHintValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") videoImport.handleRetryWithHint();
                  }}
                  placeholder="e.g. ramen shop in Shibuya"
                  maxLength={200}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition"
                />
                <button
                  type="button"
                  onClick={videoImport.handleRetryWithHint}
                  disabled={!videoImport.hintValue.trim()}
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

          {importState.status === "result" && (
            <div className="mx-auto max-w-sm px-4 mt-3">
              <VideoImportResult
                location={importState.data.location}
                isNewLocation={importState.data.isNewLocation}
                platform={importState.data.videoMetadata.platform}
                confidence={importState.data.extraction.confidence}
                locationNameJapanese={importState.data.extraction.locationNameJapanese}
              />
              <button
                type="button"
                onClick={handleTryAnother}
                className="mt-3 w-full rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--foreground)] transition active:scale-[0.98]"
              >
                Import Another
              </button>
            </div>
          )}

          {/* Seasonal banner */}
          <div className="mt-3">
            <SeasonalBanner
              locations={locations}
              onFilterSeasonal={handleFilterSeasonal}
            />
          </div>

          <div className="h-4 sm:h-6" aria-hidden="true" />

          {/* Main content — grid or map based on viewMode */}
          {viewMode === "grid" ? (
            <PlacesGridB
              locations={categoryFilteredLocations}
              totalCount={total}
              isLoading={isLoading}
            />
          ) : mapAvailable ? (
            <PlacesMapLayoutB
              filteredLocations={filteredLocations}
              sortedLocations={categoryFilteredLocations}
              totalCount={total}
              isLoading={isLoading}
              hasActiveChips={activeFilters.filter((f) => f.type !== "search").length > 0}
            />
          ) : (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 text-center">
              <p className="text-[var(--muted-foreground)]">Map requires Mapbox to be enabled.</p>
            </div>
          )}

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
