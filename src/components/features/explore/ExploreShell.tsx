"use client";

import { useEffect, useMemo, useState } from "react";
import { Location } from "@/types/location";

import { CategoryBar } from "./CategoryBar";
import { FiltersModal } from "./FiltersModal";
import { LocationGrid } from "./LocationGrid";
import { SearchHeader } from "./SearchHeader";
import { logger } from "@/lib/logger";
import {
  getCachedLocationsIncludingStale,
  isCacheStale,
  setCachedLocations,
} from "@/lib/locationsCache";

const BUDGET_FILTERS = [
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
    predicate: (value: number | null) => value !== null && value < 60,
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
  tags: string[];
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

const TAG_KEYWORDS: { pattern: RegExp; tag: string }[] = [
  { pattern: /shrine|torii|inari/, tag: "shrine" },
  { pattern: /temple|dera|ji\b/, tag: "temple" },
  { pattern: /market|shopping|arcade|street/, tag: "market" },
  { pattern: /park|garden|grove|valley|river|bamboo/, tag: "park" },
  { pattern: /museum/, tag: "museum" },
  { pattern: /theatre|theater|kabuki|concert|hall|studio/, tag: "performing arts" },
  { pattern: /tower|observatory|sky|view|scenic/, tag: "viewpoint" },
  { pattern: /coffee|cafe/, tag: "coffee" },
  { pattern: /ramen|yakitori|sushi|restaurant|dining|curry/, tag: "restaurant" },
  { pattern: /sake|bar/, tag: "bar" },
  { pattern: /railway|railroad|train/, tag: "experience" },
  { pattern: /kimono|salon|spa|beauty/, tag: "wellness" },
  { pattern: /disney|universal|theme/, tag: "theme park" },
  { pattern: /aquarium/, tag: "aquarium" },
  { pattern: /bamboo/, tag: "bamboo" },
  { pattern: /anime|manga/, tag: "pop culture" },
];

function deriveTags(location: Location): string[] {
  const tags = new Set<string>();
  const name = location.name.toLowerCase();
  const category = location.category.toLowerCase();

  if (category === "culture") {
    tags.add("culture");
  } else if (category === "food") {
    tags.add("food & drink");
  } else if (category === "nature") {
    tags.add("outdoors");
  } else if (category === "shopping") {
    tags.add("shopping");
  } else if (category === "view") {
    tags.add("viewpoint");
  }

  for (const { pattern, tag } of TAG_KEYWORDS) {
    if (pattern.test(name)) {
      tags.add(tag);
    }
  }

  // Ensure category-specific base tags exist
  if (tags.size === 0) {
    tags.add(category);
  }

  return Array.from(tags);
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(" ");
}

export function ExploreShell() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedSort] =
    useState<SortOptionId>("relevance");
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [
    query,
    selectedCity,
    selectedBudget,
    selectedDuration,
    selectedCategories,
    selectedTag,
    selectedSort,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function fetchLocations() {
      // Check for cached locations first (including stale ones for immediate display)
      const cachedLocations = getCachedLocationsIncludingStale();
      const cacheIsStale = isCacheStale();
      const hasFreshCache = cachedLocations && !cacheIsStale;

      // If we have fresh cache, use it and skip fetching
      if (hasFreshCache) {
        logger.info("Using fresh locations cache", { count: cachedLocations.length });
        setLocations(cachedLocations);
        setIsLoading(false);
        setLoadError(null);
        return;
      }

      // If we have stale cache, show it immediately while fetching fresh data
      if (cachedLocations && cacheIsStale) {
        logger.info("Using stale locations cache, refreshing in background", {
          count: cachedLocations.length,
        });
        setLocations(cachedLocations);
        setIsLoading(false);
        setLoadError(null);
        // Continue to fetch fresh data below
      } else {
        // No cache or expired - show loading state
        setIsLoading(true);
        setLoadError(null);
      }

      try {
        // Fetch all locations by requesting max limit and paginating if needed
        let allLocations: Location[] = [];
        let page = 1;
        const limit = 100; // Max allowed by API
        let hasMore = true;

        while (hasMore && !cancelled) {
          const response = await fetch(`/api/locations?page=${page}&limit=${limit}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch locations: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          
          if (cancelled) return;

          // Handle paginated response format: { data: Location[], pagination: {...} }
          const locationsArray = Array.isArray(data.data) ? data.data : [];
          allLocations = [...allLocations, ...locationsArray];

          // Check if there are more pages
          hasMore = data.pagination?.hasNext === true;
          page++;

          // Safety limit to prevent infinite loops
          if (page > 100) {
            logger.warn("Reached pagination safety limit");
            break;
          }
        }
        
        if (cancelled) return;

        if (allLocations.length === 0) {
          // Only show error if we don't have cached data to fall back to
          if (!cachedLocations) {
            logger.warn("No locations returned from API after fetching all pages");
            setLoadError("No locations found. Please check the database configuration.");
          }
        } else {
          // Save to cache and update state
          setCachedLocations(allLocations);
          setLocations(allLocations);
          setLoadError(null);
        }
      } catch (error) {
        if (cancelled) return;
        
        // If we have cached data, use it even if fetch fails
        if (cachedLocations) {
          logger.warn("Failed to refresh locations, using cached data", { error });
          // Locations already set from cache above, just ensure loading is false
          setIsLoading(false);
          // Don't set error - user can still use cached data
        } else {
          // No cache to fall back to - show error
          logger.error("Failed to load locations from API", error);
          setLoadError(
            error instanceof Error && error.message.includes("fetch")
              ? "Unable to connect to the server. Please check your internet connection and try again."
              : "Unable to load locations. Please refresh the page to try again."
          );
          setLocations([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchLocations();

    return () => {
      cancelled = true;
    };
  }, []);

  const enhancedLocations = useMemo<EnhancedLocation[]>(() => {
    return locations.map((location) => ({
      ...location,
      budgetValue: parseBudget(location.minBudget),
      durationMinutes: parseDuration(location.estimatedDuration),
      tags: deriveTags(location),
      ratingValue:
        typeof location.rating === "number" && Number.isFinite(location.rating)
          ? location.rating
          : null,
    }));
  }, [locations]);

  const cityOptions = useMemo(() => {
    const unique = new Set(enhancedLocations.map((location) => location.city));
    return Array.from(unique)
      .sort((a, b) => a.localeCompare(b))
      .map((city) => ({ value: city, label: city }));
  }, [enhancedLocations]);

  const categoryOptions = useMemo(() => {
    const unique = new Set(enhancedLocations.map((location) => location.category));
    return Array.from(unique)
      .sort((a, b) => a.localeCompare(b))
      .map((category) => ({ value: category, label: toTitleCase(category) }));
  }, [enhancedLocations]);

  const tagOptions = useMemo(() => {
    const unique = new Set<string>();
    enhancedLocations.forEach((location) => {
      location.tags.forEach((tag) => unique.add(tag));
    });
    return Array.from(unique)
      .sort((a, b) => a.localeCompare(b))
      .map((tag) => ({ value: tag, label: toTitleCase(tag) }));
  }, [enhancedLocations]);

  const filteredLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const budgetFilter = selectedBudget
      ? BUDGET_FILTERS.find((filter) => filter.id === selectedBudget) ?? null
      : null;
    const durationFilter = selectedDuration
      ? DURATION_FILTERS.find((filter) => filter.id === selectedDuration) ?? null
      : null;
    return enhancedLocations.filter((location) => {
      const matchesQuery =
        !normalizedQuery ||
        location.name.toLowerCase().includes(normalizedQuery) ||
        location.city.toLowerCase().includes(normalizedQuery) ||
        location.region.toLowerCase().includes(normalizedQuery) ||
        location.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

      const matchesCity = selectedCity
        ? location.city === selectedCity
        : true;

      const matchesBudget = budgetFilter
        ? budgetFilter.predicate(location.budgetValue)
        : true;

      const matchesDuration = durationFilter
        ? durationFilter.predicate(location.durationMinutes)
        : true;

      const matchesCategory = selectedCategories.length === 0
        ? true
        : selectedCategories.includes(location.category);

      const matchesTag = selectedTag
        ? location.tags.includes(selectedTag)
        : true;

      return (
        matchesQuery &&
        matchesCity &&
        matchesBudget &&
        matchesDuration &&
        matchesCategory &&
        matchesTag
      );
    });
  }, [enhancedLocations, query, selectedCity, selectedBudget, selectedDuration, selectedCategories, selectedTag]);

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

  // Count active non-category filters
  const activeFilterCount = [
    selectedCity,
    selectedBudget,
    selectedDuration,
    selectedTag,
    query,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setQuery("");
    setSelectedCity(null);
    setSelectedBudget(null);
    setSelectedDuration(null);
    setSelectedTag(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Skeleton category bar */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex gap-8">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gray-200 animate-pulse" />
                  <div className="h-3 w-12 rounded bg-gray-200 animate-pulse" />
                </div>
              ))}
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

  if (loadError) {
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
            <p className="text-sm text-red-600 mb-6">{loadError}</p>
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
      {/* Search Header */}
      <SearchHeader
        query={query}
        onQueryChange={setQuery}
        totalCount={locations.length}
      />

      {/* Category Bar */}
      <CategoryBar
        categories={categoryOptions}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        onFiltersClick={() => setIsFiltersModalOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Results count */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            {filteredLocations.length === locations.length
              ? `${locations.length.toLocaleString()} places to explore`
              : `${filteredLocations.length.toLocaleString()} of ${locations.length.toLocaleString()} places`}
          </p>
        </div>

        {/* Location Grid */}
        <LocationGrid
          locations={visibleLocations}
          hasMore={hasMore}
          onLoadMore={() => setPage((current) => current + 1)}
          layout="default"
        />
      </main>

      {/* Filters Modal */}
      <FiltersModal
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        query={query}
        onQueryChange={setQuery}
        cityOptions={cityOptions}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        budgetOptions={BUDGET_FILTERS.map(({ id, label }) => ({
          value: id,
          label,
        }))}
        selectedBudget={selectedBudget}
        onBudgetChange={setSelectedBudget}
        durationOptions={DURATION_FILTERS.map(({ id, label }) => ({
          value: id,
          label,
        }))}
        selectedDuration={selectedDuration}
        onDurationChange={setSelectedDuration}
        tagOptions={tagOptions}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        resultsCount={filteredLocations.length}
        onClearAll={clearAllFilters}
      />
    </div>
  );
}

