"use client";

import { useEffect, useMemo, useState } from "react";
import { Location } from "@/types/location";

import { FilterBar } from "./FilterBar";
import { LocationGrid } from "./LocationGrid";
import { FeaturedLocationsHero } from "./FeaturedLocationsHero";
import { logger } from "@/lib/logger";

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
  if (!match) return null;
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
    let isActive = true;
    setIsLoading(true);
    void import("@/data/mockLocations")
      .then((module) => {
        if (!isActive) return;
        setLocations(module.MOCK_LOCATIONS);
        setLoadError(null);
      })
      .catch((error) => {
        logger.error("Failed to load mock locations", error);
        if (!isActive) return;
        setLoadError("Unable to load locations. Please try again later.");
        setLocations([]);
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
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
  const featuredLocations = useMemo(() => {
    return [...enhancedLocations]
      .sort((a, b) => {
        const ratingA = a.ratingValue ?? -Infinity;
        const ratingB = b.ratingValue ?? -Infinity;
        if (ratingA === ratingB) {
          return a.name.localeCompare(b.name);
        }
        return ratingB - ratingA;
      })
      .slice(0, 3);
  }, [enhancedLocations]);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-full flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-12 md:px-8 md:py-16">
        <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-screen-md px-4 py-12 text-center sm:px-6 sm:py-16 md:px-8 md:py-24">
        <p className="text-sm text-red-600">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-6 pt-6 sm:gap-8 sm:px-6 sm:pb-8 sm:pt-8 md:gap-10 md:pb-8 md:pt-10 lg:px-12">
      <FeaturedLocationsHero locations={featuredLocations} />
      <div className="flex flex-col gap-6 sm:gap-8 lg:grid lg:grid-cols-[minmax(260px,_320px)_1fr] lg:gap-12">
        <FilterBar
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
          categoryOptions={categoryOptions}
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
          tagOptions={tagOptions}
          selectedTag={selectedTag}
          onTagChange={setSelectedTag}
          layout="vertical"
        />
        <LocationGrid
          locations={visibleLocations}
          hasMore={hasMore}
          onLoadMore={() => setPage((current) => current + 1)}
          layout="sidebar"
        />
      </div>
    </div>
  );
}

