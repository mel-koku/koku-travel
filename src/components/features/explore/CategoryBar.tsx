"use client";

import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/cn";
import type { ActiveFilter } from "@/types/filters";

type CategoryBarProps = {
  categories: readonly { value: string; label: string }[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  onFiltersClick: () => void;
  activeFilterCount: number;
  totalCount: number;
  /** Active filters to render as chips below tabs */
  activeFilters?: ActiveFilter[];
  onRemoveFilter?: (filter: ActiveFilter) => void;
  onClearAllFilters?: () => void;
  /** Inline search */
  query?: string;
  onQueryChange?: (value: string) => void;
};

export function CategoryBar({
  categories,
  selectedCategories,
  onCategoriesChange,
  onFiltersClick,
  activeFilterCount,
  totalCount,
  activeFilters = [],
  onRemoveFilter,
  onClearAllFilters,
  query = "",
  onQueryChange,
}: CategoryBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);

  const toggleCategory = (categoryValue: string) => {
    if (categoryValue === "__all__") {
      // "All" tab clears category selection
      onCategoriesChange([]);
      return;
    }
    if (selectedCategories.includes(categoryValue)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== categoryValue));
    } else {
      onCategoriesChange([...selectedCategories, categoryValue]);
    }
  };

  const handleSearchToggle = useCallback(() => {
    if (searchExpanded) {
      setSearchExpanded(false);
      onQueryChange?.("");
    } else {
      setSearchExpanded(true);
      // Focus input after expansion
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [searchExpanded, onQueryChange]);

  // Non-search active filters (for chip display)
  const chipFilters = activeFilters.filter((f) => f.type !== "search" && f.type !== "category");
  const hasChips = chipFilters.length > 0;

  return (
    <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-4 py-3">
          {/* Category tabs */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div className="flex gap-1 sm:gap-2 min-w-max">
              {/* All tab */}
              <button
                onClick={() => toggleCategory("__all__")}
                className={cn(
                  "px-3 py-2 text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
                  selectedCategories.length === 0
                    ? "border-brand-primary text-foreground"
                    : "border-transparent text-stone hover:text-foreground"
                )}
              >
                All
                <span className="ml-1 text-xs text-stone">
                  {totalCount.toLocaleString()}
                </span>
              </button>

              {categories.map((category) => {
                const isSelected = selectedCategories.includes(category.value);

                return (
                  <button
                    key={category.value}
                    onClick={() => toggleCategory(category.value)}
                    className={cn(
                      "px-3 py-2 text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
                      isSelected
                        ? "border-brand-primary text-foreground"
                        : "border-transparent text-stone hover:text-foreground"
                    )}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right side: search + refine */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Inline search */}
            {searchExpanded ? (
              <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5">
                <svg className="h-4 w-4 text-stone shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => onQueryChange?.(e.target.value)}
                  placeholder="Search..."
                  className="w-32 sm:w-44 bg-transparent text-sm placeholder:text-stone focus:outline-none"
                />
                <button
                  onClick={handleSearchToggle}
                  className="p-0.5 rounded hover:bg-surface"
                  aria-label="Close search"
                >
                  <svg className="h-3.5 w-3.5 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={handleSearchToggle}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-surface transition"
                aria-label="Search"
              >
                <svg className="h-4 w-4 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            {/* Refine button */}
            <button
              onClick={onFiltersClick}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition",
                activeFilterCount > 0
                  ? "border-brand-primary text-brand-primary"
                  : "border-border text-stone hover:border-brand-primary hover:text-foreground"
              )}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              <span className="hidden sm:inline">Refine</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {hasChips && (
          <div className="flex flex-wrap items-center gap-2 pb-3">
            {chipFilters.map((filter, index) => (
              <button
                key={`${filter.type}-${filter.value}-${index}`}
                onClick={() => onRemoveFilter?.(filter)}
                className="inline-flex items-center gap-1 rounded-xl bg-surface px-2.5 py-1 text-xs font-medium text-foreground-secondary hover:bg-border/50 border border-border/50 transition group"
                aria-label={`Remove ${filter.label} filter`}
              >
                <span>{filter.label}</span>
                <svg
                  className="h-3 w-3 text-stone group-hover:text-foreground-secondary transition"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
            {chipFilters.length > 1 && (
              <button
                onClick={onClearAllFilters}
                className="text-xs font-medium text-stone hover:text-foreground-secondary underline underline-offset-2 transition ml-1"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
