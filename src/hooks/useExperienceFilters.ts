"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Location } from "@/types/location";
import type { ActiveFilter } from "@/types/filters";
import type { ExperienceType } from "@/types/experience";
import { EXPERIENCE_TYPES } from "@/data/experienceTypes";
import { CRAFT_TYPES, type CraftTypeId } from "@/data/craftTypes";
import { DURATION_FILTERS } from "@/data/durationFilters";
import { calculatePopularityScore } from "@/lib/utils/popularityScoring";
import { parseDuration } from "@/lib/utils/durationParser";
import { generateFallbackRating, generateFallbackReviewCount } from "@/lib/utils/ratingFallbacks";
import { normalizePrefecture } from "@/lib/utils/prefectureUtils";

// ── Constants ──────────────────────────────────────────────

export { DURATION_FILTERS };

const PAGE_SIZE = 24;

export type ExperienceSortOptionId = "recommended" | "highest_rated" | "most_reviews" | "newest";

export const EXPERIENCE_SORT_OPTIONS = [
  { id: "recommended" as const, label: "Popular" },
  { id: "highest_rated" as const, label: "Highest Rated" },
  { id: "most_reviews" as const, label: "Most Reviews" },
  { id: "newest" as const, label: "Newest" },
] as const;

// ── Helpers ──────────────────────��─────────────────────────

type EnhancedLocation = Location & {
  durationMinutes: number | null;
  ratingValue: number;
  reviewCountValue: number;
};

// ── Hook ───────────────────────────────────────────────────

export function useExperienceFilters(experiences: Location[]) {
  // Filter state
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ExperienceType | null>(null);
  const [selectedCraftType, setSelectedCraftType] = useState<CraftTypeId | null>(null);
  const [selectedPrefectures, setSelectedPrefectures] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<ExperienceSortOptionId>("recommended");
  const [page, setPage] = useState(1);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [query, selectedType, selectedCraftType, selectedPrefectures, selectedDuration, selectedSort]);

  // Clear craft type when switching away from workshop tab
  useEffect(() => {
    if (selectedType !== "workshop") {
      setSelectedCraftType(null);
    }
  }, [selectedType]);

  // Enhance with parsed duration and rating fallbacks
  const enhancedExperiences = useMemo<EnhancedLocation[]>(() => {
    return experiences.map((exp) => {
      const ratingValue = (typeof exp.rating === "number" && Number.isFinite(exp.rating))
        ? exp.rating
        : generateFallbackRating(exp.id);
      const reviewCountValue = (typeof exp.reviewCount === "number" && exp.reviewCount > 0)
        ? exp.reviewCount
        : generateFallbackReviewCount(exp.id);
      return {
        ...exp,
        durationMinutes: parseDuration(exp.estimatedDuration),
        ratingValue,
        reviewCountValue,
      };
    });
  }, [experiences]);

  // Experience type counts
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const exp of experiences) {
      const t = exp.category || "experience";
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    return counts;
  }, [experiences]);

  // Craft type counts (only for workshop-type experiences)
  const craftTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const exp of experiences) {
      if (exp.category === "workshop" && exp.craftType) {
        counts.set(exp.craftType, (counts.get(exp.craftType) || 0) + 1);
      }
    }
    return counts;
  }, [experiences]);

  // Prefecture options
  const prefectureOptions = useMemo(() => {
    const counts = new Map<string, number>();
    const source = selectedType
      ? experiences.filter((e) => e.category === selectedType)
      : experiences;
    for (const exp of source) {
      if (exp.prefecture) {
        const normalized = exp.prefecture
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
  }, [experiences, selectedType]);

  // Apply all filters
  const filteredExperiences = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const durationFilter = selectedDuration
      ? DURATION_FILTERS.find((f) => f.id === selectedDuration) ?? null
      : null;

    return enhancedExperiences.filter((exp) => {
      const matchesQuery =
        !normalizedQuery ||
        exp.name.toLowerCase().includes(normalizedQuery) ||
        exp.city.toLowerCase().includes(normalizedQuery) ||
        exp.prefecture?.toLowerCase().includes(normalizedQuery) ||
        exp.region.toLowerCase().includes(normalizedQuery) ||
        exp.shortDescription?.toLowerCase().includes(normalizedQuery) ||
        exp.craftType?.toLowerCase().includes(normalizedQuery);

      const matchesType = !selectedType || exp.category === selectedType;

      const matchesCraftType = !selectedCraftType || exp.craftType === selectedCraftType;

      const matchesPrefecture = selectedPrefectures.length === 0
        ? true
        : selectedPrefectures.includes(normalizePrefecture(exp.prefecture));

      const matchesDuration = durationFilter
        ? durationFilter.predicate(exp.durationMinutes)
        : true;

      return matchesQuery && matchesType && matchesCraftType && matchesPrefecture && matchesDuration;
    });
  }, [enhancedExperiences, query, selectedType, selectedCraftType, selectedPrefectures, selectedDuration]);

  // Sort
  const sortedExperiences = useMemo(() => {
    const sorted = [...filteredExperiences];
    switch (selectedSort) {
      case "recommended":
        return sorted.sort((a, b) => {
          const scoreA = calculatePopularityScore(a.ratingValue, a.reviewCountValue);
          const scoreB = calculatePopularityScore(b.ratingValue, b.reviewCountValue);
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
          if (a.reviewCountValue === b.reviewCountValue) return a.name.localeCompare(b.name);
          return b.reviewCountValue - a.reviewCountValue;
        });
      case "newest":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  }, [filteredExperiences, selectedSort]);

  // Pagination
  const visibleExperiences = useMemo(
    () => sortedExperiences.slice(0, page * PAGE_SIZE),
    [sortedExperiences, page]
  );

  const hasMore = visibleExperiences.length < sortedExperiences.length;

  // Active filters for chips
  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];

    if (query) {
      filters.push({ type: "search", value: query, label: `"${query}"` });
    }

    if (selectedType) {
      const t = EXPERIENCE_TYPES.find((et) => et.id === selectedType);
      if (t) {
        filters.push({ type: "experienceType", value: selectedType, label: t.label });
      }
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
  }, [query, selectedType, selectedCraftType, selectedPrefectures, prefectureOptions, selectedDuration]);

  const activeFilterCount = activeFilters.filter((f) => f.type !== "search" && f.type !== "experienceType").length;

  const removeFilter = useCallback((filter: ActiveFilter) => {
    switch (filter.type) {
      case "search":
        setQuery("");
        break;
      case "experienceType":
        setSelectedType(null);
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
    setSelectedType(null);
    setSelectedCraftType(null);
    setSelectedPrefectures([]);
    setSelectedDuration(null);
    setSelectedSort("recommended");
  }, []);

  return {
    // Filter state + setters
    query, setQuery,
    selectedType, setSelectedType,
    selectedCraftType, setSelectedCraftType,
    selectedPrefectures, setSelectedPrefectures,
    selectedDuration, setSelectedDuration,
    // Sort
    selectedSort, setSelectedSort,
    // Pagination
    page, setPage, hasMore,
    // Computed
    filteredExperiences,
    sortedExperiences,
    visibleExperiences,
    prefectureOptions,
    typeCounts,
    craftTypeCounts,
    activeFilters,
    activeFilterCount,
    // Actions
    removeFilter,
    clearAllFilters,
  };
}
