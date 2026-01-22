"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Location } from "@/types/location";
import { ActiveFilter } from "@/types/filters";
import { locationMatchesSubTypes, getCategoryById, getSubTypeById } from "@/data/categoryHierarchy";

const FiltersModal = dynamic(
  () => import("./FiltersModal").then((m) => ({ default: m.FiltersModal })),
  { ssr: false }
);
import { LocationGrid } from "./LocationGrid";
import { StickyExploreHeader } from "./StickyExploreHeader";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { useAggregatedLocations, useFilterMetadataQuery } from "@/hooks/useLocationsQuery";

const ENTRY_FEE_FILTERS = [
  {
    id: "free",
    label: "Free",
    predicate: (value: number | null) => value === 0,
  },
  {
    id: "under-1000",
    label: "Under ¥1,000",
    predicate: (value: number | null) =>
      value !== null && value > 0 && value < 1000,
  },
  {
    id: "1000-3000",
    label: "¥1,000–¥3,000",
    predicate: (value: number | null) =>
      value !== null && value >= 1000 && value < 3000,
  },
  {
    id: "over-3000",
    label: "¥3,000+",
    predicate: (value: number | null) => value !== null && value >= 3000,
  },
] as const;

const DURATION_FILTERS = [
  {
    id: "short",
    label: "Under 1 hour",
    predicate: (value: number | null) => value !== null && value <= 60,
  },
  {
    id: "medium",
    label: "1–3 hours",
    predicate: (value: number | null) =>
      value !== null && value >= 60 && value <= 180,
  },
  {
    id: "long",
    label: "Over 3 hours",
    predicate: (value: number | null) => value !== null && value > 180,
  },
] as const;

const PAGE_SIZE = 24;
type SortOptionId = "relevance" | "popular";

type EnhancedLocation = Location & {
  budgetValue: number | null;
  durationMinutes: number | null;
  ratingValue: number | null;
};

function parseBudget(value?: string): number | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "free") return 0;
  const numeric = normalized.replace(/[¥,\s]/g, "");
  const parsed = Number.parseInt(numeric, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseDuration(value?: string): number | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(
    /([0-9]+(?:\.[0-9]+)?)\s*(hour|hours|hr|hrs|minute|minutes|day|days)/
  );
  if (!match || !match[1] || !match[2]) return null;
  const amount = Number.parseFloat(match[1]);
  if (Number.isNaN(amount)) return null;
  const unit = match[2];
  if (unit.startsWith("day")) {
    return amount * 24 * 60;
  }
  if (unit.startsWith("hour") || unit.startsWith("hr")) {
    return amount * 60;
  }
  if (unit.startsWith("minute")) {
    return amount;
  }
  return null;
}

export function ExploreShell() {
  // Use React Query hooks for data fetching
  const {
    locations,
    total,
    isLoading,
    isLoadingMore,
    error,
    hasNextPage,
    fetchNextPage,
  } = useAggregatedLocations();
  const { data: filterMetadata } = useFilterMetadataQuery();

  const [query, setQuery] = useState("");
  const [selectedPrefecture, setSelectedPrefecture] = useState<string | null>(null);
  const [selectedEntryFee, setSelectedEntryFee] = useState<string | null>(null);
  const [selectedPriceLevel, setSelectedPriceLevel] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubTypes, setSelectedSubTypes] = useState<string[]>([]);
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [vegetarianFriendly, setVegetarianFriendly] = useState(false);
  const [hideClosedLocations, setHideClosedLocations] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedSort] = useState<SortOptionId>("relevance");
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [
    query,
    selectedPrefecture,
    selectedEntryFee,
    selectedPriceLevel,
    selectedDuration,
    selectedCategories,
    selectedSubTypes,
    wheelchairAccessible,
    vegetarianFriendly,
    hideClosedLocations,
    selectedSort,
  ]);

  const enhancedLocations = useMemo<EnhancedLocation[]>(() => {
    return locations.map((location) => ({
      ...location,
      budgetValue: parseBudget(location.minBudget),
      durationMinutes: parseDuration(location.estimatedDuration),
      ratingValue:
        typeof location.rating === "number" && Number.isFinite(location.rating)
          ? location.rating
          : null,
    }));
  }, [locations]);

  // Use pre-computed filter metadata from server (instant, no client-side processing)
  const prefectureOptions = useMemo(() => {
    return filterMetadata?.prefectures || [];
  }, [filterMetadata]);

  const filteredLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const entryFeeFilter = selectedEntryFee
      ? ENTRY_FEE_FILTERS.find((filter) => filter.id === selectedEntryFee) ?? null
      : null;
    const durationFilter = selectedDuration
      ? DURATION_FILTERS.find((filter) => filter.id === selectedDuration) ?? null
      : null;

    // Helper to normalize prefecture names (remove " Prefecture" suffix)
    const normalizePrefecture = (name: string | undefined): string => {
      if (!name) return '';
      return name.replace(/\s+Prefecture$/i, '').trim();
    };

    return enhancedLocations.filter((location) => {
      const matchesQuery =
        !normalizedQuery ||
        location.name.toLowerCase().includes(normalizedQuery) ||
        location.city.toLowerCase().includes(normalizedQuery) ||
        location.prefecture?.toLowerCase().includes(normalizedQuery) ||
        location.region.toLowerCase().includes(normalizedQuery);

      const matchesPrefecture = selectedPrefecture
        ? normalizePrefecture(location.prefecture) === selectedPrefecture
        : true;

      const matchesEntryFee = entryFeeFilter
        ? entryFeeFilter.predicate(location.budgetValue)
        : true;

      // Price level filter (Google Places based)
      const matchesPriceLevel = selectedPriceLevel === null
        ? true
        : location.priceLevel === selectedPriceLevel;

      const matchesDuration = durationFilter
        ? durationFilter.predicate(location.durationMinutes)
        : true;

      const matchesCategory = selectedCategories.length === 0
        ? true
        : selectedCategories.includes(location.category);

      // Sub-type matching using the helper from categoryHierarchy
      const matchesSubType = selectedSubTypes.length === 0
        ? true
        : locationMatchesSubTypes(location, selectedSubTypes);

      // Wheelchair accessible filter
      const matchesWheelchair = !wheelchairAccessible
        ? true
        : location.accessibilityOptions?.wheelchairAccessibleEntrance === true;

      // Vegetarian friendly filter
      const matchesVegetarian = !vegetarianFriendly
        ? true
        : location.dietaryOptions?.servesVegetarianFood === true;

      // Hide closed locations filter
      const matchesStatus = !hideClosedLocations
        ? true
        : location.businessStatus !== 'PERMANENTLY_CLOSED';

      return (
        matchesQuery &&
        matchesPrefecture &&
        matchesEntryFee &&
        matchesPriceLevel &&
        matchesDuration &&
        matchesCategory &&
        matchesSubType &&
        matchesWheelchair &&
        matchesVegetarian &&
        matchesStatus
      );
    });
  }, [enhancedLocations, query, selectedPrefecture, selectedEntryFee, selectedPriceLevel, selectedDuration, selectedCategories, selectedSubTypes, wheelchairAccessible, vegetarianFriendly, hideClosedLocations]);

  const sortedLocations = useMemo(() => {
    if (selectedSort === "popular") {
      return [...filteredLocations].sort((a, b) => {
        const ratingA = a.ratingValue ?? -Infinity;
        const ratingB = b.ratingValue ?? -Infinity;
        if (ratingA === ratingB) {
          return a.name.localeCompare(b.name);
        }
        return ratingB - ratingA;
      });
    }
    return filteredLocations;
  }, [filteredLocations, selectedSort]);

  const visibleLocations = useMemo(
    () => sortedLocations.slice(0, page * PAGE_SIZE),
    [sortedLocations, page]
  );

  const hasMore = visibleLocations.length < sortedLocations.length;

  // Build active filters list for chips
  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];

    if (query) {
      filters.push({ type: "search", value: query, label: `"${query}"` });
    }

    if (selectedPrefecture) {
      const prefOption = prefectureOptions.find((p) => p.value === selectedPrefecture);
      filters.push({
        type: "prefecture",
        value: selectedPrefecture,
        label: prefOption?.label || selectedPrefecture,
      });
    }

    for (const categoryId of selectedCategories) {
      const category = getCategoryById(categoryId);
      if (category) {
        filters.push({
          type: "category",
          value: categoryId,
          label: category.label,
        });
      }
    }

    for (const subTypeId of selectedSubTypes) {
      const subType = getSubTypeById(subTypeId);
      if (subType) {
        filters.push({
          type: "subType",
          value: subTypeId,
          label: subType.label,
        });
      }
    }

    if (selectedDuration) {
      const durOption = DURATION_FILTERS.find((d) => d.id === selectedDuration);
      if (durOption) {
        filters.push({
          type: "duration",
          value: selectedDuration,
          label: durOption.label,
        });
      }
    }

    if (selectedEntryFee) {
      const feeOption = ENTRY_FEE_FILTERS.find((f) => f.id === selectedEntryFee);
      if (feeOption) {
        filters.push({
          type: "entryFee",
          value: selectedEntryFee,
          label: feeOption.label,
        });
      }
    }

    if (selectedPriceLevel !== null) {
      const priceLabels: Record<number, string> = { 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };
      filters.push({
        type: "priceLevel",
        value: String(selectedPriceLevel),
        label: priceLabels[selectedPriceLevel] || String(selectedPriceLevel),
      });
    }

    if (wheelchairAccessible) {
      filters.push({
        type: "wheelchair",
        value: "true",
        label: "Wheelchair accessible",
      });
    }

    if (vegetarianFriendly) {
      filters.push({
        type: "vegetarian",
        value: "true",
        label: "Vegetarian friendly",
      });
    }

    if (hideClosedLocations) {
      filters.push({
        type: "hideClosed",
        value: "true",
        label: "Hide closed",
      });
    }

    return filters;
  }, [
    query,
    selectedPrefecture,
    prefectureOptions,
    selectedCategories,
    selectedSubTypes,
    selectedDuration,
    selectedEntryFee,
    selectedPriceLevel,
    wheelchairAccessible,
    vegetarianFriendly,
    hideClosedLocations,
  ]);

  // Count active filters for badge (excluding search)
  const activeFilterCount = activeFilters.filter((f) => f.type !== "search").length;

  // Remove a specific filter
  const removeFilter = useCallback((filter: ActiveFilter) => {
    switch (filter.type) {
      case "search":
        setQuery("");
        break;
      case "prefecture":
        setSelectedPrefecture(null);
        break;
      case "category":
        setSelectedCategories((prev) => prev.filter((c) => c !== filter.value));
        break;
      case "subType":
        setSelectedSubTypes((prev) => prev.filter((st) => st !== filter.value));
        break;
      case "duration":
        setSelectedDuration(null);
        break;
      case "entryFee":
        setSelectedEntryFee(null);
        break;
      case "priceLevel":
        setSelectedPriceLevel(null);
        break;
      case "wheelchair":
        setWheelchairAccessible(false);
        break;
      case "vegetarian":
        setVegetarianFriendly(false);
        break;
      case "hideClosed":
        setHideClosedLocations(false);
        break;
    }
  }, []);

  const clearAllFilters = useCallback(() => {
    setQuery("");
    setSelectedPrefecture(null);
    setSelectedEntryFee(null);
    setSelectedPriceLevel(null);
    setSelectedDuration(null);
    setSelectedCategories([]);
    setSelectedSubTypes([]);
    setWheelchairAccessible(false);
    setVegetarianFriendly(false);
    setHideClosedLocations(false);
  }, []);

  // Background prefetching: Auto-fetch remaining pages after initial render
  // Throttled to avoid rate limits (500ms between pages)
  useEffect(() => {
    if (locations.length >= 100 && hasNextPage && !isLoadingMore) {
      const timer = setTimeout(() => {
        fetchNextPage();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [locations.length, hasNextPage, isLoadingMore, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Skeleton header - centered button */}
        <div className="bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-center">
              <div className="h-10 w-40 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
        {/* Skeleton grid */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <div className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-red-800 mb-2">Unable to load destinations</p>
            <p className="text-sm text-red-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Header */}
      <StickyExploreHeader
        resultsCount={filteredLocations.length}
        onFiltersClick={() => setIsFiltersModalOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Active filter chips */}
        <div className="mb-6">
          <ActiveFilterChips
            filters={activeFilters}
            resultsCount={filteredLocations.length}
            onRemove={removeFilter}
            onClearAll={clearAllFilters}
          />
        </div>

        {/* Location Grid */}
        <LocationGrid
          locations={visibleLocations}
          hasMore={hasMore}
          onLoadMore={() => setPage((current) => current + 1)}
          layout="default"
        />
      </main>

      {/* Background Loading Indicator */}
      {isLoadingMore && (
        <div className="fixed bottom-4 right-4 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200 z-50">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            <p className="text-sm text-gray-700">
              Loading more... {locations.length} / {total}
            </p>
          </div>
        </div>
      )}

      {/* Filters Modal */}
      <FiltersModal
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        query={query}
        onQueryChange={setQuery}
        prefectureOptions={prefectureOptions}
        selectedPrefecture={selectedPrefecture}
        onPrefectureChange={setSelectedPrefecture}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        selectedSubTypes={selectedSubTypes}
        onSubTypesChange={setSelectedSubTypes}
        entryFeeOptions={ENTRY_FEE_FILTERS.map(({ id, label }) => ({
          value: id,
          label,
        }))}
        selectedEntryFee={selectedEntryFee}
        onEntryFeeChange={setSelectedEntryFee}
        selectedPriceLevel={selectedPriceLevel}
        onPriceLevelChange={setSelectedPriceLevel}
        durationOptions={DURATION_FILTERS.map(({ id, label }) => ({
          value: id,
          label,
        }))}
        selectedDuration={selectedDuration}
        onDurationChange={setSelectedDuration}
        wheelchairAccessible={wheelchairAccessible}
        onWheelchairAccessibleChange={setWheelchairAccessible}
        vegetarianFriendly={vegetarianFriendly}
        onVegetarianFriendlyChange={setVegetarianFriendly}
        hideClosedLocations={hideClosedLocations}
        onHideClosedLocationsChange={setHideClosedLocations}
        resultsCount={filteredLocations.length}
        onClearAll={clearAllFilters}
      />
    </div>
  );
}
