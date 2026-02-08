"use client";

import { useState, useMemo } from "react";

import type { GuideSummary, GuideType } from "@/types/guide";
import { GuidesGrid } from "./GuidesGrid";

type GuidesPageClientProps = {
  guides: GuideSummary[];
};

type ActiveFilter = {
  type: "search" | "guideType" | "city";
  value: string;
  label: string;
};

const GUIDE_TYPE_OPTIONS: { value: GuideType; label: string }[] = [
  { value: "itinerary", label: "Itinerary" },
  { value: "listicle", label: "Top Picks" },
  { value: "deep_dive", label: "Deep Dive" },
  { value: "seasonal", label: "Seasonal" },
];

export function GuidesPageClient({ guides }: GuidesPageClientProps) {
  const [query, setQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<GuideType[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  // Extract unique cities from guides
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    guides.forEach((guide) => {
      if (guide.city) {
        cities.add(guide.city);
      }
    });
    return Array.from(cities).sort();
  }, [guides]);

  // Filter guides based on search and filters
  const filteredGuides = useMemo(() => {
    return guides.filter((guide) => {
      // Search filter
      if (query) {
        const searchLower = query.toLowerCase();
        const matchesTitle = guide.title.toLowerCase().includes(searchLower);
        const matchesSummary = guide.summary.toLowerCase().includes(searchLower);
        const matchesSubtitle = guide.subtitle?.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesSummary && !matchesSubtitle) {
          return false;
        }
      }

      // Type filter
      if (selectedTypes.length > 0 && !selectedTypes.includes(guide.guideType)) {
        return false;
      }

      // City filter
      if (selectedCities.length > 0 && (!guide.city || !selectedCities.includes(guide.city))) {
        return false;
      }

      return true;
    });
  }, [guides, query, selectedTypes, selectedCities]);

  // Build active filters for chips
  const activeFilters: ActiveFilter[] = useMemo(() => {
    const filters: ActiveFilter[] = [];

    if (query) {
      filters.push({ type: "search", value: query, label: `"${query}"` });
    }

    selectedTypes.forEach((type) => {
      const option = GUIDE_TYPE_OPTIONS.find((o) => o.value === type);
      if (option) {
        filters.push({ type: "guideType", value: type, label: option.label });
      }
    });

    selectedCities.forEach((city) => {
      filters.push({ type: "city", value: city, label: capitalizeFirst(city) });
    });

    return filters;
  }, [query, selectedTypes, selectedCities]);

  const handleRemoveFilter = (filter: ActiveFilter) => {
    switch (filter.type) {
      case "search":
        setQuery("");
        break;
      case "guideType":
        setSelectedTypes((prev) => prev.filter((t) => t !== filter.value));
        break;
      case "city":
        setSelectedCities((prev) => prev.filter((c) => c !== filter.value));
        break;
    }
  };

  const handleClearAll = () => {
    setQuery("");
    setSelectedTypes([]);
    setSelectedCities([]);
  };

  const toggleType = (type: GuideType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="max-w-md">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search guides..."
        />
      </div>

      {/* Filter Buttons */}
      <div className="space-y-4">
        {/* Type filters */}
        <div className="flex flex-wrap gap-2">
          {GUIDE_TYPE_OPTIONS.map((option) => (
            <FilterButton
              key={option.value}
              label={option.label}
              isActive={selectedTypes.includes(option.value)}
              onClick={() => toggleType(option.value)}
            />
          ))}
        </div>

        {/* City filters */}
        {availableCities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableCities.map((city) => (
              <FilterButton
                key={city}
                label={capitalizeFirst(city)}
                isActive={selectedCities.includes(city)}
                onClick={() => toggleCity(city)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <ActiveFilterChips
          filters={activeFilters}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAll}
        />
      )}

      {/* Results Count */}
      <div className="text-sm text-stone">
        {filteredGuides.length === guides.length
          ? `${guides.length} guides`
          : `${filteredGuides.length} of ${guides.length} guides`}
      </div>

      {/* Guides Grid */}
      <GuidesGrid guides={filteredGuides} />
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <label htmlFor="guides-search" className="sr-only">
        Search guides
      </label>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone">
        <MagnifyingGlassIcon className="h-4 w-4" />
      </span>
      <input
        id="guides-search"
        type="text"
        className="w-full h-10 rounded-xl border border-border bg-surface text-foreground placeholder-stone pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute inset-y-0 right-2 flex items-center text-stone hover:text-foreground-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-full p-1"
          aria-label="Clear search"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function FilterButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200 border ${
        isActive
          ? "bg-brand-primary text-white border-brand-primary"
          : "bg-background text-foreground border-border hover:border-stone"
      }`}
    >
      {label}
    </button>
  );
}

function ActiveFilterChips({
  filters,
  onRemove,
  onClearAll,
}: {
  filters: ActiveFilter[];
  onRemove: (filter: ActiveFilter) => void;
  onClearAll: () => void;
}) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface/50 rounded-2xl px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter, index) => (
          <button
            key={`${filter.type}-${filter.value}-${index}`}
            onClick={() => onRemove(filter)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-background px-3 py-1.5 text-sm font-medium text-foreground-secondary hover:bg-surface border border-border/50 transition-all duration-200 group active:scale-[0.97]"
            aria-label={`Remove ${filter.label} filter`}
          >
            <span>{filter.label}</span>
            <XIcon className="h-3.5 w-3.5 text-stone group-hover:text-foreground-secondary transition" />
          </button>
        ))}
        {filters.length > 1 && (
          <button
            onClick={onClearAll}
            className="text-sm font-medium text-stone hover:text-foreground-secondary underline underline-offset-2 transition ml-1"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

function MagnifyingGlassIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.167 15a5.833 5.833 0 1 0 0-11.666 5.833 5.833 0 0 0 0 11.666Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m14.167 14.167 2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
