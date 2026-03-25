"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Location } from "@/types/location";
import type { ActiveFilter, FilterMetadata } from "@/types/filters";
import { locationMatchesVibes } from "@/data/vibeFilterMapping";
import { VIBES, type VibeId } from "@/data/vibes";
import { getOpenStatus } from "@/lib/availability/isOpenNow";
import { useLocationSearchQuery } from "@/hooks/useLocationsQuery";
import { locationHasSeasonalTag, getCurrentMonth } from "@/lib/utils/seasonUtils";
import { parseSearchQuery } from "@/lib/search/queryParser";

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
  { id: "recommended" as const, label: "Popular" },
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
  const trimmed = value.trim();
  // After normalization, most durations are plain integers (minutes)
  const asInt = parseInt(trimmed, 10);
  if (!isNaN(asInt) && String(asInt) === trimmed) return asInt;
  // Legacy text formats (backward compat)
  const normalized = trimmed.toLowerCase();
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

// ── Category diversity interleaving ───────────────────────
// Prevents dining-heavy clusters in the default "recommended" sort
// by ensuring no more than 2 consecutive items share a diversity group.

const DINING_CATEGORIES = new Set(["restaurant", "cafe", "bar"]);

function getDiversityGroup(category: string): string {
  return DINING_CATEGORIES.has(category) ? "dining" : category;
}

function interleaveForDiversity<T extends { category: string }>(
  sorted: T[],
  maxConsecutive: number = 2
): T[] {
  if (sorted.length <= maxConsecutive) return sorted;

  const result: T[] = [];
  const remaining = [...sorted];

  while (remaining.length > 0) {
    // Count trailing items that share the same diversity group
    let consecutive = 0;
    let trailingGroup: string | null = null;
    const lastItem = result[result.length - 1];
    if (lastItem) {
      trailingGroup = getDiversityGroup(lastItem.category);
      for (let i = result.length - 1; i >= 0; i--) {
        const item = result[i]!;
        if (getDiversityGroup(item.category) === trailingGroup) {
          consecutive++;
        } else break;
      }
    }

    if (consecutive < maxConsecutive) {
      // Safe to take the next highest-scored item
      result.push(remaining.shift()!);
    } else {
      // Break the streak: pull the next different-group item forward
      const idx = remaining.findIndex(
        (item) => getDiversityGroup(item.category) !== trailingGroup
      );
      if (idx === -1) {
        // Only same-group items left, append them all
        result.push(...remaining);
        break;
      }
      const [pulled] = remaining.splice(idx, 1);
      result.push(pulled!);
    }
  }

  return result;
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
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [kokuIds, setKokuIds] = useState<string[]>([]);
  // URL-driveable filters (set from ?city=, ?category=, ?jta= params)
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [jtaApprovedOnly, setJtaApprovedOnly] = useState(false);

  // Sort + pagination
  const [selectedSort, setSelectedSort] = useState<SortOptionId>("recommended");
  const [page, setPage] = useState(1);

  // Track filter changes for scroll-to-top and page reset
  const [filterVersion, setFilterVersion] = useState(0);
  useEffect(() => {
    setPage(1);
    setFilterVersion((v) => v + 1);
  }, [
    query,
    selectedPrefectures,
    selectedPriceLevel,
    selectedDuration,
    selectedVibes,
    openNow,
    wheelchairAccessible,
    vegetarianFriendly,
    featuredOnly,
    kokuIds,
    selectedCity,
    selectedCategory,
    jtaApprovedOnly,
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
      return {
        ...location,
        durationMinutes: parseDuration(location.estimatedDuration),
        ratingValue: location.rating ?? 0,
        reviewCount: location.reviewCount ?? 0,
      };
    });
  }, [mergedLocations]);

  const prefectureOptions = useMemo(() => {
    return filterMetadata?.prefectures || [];
  }, [filterMetadata]);

  // Apply all filters
  const filteredLocations = useMemo(() => {
    // Koku filter overrides everything — show only the exact IDs Koku returned
    if (kokuIds.length > 0) {
      const idSet = new Set(kokuIds);
      return enhancedLocations.filter((loc) => idSet.has(loc.id));
    }

    const normalizedQuery = query.trim().toLowerCase();
    const parsed = parseSearchQuery(query);
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

    const FOOD_CATEGORIES = new Set(["restaurant", "cafe", "bar", "market"]);

    return enhancedLocations.filter((location) => {
      let matchesQuery: boolean;

      if (parsed.hasStructuredIntent) {
        // Structured matching: geography AND category/cuisine AND free text
        const matchesGeo =
          parsed.geoTerms.length === 0 ||
          parsed.geoTerms.some((g) => {
            const normPref = normalizePrefecture(location.prefecture).toLowerCase();
            return (
              location.city.toLowerCase() === g ||
              location.region.toLowerCase() === g ||
              normPref === g
            );
          });

        const hasCategories = parsed.categories.length > 0;
        const hasCuisine = parsed.cuisineTerms.length > 0;
        const isFoodLocation = FOOD_CATEGORIES.has(location.category);

        const matchesWhat =
          !hasCategories && !hasCuisine
            ? true
            : ((!hasCategories || parsed.categories.includes(location.category)) &&
               (!hasCuisine || !isFoodLocation ||
                 parsed.cuisineTerms.some(
                   (ct) =>
                     location.cuisineType?.toLowerCase().includes(ct) ||
                     location.name.toLowerCase().includes(ct),
                 )));

        const matchesFreeText =
          !parsed.freeText ||
          location.name.toLowerCase().includes(parsed.freeText);

        matchesQuery = matchesGeo && matchesWhat && matchesFreeText;
      } else if (normalizedQuery) {
        // Fallback: text search on structured fields only (no description/tips)
        matchesQuery =
          location.name.toLowerCase().includes(normalizedQuery) ||
          location.city.toLowerCase().includes(normalizedQuery) ||
          location.region.toLowerCase().includes(normalizedQuery) ||
          location.category.toLowerCase().includes(normalizedQuery) ||
          (location.cuisineType?.toLowerCase().includes(normalizedQuery) ?? false);
      } else {
        matchesQuery = true;
      }

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

      const matchesFeatured = !featuredOnly
        ? true
        : location.isFeatured === true;

      const matchesCity = !selectedCity
        ? true
        : location.city.toLowerCase() === selectedCity.toLowerCase();

      const matchesCategory = !selectedCategory
        ? true
        : selectedCategory === "in_season"
          ? locationHasSeasonalTag(location.tags, getCurrentMonth())
          : location.category === selectedCategory;

      const matchesJta = !jtaApprovedOnly
        ? true
        : location.jtaApproved === true;

      return (
        matchesQuery &&
        matchesPrefecture &&
        matchesPriceLevel &&
        matchesDuration &&
        matchesVibe &&
        matchesOpenNow &&
        matchesWheelchair &&
        matchesVegetarian &&
        matchesFeatured &&
        matchesCity &&
        matchesCategory &&
        matchesJta
      );
    });
  }, [enhancedLocations, query, selectedPrefectures, selectedPriceLevel, selectedDuration, selectedVibes, openNow, wheelchairAccessible, vegetarianFriendly, featuredOnly, kokuIds, selectedCity, selectedCategory, jtaApprovedOnly]);

  // Sort
  const sortedLocations = useMemo(() => {
    const sorted = [...filteredLocations];
    switch (selectedSort) {
      case "recommended":
        sorted.sort((a, b) => {
          const scoreA = calculatePopularityScore(a.ratingValue, a.reviewCount);
          const scoreB = calculatePopularityScore(b.ratingValue, b.reviewCount);
          if (scoreA === scoreB) return a.name.localeCompare(b.name);
          return scoreB - scoreA;
        });
        return interleaveForDiversity(sorted);
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

    if (featuredOnly) {
      filters.push({ type: "featured", value: "true", label: "Featured" });
    }

    if (selectedCity) {
      const label = selectedCity.charAt(0).toUpperCase() + selectedCity.slice(1);
      filters.push({ type: "city", value: selectedCity, label });
    }

    if (selectedCategory) {
      const label = selectedCategory === "in_season"
        ? "In Season"
        : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);
      filters.push({ type: "category", value: selectedCategory, label });
    }

    if (jtaApprovedOnly) {
      filters.push({ type: "jta", value: "true", label: "JTA Approved" });
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
    featuredOnly,
    selectedCity,
    selectedCategory,
    jtaApprovedOnly,
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
      case "featured":
        setFeaturedOnly(false);
        break;
      case "city":
        setSelectedCity(null);
        break;
      case "category":
        setSelectedCategory(null);
        break;
      case "jta":
        setJtaApprovedOnly(false);
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
    setFeaturedOnly(false);
    setKokuIds([]);
    setSelectedCity(null);
    setSelectedCategory(null);
    setJtaApprovedOnly(false);
    setSelectedSort("recommended");
  }, []);

  const clearKokuFilter = useCallback(() => {
    setKokuIds([]);
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
    featuredOnly, setFeaturedOnly,
    kokuIds, setKokuIds, clearKokuFilter,
    selectedCity, setSelectedCity,
    selectedCategory, setSelectedCategory,
    jtaApprovedOnly, setJtaApprovedOnly,
    // Sort
    selectedSort, setSelectedSort,
    // Pagination
    page, setPage, hasMore, filterVersion,
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
