"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Location } from "@/types/location";
import { ActiveFilter } from "@/types/filters";
import { locationMatchesSubTypes, getCategoryById, getSubTypeById, getParentCategoryForDatabaseCategory } from "@/data/categoryHierarchy";

const FiltersModal = dynamic(
  () => import("./FiltersModal").then((m) => ({ default: m.FiltersModal })),
  { ssr: false }
);
import { LocationGrid } from "./LocationGrid";
import { StickyExploreHeader } from "./StickyExploreHeader";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { FeaturedCarousel } from "./FeaturedCarousel";
import { useAggregatedLocations, useFilterMetadataQuery } from "@/hooks/useLocationsQuery";

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

type SortOptionId = "recommended" | "highest_rated" | "most_reviews" | "price_low" | "duration_short";

const SORT_OPTIONS = [
  { id: "recommended" as const, label: "Recommended" },
  { id: "highest_rated" as const, label: "Highest Rated" },
  { id: "most_reviews" as const, label: "Most Reviews" },
  { id: "price_low" as const, label: "Price (Low to High)" },
  { id: "duration_short" as const, label: "Duration (Short to Long)" },
] as const;

/**
 * Calculate popularity score using Bayesian weighted average
 * Balances rating quality with review quantity to produce fair rankings
 * A 4.8★ location with 500 reviews ranks higher than a 5.0★ with 3 reviews
 */
function calculatePopularityScore(rating: number | null, reviewCount: number | null): number {
  const r = rating ?? 0;
  const v = reviewCount ?? 0;
  if (r === 0 || v === 0) return 0;

  const m = 50;   // minimum reviews threshold (smoothing factor)
  const C = 4.2;  // global average rating

  // Bayesian weighted average + log boost for volume
  const score = (v / (v + m)) * r + (m / (v + m)) * C;
  const reviewBoost = Math.log10(v + 1) / 10;

  return score + reviewBoost;
}

type EnhancedLocation = Location & {
  durationMinutes: number | null;
  ratingValue: number; // Always has a value (real or fallback)
  reviewCount: number; // Always has a value (real or fallback)
};

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

// Fallback rating/review generation (deterministic based on location ID)
// Used when database doesn't have Google Places rating data
function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateFallbackRating(locationId: string): number {
  const hash = hashString(locationId);
  return 3.9 + (hash % 18) / 20; // 3.9 - 4.8 range
}

function generateFallbackReviewCount(locationId: string): number {
  const hash = hashString(locationId + "-reviews");
  return 50 + (hash % 450); // 50-500 range
}

type ExploreShellProps = {
  /** Server-side pre-fetched featured locations for instant carousel display */
  initialFeaturedLocations?: Location[];
};

export function ExploreShell({ initialFeaturedLocations = [] }: ExploreShellProps) {
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
  const [selectedPrefectures, setSelectedPrefectures] = useState<string[]>([]);
  const [selectedPriceLevel, setSelectedPriceLevel] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubTypes, setSelectedSubTypes] = useState<string[]>([]);
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [vegetarianFriendly, setVegetarianFriendly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedSort, setSelectedSort] = useState<SortOptionId>("recommended");
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [
    query,
    selectedPrefectures,
    selectedPriceLevel,
    selectedDuration,
    selectedCategories,
    selectedSubTypes,
    wheelchairAccessible,
    vegetarianFriendly,
    selectedSort,
  ]);

  const enhancedLocations = useMemo<EnhancedLocation[]>(() => {
    return locations.map((location) => {
      // Use actual rating if available, otherwise generate deterministic fallback
      const ratingValue = (typeof location.rating === "number" && Number.isFinite(location.rating))
        ? location.rating
        : generateFallbackRating(location.id);

      // Use actual review count if available, otherwise generate deterministic fallback
      const reviewCountValue = (typeof location.reviewCount === "number" && location.reviewCount > 0)
        ? location.reviewCount
        : generateFallbackReviewCount(location.id);

      return {
        ...location,
        durationMinutes: parseDuration(location.estimatedDuration),
        ratingValue,
        reviewCount: reviewCountValue,
      };
    });
  }, [locations]);

  // Use pre-computed filter metadata from server (instant, no client-side processing)
  const prefectureOptions = useMemo(() => {
    return filterMetadata?.prefectures || [];
  }, [filterMetadata]);

  const filteredLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
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

      const matchesPrefecture = selectedPrefectures.length === 0
        ? true
        : selectedPrefectures.includes(normalizePrefecture(location.prefecture));

      // Price filter: "Free" (0) matches locations with priceLevel 0 or no priceLevel
      const matchesPriceLevel = selectedPriceLevel === null
        ? true
        : selectedPriceLevel === 0
          ? (location.priceLevel === 0 || location.priceLevel == null)
          : location.priceLevel === selectedPriceLevel;

      const matchesDuration = durationFilter
        ? durationFilter.predicate(location.durationMinutes)
        : true;

      const matchesCategory = selectedCategories.length === 0
        ? true
        : (() => {
            const parentCategory = getParentCategoryForDatabaseCategory(location.category);
            return parentCategory !== null && selectedCategories.includes(parentCategory);
          })();

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

      return (
        matchesQuery &&
        matchesPrefecture &&
        matchesPriceLevel &&
        matchesDuration &&
        matchesCategory &&
        matchesSubType &&
        matchesWheelchair &&
        matchesVegetarian
      );
    });
  }, [enhancedLocations, query, selectedPrefectures, selectedPriceLevel, selectedDuration, selectedCategories, selectedSubTypes, wheelchairAccessible, vegetarianFriendly]);

  const sortedLocations = useMemo(() => {
    const sorted = [...filteredLocations];

    switch (selectedSort) {
      case "recommended":
        // Sort by popularity score (Bayesian weighted rating + review count)
        return sorted.sort((a, b) => {
          const scoreA = calculatePopularityScore(a.ratingValue, a.reviewCount);
          const scoreB = calculatePopularityScore(b.ratingValue, b.reviewCount);
          if (scoreA === scoreB) return a.name.localeCompare(b.name);
          return scoreB - scoreA;
        });

      case "highest_rated":
        // Sort by rating DESC, then name ASC
        return sorted.sort((a, b) => {
          if (a.ratingValue === b.ratingValue) return a.name.localeCompare(b.name);
          return b.ratingValue - a.ratingValue;
        });

      case "most_reviews":
        // Sort by review count DESC, then name ASC
        return sorted.sort((a, b) => {
          if (a.reviewCount === b.reviewCount) return a.name.localeCompare(b.name);
          return b.reviewCount - a.reviewCount;
        });

      case "price_low":
        // Sort by price level ASC (free first), then name ASC
        return sorted.sort((a, b) => {
          const priceA = a.priceLevel ?? 0;
          const priceB = b.priceLevel ?? 0;
          if (priceA === priceB) return a.name.localeCompare(b.name);
          return priceA - priceB;
        });

      case "duration_short":
        // Sort by duration ASC (shortest first), then name ASC
        // Locations without duration go to the end
        return sorted.sort((a, b) => {
          const durA = a.durationMinutes ?? Infinity;
          const durB = b.durationMinutes ?? Infinity;
          if (durA === durB) return a.name.localeCompare(b.name);
          return durA - durB;
        });

      default:
        return sorted;
    }
  }, [filteredLocations, selectedSort]);

  // Featured locations: use server-side pre-fetched data for instant display
  // Falls back to client-computed data if server data unavailable
  const featuredLocations = useMemo(() => {
    // Prefer server-side data for instant display (no hydration wait)
    if (initialFeaturedLocations.length > 0) {
      return initialFeaturedLocations;
    }
    // Fallback: compute client-side (same Bayesian scoring as server)
    return [...enhancedLocations]
      .sort((a, b) => {
        const scoreA = calculatePopularityScore(a.ratingValue, a.reviewCount);
        const scoreB = calculatePopularityScore(b.ratingValue, b.reviewCount);
        return scoreB - scoreA;
      })
      .slice(0, 12);
  }, [initialFeaturedLocations, enhancedLocations]);

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

    for (const prefectureValue of selectedPrefectures) {
      const prefOption = prefectureOptions.find((p) => p.value === prefectureValue);
      filters.push({
        type: "prefecture",
        value: prefectureValue,
        label: prefOption?.label || prefectureValue,
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

    if (selectedPriceLevel !== null) {
      const priceLabels: Record<number, string> = { 0: "Free", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };
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

    return filters;
  }, [
    query,
    selectedPrefectures,
    prefectureOptions,
    selectedCategories,
    selectedSubTypes,
    selectedDuration,
    selectedPriceLevel,
    wheelchairAccessible,
    vegetarianFriendly,
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
        setSelectedPrefectures((prev) => prev.filter((p) => p !== filter.value));
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
      case "priceLevel":
        setSelectedPriceLevel(null);
        break;
      case "wheelchair":
        setWheelchairAccessible(false);
        break;
      case "vegetarian":
        setVegetarianFriendly(false);
        break;
    }
  }, []);

  const clearAllFilters = useCallback(() => {
    setQuery("");
    setSelectedPrefectures([]);
    setSelectedPriceLevel(null);
    setSelectedDuration(null);
    setSelectedCategories([]);
    setSelectedSubTypes([]);
    setWheelchairAccessible(false);
    setVegetarianFriendly(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Skeleton header - centered button */}
        <div className="bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-center">
              <div className="h-10 w-40 rounded-full bg-surface animate-pulse" />
            </div>
          </div>
        </div>
        {/* Skeleton grid */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <div className="aspect-square rounded-xl bg-surface animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-surface animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-surface animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <div className="rounded-2xl border border-error/30 bg-error/10 p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/20">
              <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-error mb-2">Unable to load destinations</p>
            <p className="text-sm text-error/80 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-error px-5 py-2.5 text-sm font-semibold text-white hover:bg-error/90 transition focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <StickyExploreHeader
        resultsCount={activeFilters.length === 0 ? total : filteredLocations.length}
        onFiltersClick={() => setIsFiltersModalOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="mb-6">
            <ActiveFilterChips
              filters={activeFilters}
              onRemove={removeFilter}
              onClearAll={clearAllFilters}
            />
          </div>
        )}

        {/* Featured Carousel - only show when no filters active and we have featured locations */}
        {activeFilters.length === 0 && featuredLocations.length > 0 && (
          <section className="mb-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6 bg-gradient-to-b from-surface to-background">
            <FeaturedCarousel locations={featuredLocations} />
          </section>
        )}

        {/* Section Header for Main Grid with Inline Filter Button */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-charcoal">
                {activeFilters.length > 0 ? "Search Results" : "All Destinations"}
              </h2>
              <p className="text-sm text-stone mt-1">
                {(activeFilters.length === 0 ? total : filteredLocations.length).toLocaleString()} places to explore
              </p>
              {activeFilters.length > 0 && hasNextPage && (
                <p className="text-xs text-warm-gray mt-1">
                  Searching {locations.length.toLocaleString()} of {total.toLocaleString()} locations{" "}
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isLoadingMore}
                    className="text-brand-primary hover:underline disabled:opacity-50"
                  >
                    {isLoadingMore ? "Loading..." : "Load more"}
                  </button>
                </p>
              )}
            </div>
            <button
              onClick={() => setIsFiltersModalOpen(true)}
              className="flex items-center gap-2 rounded-full border border-brand-primary bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-primary transition hover:bg-sand shrink-0"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span>Filters</span>
              <span className="text-brand-primary/70">
                ({(activeFilters.length === 0 ? total : filteredLocations.length).toLocaleString()})
              </span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
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
        <div className="fixed bottom-4 right-4 bg-background px-4 py-2 rounded-full shadow-lg border border-border z-50">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary" />
            <p className="text-sm text-warm-gray">
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
        selectedPrefectures={selectedPrefectures}
        onPrefecturesChange={setSelectedPrefectures}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        selectedSubTypes={selectedSubTypes}
        onSubTypesChange={setSelectedSubTypes}
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
        resultsCount={activeFilters.length === 0 ? total : filteredLocations.length}
        onClearAll={clearAllFilters}
        sortOptions={SORT_OPTIONS}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
      />
    </div>
  );
}
