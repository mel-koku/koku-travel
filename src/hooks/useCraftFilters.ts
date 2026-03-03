"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Location } from "@/types/location";
import type { ActiveFilter } from "@/types/filters";
import type { CraftTypeId } from "@/data/craftTypes";
import { CRAFT_TYPES } from "@/data/craftTypes";

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

export type CraftSortOptionId = "recommended" | "highest_rated" | "most_reviews" | "duration_short";

export const CRAFT_SORT_OPTIONS = [
  { id: "recommended" as const, label: "Recommended" },
  { id: "highest_rated" as const, label: "Highest Rated" },
  { id: "most_reviews" as const, label: "Most Reviews" },
  { id: "duration_short" as const, label: "Duration (Short to Long)" },
] as const;

// ── Helpers ────────────────────────────────────────────────

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

type EnhancedLocation = Location & {
  durationMinutes: number | null;
  ratingValue: number;
  reviewCount: number;
};

export type { EnhancedLocation };

// ── Hook ───────────────────────────────────────────────────

export function useCraftFilters(locations: Location[]) {
  // Filter state
  const [query, setQuery] = useState("");
  const [selectedCraftType, setSelectedCraftType] = useState<CraftTypeId | null>(null);
  const [selectedPrefectures, setSelectedPrefectures] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<CraftSortOptionId>("recommended");
  const [page, setPage] = useState(1);

  // Reset page on filter/sort change
  useEffect(() => {
    setPage(1);
  }, [query, selectedCraftType, selectedPrefectures, selectedDuration, selectedSort]);

  // Enhance with parsed duration and rating fallbacks
  const enhancedLocations = useMemo<EnhancedLocation[]>(() => {
    return locations.map((location) => {
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
  }, [locations]);

  // Craft type counts (computed from all locations, not filtered)
  const craftTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const loc of locations) {
      const ct = loc.craftType || "mixed";
      counts.set(ct, (counts.get(ct) || 0) + 1);
    }
    return counts;
  }, [locations]);

  // Prefecture options from craft locations
  const prefectureOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const loc of locations) {
      if (loc.prefecture) {
        const normalized = loc.prefecture
          .replace(/\s+Prefecture$/i, "")
          .replace(/-ken$/i, "")
          .replace(/-fu$/i, "")
          .replace(/-to$/i, "")
          .trim();
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [locations]);

  // Apply all filters
  const filteredLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const durationFilter = selectedDuration
      ? DURATION_FILTERS.find((filter) => filter.id === selectedDuration) ?? null
      : null;

    const normalizePrefecture = (name: string | undefined): string => {
      if (!name) return "";
      return name
        .replace(/\s+Prefecture$/i, "")
        .replace(/-ken$/i, "")
        .replace(/-fu$/i, "")
        .replace(/-to$/i, "")
        .trim();
    };

    return enhancedLocations.filter((location) => {
      const matchesQuery =
        !normalizedQuery ||
        location.name.toLowerCase().includes(normalizedQuery) ||
        location.city.toLowerCase().includes(normalizedQuery) ||
        location.prefecture?.toLowerCase().includes(normalizedQuery) ||
        location.region.toLowerCase().includes(normalizedQuery) ||
        location.shortDescription?.toLowerCase().includes(normalizedQuery) ||
        location.craftType?.toLowerCase().includes(normalizedQuery);

      const matchesCraftType = !selectedCraftType || location.craftType === selectedCraftType;

      const matchesPrefecture = selectedPrefectures.length === 0
        ? true
        : selectedPrefectures.includes(normalizePrefecture(location.prefecture));

      const matchesDuration = durationFilter
        ? durationFilter.predicate(location.durationMinutes)
        : true;

      return matchesQuery && matchesCraftType && matchesPrefecture && matchesDuration;
    });
  }, [enhancedLocations, query, selectedCraftType, selectedPrefectures, selectedDuration]);

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

    if (selectedCraftType) {
      const ct = CRAFT_TYPES.find((c) => c.id === selectedCraftType);
      if (ct) {
        filters.push({ type: "craftType", value: selectedCraftType, label: ct.label });
      }
    }

    for (const prefectureValue of selectedPrefectures) {
      const prefOption = prefectureOptions.find((p) => p.value === prefectureValue);
      filters.push({
        type: "prefecture",
        value: prefectureValue,
        label: prefOption?.label || prefectureValue,
      });
    }

    if (selectedDuration) {
      const durOption = DURATION_FILTERS.find((d) => d.id === selectedDuration);
      if (durOption) {
        filters.push({ type: "duration", value: selectedDuration, label: durOption.label });
      }
    }

    return filters;
  }, [query, selectedCraftType, selectedPrefectures, prefectureOptions, selectedDuration]);

  const activeFilterCount = activeFilters.filter((f) => f.type !== "search").length;

  const removeFilter = useCallback((filter: ActiveFilter) => {
    switch (filter.type) {
      case "search":
        setQuery("");
        break;
      case "craftType":
        setSelectedCraftType(null);
        break;
      case "prefecture":
        setSelectedPrefectures((prev) => prev.filter((p) => p !== filter.value));
        break;
      case "duration":
        setSelectedDuration(null);
        break;
    }
  }, []);

  const clearAllFilters = useCallback(() => {
    setQuery("");
    setSelectedCraftType(null);
    setSelectedPrefectures([]);
    setSelectedDuration(null);
    setSelectedSort("recommended");
  }, []);

  return {
    // Filter state + setters
    query, setQuery,
    selectedCraftType, setSelectedCraftType,
    selectedPrefectures, setSelectedPrefectures,
    selectedDuration, setSelectedDuration,
    // Sort
    selectedSort, setSelectedSort,
    // Pagination
    page, setPage, hasMore,
    // Computed
    filteredLocations,
    sortedLocations,
    visibleLocations,
    prefectureOptions,
    craftTypeCounts,
    activeFilters,
    activeFilterCount,
    // Actions
    removeFilter,
    clearAllFilters,
  };
}
