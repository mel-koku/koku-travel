"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Location } from "@/types/location";
import type { ActiveFilter, FilterMetadata } from "@/types/filters";
import { locationMatchesVibes } from "@/data/vibeFilterMapping";
import { VIBES, type VibeId } from "@/data/vibes";
import { getOpenStatus } from "@/lib/availability/isOpenNow";
import { useLocationSearchQuery } from "@/hooks/useLocationsQuery";

// ── Constants ──────────────────────────────────────────────

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

export { DURATION_FILTERS };

const PAGE_SIZE = 24;

export type SortOptionId = "recommended" | "highest_rated" | "most_reviews" | "price_low" | "duration_short";

export const SORT_OPTIONS = [
  { id: "recommended" as const, label: "Recommended" },
  { id: "highest_rated" as const, label: "Highest Rated" },
  { id: "most_reviews" as const, label: "Most Reviews" },
  { id: "price_low" as const, label: "Price (Low to High)" },
  { id: "duration_short" as const, label: "Duration (Short to Long)" },
] as const;

// ── Helpers ────────────────────────────────────────────────

type EnhancedLocation = Location & {
  durationMinutes: number | null;
  ratingValue: number;
  reviewCount: number;
};

export type { EnhancedLocation };

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

function generateFallbackRating(locationId: string): number {
  const hash = hashString(locationId);
  return 3.9 + (hash % 18) / 20;
}

function generateFallbackReviewCount(locationId: string): number {
  const hash = hashString(locationId + "-reviews");
  return 50 + (hash % 450);
}

// ── Hook ───────────────────────────────────────────────────

export function usePlacesFilters(
  locations: Location[],
  filterMetadata: FilterMetadata | undefined,
) {
  // Filter state
  const [query, setQuery] = useState("");
  const { data: searchResults } = useLocationSearchQuery(query);
  const [selectedPrefectures, setSelectedPrefectures] = useState<string[]>([]);
  const [selectedPriceLevel, setSelectedPriceLevel] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [selectedVibes, setSelectedVibes] = useState<VibeId[]>([]);
  const [openNow, setOpenNow] = useState(false);
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [vegetarianFriendly, setVegetarianFriendly] = useState(false);

  // Sort + pagination
  const [selectedSort, setSelectedSort] = useState<SortOptionId>("recommended");
  const [page, setPage] = useState(1);

  // Reset page on filter/sort change
  useEffect(() => {
    setPage(1);
  }, [
    query,
    selectedPrefectures,
    selectedPriceLevel,
    selectedDuration,
    selectedVibes,
    openNow,
    wheelchairAccessible,
    vegetarianFriendly,
    selectedSort,
  ]);

  // Merge loaded locations with search results
  const mergedLocations = useMemo(() => {
    if (!searchResults || searchResults.length === 0) return locations;
    const loadedIds = new Set(locations.map((l) => l.id));
    const newFromSearch = searchResults.filter((l) => !loadedIds.has(l.id));
    return newFromSearch.length > 0 ? [...locations, ...newFromSearch] : locations;
  }, [locations, searchResults]);

  // Enhance with parsed duration and rating fallbacks
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

  // Apply all filters
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
        location.region.toLowerCase().includes(normalizedQuery) ||
        location.category.toLowerCase().includes(normalizedQuery);

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

      const matchesVibe = locationMatchesVibes(location, selectedVibes);

      const matchesOpenNow = !openNow
        ? true
        : getOpenStatus(location.operatingHours).state === "open";

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
        matchesVibe &&
        matchesOpenNow &&
        matchesWheelchair &&
        matchesVegetarian
      );
    });
  }, [enhancedLocations, query, selectedPrefectures, selectedPriceLevel, selectedDuration, selectedVibes, openNow, wheelchairAccessible, vegetarianFriendly]);

  // Sort
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

  // Pagination
  const visibleLocations = useMemo(
    () => sortedLocations.slice(0, page * PAGE_SIZE),
    [sortedLocations, page]
  );

  const hasMore = visibleLocations.length < sortedLocations.length;

  // Active filters for chips
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

    for (const vibeId of selectedVibes) {
      const vibe = VIBES.find((v) => v.id === vibeId);
      if (vibe) {
        filters.push({
          type: "vibe",
          value: vibeId,
          label: vibe.name,
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

    if (openNow) {
      filters.push({ type: "openNow", value: "true", label: "Open now" });
    }

    if (wheelchairAccessible) {
      filters.push({ type: "wheelchair", value: "true", label: "Wheelchair accessible" });
    }

    if (vegetarianFriendly) {
      filters.push({ type: "vegetarian", value: "true", label: "Vegetarian friendly" });
    }

    return filters;
  }, [
    query,
    selectedPrefectures,
    prefectureOptions,
    selectedVibes,
    selectedDuration,
    selectedPriceLevel,
    openNow,
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
      case "vibe":
        setSelectedVibes((prev) => prev.filter((v) => v !== filter.value));
        break;
      case "duration":
        setSelectedDuration(null);
        break;
      case "priceLevel":
        setSelectedPriceLevel(null);
        break;
      case "openNow":
        setOpenNow(false);
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
    setSelectedVibes([]);
    setOpenNow(false);
    setWheelchairAccessible(false);
    setVegetarianFriendly(false);
  }, []);

  return {
    // Filter state + setters
    query, setQuery,
    selectedPrefectures, setSelectedPrefectures,
    selectedPriceLevel, setSelectedPriceLevel,
    selectedDuration, setSelectedDuration,
    selectedVibes, setSelectedVibes,
    openNow, setOpenNow,
    wheelchairAccessible, setWheelchairAccessible,
    vegetarianFriendly, setVegetarianFriendly,
    // Sort
    selectedSort, setSelectedSort,
    // Pagination
    page, setPage, hasMore,
    // Computed
    filteredLocations,
    sortedLocations,
    visibleLocations,
    prefectureOptions,
    activeFilters,
    activeFilterCount,
    // Actions
    removeFilter,
    clearAllFilters,
  };
}
