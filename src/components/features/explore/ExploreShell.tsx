"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Location } from "@/types/location";
import { ActiveFilter } from "@/types/filters";
import { locationMatchesSubTypes, getCategoryById, getSubTypeById, getParentCategoryForDatabaseCategory } from "@/data/categoryHierarchy";
import { featureFlags } from "@/lib/env/featureFlags";
import { CategoryBar } from "./CategoryBar";
import { useAllLocationsSingle, useFilterMetadataQuery, useLocationSearchQuery } from "@/hooks/useLocationsQuery";
import type { PagesContent } from "@/types/sanitySiteContent";

/* ── Dynamic imports ─────────────────────────────────────────────────
 * Heavy components are code-split so Turbopack compiles them in
 * separate chunks. This keeps the initial ExploreShell bundle small
 * and removes framer-motion from the critical compilation path.
 * ----------------------------------------------------------------- */

const ExploreIntro = dynamic(
  () => import("./ExploreIntro").then((m) => ({ default: m.ExploreIntro })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <p className="font-serif italic text-2xl sm:text-3xl text-foreground text-center">
          Explore Japan
        </p>
      </div>
    ),
  }
);

const FilterPanel = dynamic(
  () => import("./FilterPanel").then((m) => ({ default: m.FilterPanel })),
  { ssr: false }
);

const ExploreMapLayout = dynamic(
  () => import("./ExploreMapLayout").then((m) => ({ default: m.ExploreMapLayout })),
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

const DURATION_FILTERS = [
  {
    id: "short",
    label: "Under 1 hour",
    predicate: (value: number | null) => value !== null && value <= 60,
  },
  {
    id: "medium",
    label: "1\u20133 hours",
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

function calculatePopularityScore(rating: number | null, reviewCount: number | null): number {
  const r = rating ?? 0;
  const v = reviewCount ?? 0;
  if (r === 0 || v === 0) return 0;

  const m = 50;
  const C = 4.2;

  const score = (v / (v + m)) * r + (m / (v + m)) * C;
  const reviewBoost = Math.log10(v + 1) / 10;

  return score + reviewBoost;
}

type EnhancedLocation = Location & {
  durationMinutes: number | null;
  ratingValue: number;
  reviewCount: number;
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
  if (unit.startsWith("day")) return amount * 24 * 60;
  if (unit.startsWith("hour") || unit.startsWith("hr")) return amount * 60;
  if (unit.startsWith("minute")) return amount;
  return null;
}

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
  return 3.9 + (hash % 18) / 20;
}

function generateFallbackReviewCount(locationId: string): number {
  const hash = hashString(locationId + "-reviews");
  return 50 + (hash % 450);
}


type ExploreShellProps = {
  content?: PagesContent;
};

export function ExploreShell({ content }: ExploreShellProps) {
  const {
    locations,
    total,
    isLoading,
    error,
  } = useAllLocationsSingle();
  const { data: filterMetadata } = useFilterMetadataQuery();

  const [query, setQuery] = useState("");
  const { data: searchResults } = useLocationSearchQuery(query);
  const [selectedPrefectures, setSelectedPrefectures] = useState<string[]>([]);
  const [selectedPriceLevel, setSelectedPriceLevel] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubTypes, setSelectedSubTypes] = useState<string[]>([]);
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [vegetarianFriendly, setVegetarianFriendly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedSort, setSelectedSort] = useState<SortOptionId>("recommended");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // IntersectionObserver for progressive loading
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  const mergedLocations = useMemo(() => {
    if (!searchResults || searchResults.length === 0) return locations;
    const loadedIds = new Set(locations.map((l) => l.id));
    const newFromSearch = searchResults.filter((l) => !loadedIds.has(l.id));
    return newFromSearch.length > 0 ? [...locations, ...newFromSearch] : locations;
  }, [locations, searchResults]);

  const enhancedLocations = useMemo<EnhancedLocation[]>(() => {
    return mergedLocations.map((location) => {
      const ratingValue = (typeof location.rating === "number" && Number.isFinite(location.rating))
        ? location.rating
        : generateFallbackRating(location.id);

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
  }, [mergedLocations]);

  const prefectureOptions = useMemo(() => {
    return filterMetadata?.prefectures || [];
  }, [filterMetadata]);

  const filteredLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const durationFilter = selectedDuration
      ? DURATION_FILTERS.find((filter) => filter.id === selectedDuration) ?? null
      : null;

    const normalizePrefecture = (name: string | undefined): string => {
      if (!name) return '';
      return name
        .replace(/\s+Prefecture$/i, '')
        .replace(/-ken$/i, '')
        .replace(/-fu$/i, '')
        .replace(/-to$/i, '')
        .trim();
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

      const matchesSubType = selectedSubTypes.length === 0
        ? true
        : locationMatchesSubTypes(location, selectedSubTypes);

      const matchesWheelchair = !wheelchairAccessible
        ? true
        : location.accessibilityOptions?.wheelchairAccessibleEntrance === true;

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
        return sorted.sort((a, b) => {
          const scoreA = calculatePopularityScore(a.ratingValue, a.reviewCount);
          const scoreB = calculatePopularityScore(b.ratingValue, b.reviewCount);
          if (scoreA === scoreB) return a.name.localeCompare(b.name);
          return scoreB - scoreA;
        });

      case "highest_rated":
        return sorted.sort((a, b) => {
          if (a.ratingValue === b.ratingValue) return a.name.localeCompare(b.name);
          return b.ratingValue - a.ratingValue;
        });

      case "most_reviews":
        return sorted.sort((a, b) => {
          if (a.reviewCount === b.reviewCount) return a.name.localeCompare(b.name);
          return b.reviewCount - a.reviewCount;
        });

      case "price_low":
        return sorted.sort((a, b) => {
          const priceA = a.priceLevel ?? 0;
          const priceB = b.priceLevel ?? 0;
          if (priceA === priceB) return a.name.localeCompare(b.name);
          return priceA - priceB;
        });

      case "duration_short":
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

  const visibleLocations = useMemo(
    () => sortedLocations.slice(0, page * PAGE_SIZE),
    [sortedLocations, page]
  );

  const hasMore = visibleLocations.length < sortedLocations.length;

  // IntersectionObserver for progressive loading
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

  const activeFilterCount = activeFilters.filter((f) => f.type !== "search").length;

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

  const handleSelectLocation = useCallback((location: Location) => {
    setExpandedLocation(location);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setExpandedLocation(null);
  }, []);

  // Determine active category for interstitials
  const activeCategory = selectedCategories.length === 1 ? selectedCategories[0]! : null;

  const mapAvailable = useMemo(
    () => featureFlags.enableMapbox && !featureFlags.cheapMode,
    [],
  );

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Typographic Intro — always renders immediately for entrance animation */}
      <ExploreIntro totalCount={total} content={content} />

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
              <p className="text-base font-semibold text-error mb-2">{content?.exploreErrorMessage ?? "Something went wrong loading places"}</p>
              <p className="text-sm text-error mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-error px-5 py-2.5 text-sm font-semibold text-white hover:bg-error/90 transition focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
              >
                {content?.exploreRetryText ?? "Try again"}
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
      />

      {/* Main Content — Map starts loading tiles immediately, cards show skeleton until data arrives */}
      {mapAvailable ? (
        <ExploreMapLayout
          filteredLocations={filteredLocations}
          sortedLocations={sortedLocations}
          totalCount={total}
          onSelectLocation={handleSelectLocation}
          isLoading={isLoading}
          isChatOpen={isChatOpen}
          onChatClose={() => setIsChatOpen(false)}
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
                {(content?.exploreEndMessage ?? "That's all {count}. For now.").replace("{count}", sortedLocations.length.toLocaleString())}
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
