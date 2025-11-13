"use client";

import { useEffect, useMemo, useState } from "react";
import { Location } from "@/types/location";

import { FilterBar } from "./FilterBar";
import { LocationGrid } from "./LocationGrid";

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
const SORT_OPTIONS = [
  {
    id: "relevance",
    label: "Recommended",
  },
  {
    id: "popular",
    label: "Most popular",
  },
] as const;

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
  const [selectedSort, setSelectedSort] =
    useState<(typeof SORT_OPTIONS)[number]["id"]>("relevance");

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
        console.error("[ExploreShell] Failed to load mock locations.", error);
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
      <div className="mx-auto flex w-full max-w-full flex-col gap-8 px-8 py-16">
        <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-gray-200" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-screen-md px-8 py-24 text-center">
        <p className="text-sm text-red-600">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pb-8 pt-10 lg:px-12">
      <FeaturedLocationsHero locations={featuredLocations} />
      <div className="flex flex-col gap-12 lg:grid lg:grid-cols-[minmax(260px,_320px)_1fr]">
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

function FeaturedLocationsHero({ locations }: { locations: EnhancedLocation[] }) {
  if (locations.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-500 px-8 py-12 text-white shadow-xl focus-within:outline-none focus-within:ring-4 focus-within:ring-indigo-300/60">
      <div className="relative z-10 flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-100">
          Featured Picks
        </span>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
          Discover our handpicked spots across Japan
        </h1>
        <p className="max-w-2xl text-base text-indigo-100 sm:text-lg">
          Start your next itinerary with the places travelers love right now—from timeless temples to vibrant city nights.
        </p>
      </div>
      <div className="relative z-10 mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((location) => (
          <article
            key={location.id}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur transition hover:border-white/40 hover:bg-white/15"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-slate-800 transition-transform duration-500 group-hover:scale-105"
                style={
                  location.image
                    ? { backgroundImage: `url(${location.image})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : undefined
                }
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/0" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70">
                  {location.city}, {location.region}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{location.name}</h3>
              </div>
            </div>
            <p className="px-5 pb-5 pt-4 text-sm text-indigo-50">{getHeroSummary(location)}</p>
          </article>
        ))}
      </div>
      <div className="absolute -top-20 right-[-10%] h-64 w-64 rounded-full bg-indigo-400/40 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-24 left-[-6%] h-56 w-56 rounded-full bg-purple-400/30 blur-3xl" aria-hidden="true" />
    </section>
  );
}

function getHeroSummary(location: EnhancedLocation): string {
  const candidates = [
    location.shortDescription?.trim(),
    location.recommendedVisit?.summary?.trim(),
  ].filter((value): value is string => Boolean(value && value.length > 0));

  if (candidates.length > 0) {
    const text = candidates[0];
    return text.length > 140 ? `${text.slice(0, 137)}…` : text;
  }

  const fallback = `Plan a visit to ${location.name} in ${location.city}.`;
  return fallback;
}
