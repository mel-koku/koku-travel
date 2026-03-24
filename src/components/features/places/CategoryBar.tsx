"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/cn";
import type { ActiveFilter } from "@/types/filters";

type CategoryBarProps = {
  onFiltersClick: () => void;
  activeFilterCount: number;
  activeFilters?: ActiveFilter[];
  onRemoveFilter?: (filter: ActiveFilter) => void;
  onClearAllFilters?: () => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onInputSubmit: () => void;
  totalCount?: number;
  viewMode?: "grid" | "map";
  onViewModeChange?: (mode: "grid" | "map") => void;
  mapAvailable?: boolean;
};

export function CategoryBar({
  onFiltersClick,
  activeFilterCount,
  activeFilters = [],
  onRemoveFilter,
  onClearAllFilters,
  inputValue,
  onInputChange,
  onInputSubmit,
  totalCount,
  viewMode,
  onViewModeChange,
  mapAvailable = false,
}: CategoryBarProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry!.isIntersecting);
      },
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Publish bar height as CSS variable for map layout positioning
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const ro = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty(
        "--category-bar-h",
        `${entry!.contentRect.height}px`,
      );
    });
    ro.observe(bar);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--category-bar-h");
    };
  }, []);

  const chipFilters = activeFilters.filter((f) => f.type !== "search");
  const hasChips = chipFilters.length > 0;

  return (
    <>
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

      <div
        ref={barRef}
        className={cn(
          "sticky top-20 z-40",
          isStuck || viewMode === "map"
            ? "bg-background/95 backdrop-blur-xl border-b border-border/50"
            : "bg-transparent border-b border-transparent"
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-3">
            {/* Count */}
            {totalCount != null && (
              <span className="hidden sm:inline shrink-0 text-sm text-stone">
                {totalCount.toLocaleString()} places
              </span>
            )}

            {/* Search input */}
            <form
              className="relative w-full max-w-xs min-w-0"
              onSubmit={(e) => {
                e.preventDefault();
                onInputSubmit();
              }}
            >
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder="Search places..."
                className="w-full h-12 rounded-lg border border-border bg-surface/50 pl-9 pr-12 text-base text-foreground placeholder:text-stone shadow-[var(--shadow-sm)] focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
              />
              <button
                type="submit"
                className="absolute -right-px top-0 bottom-0 flex w-10 items-center justify-center rounded-l-none rounded-r-lg bg-brand-primary text-white hover:bg-brand-primary/90 active:scale-[0.98] transition"
                aria-label="Search"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>

            {/* Grid / Map toggle */}
            {mapAvailable && onViewModeChange && (
              <div className="flex shrink-0 overflow-hidden rounded-lg border border-border h-12">
                <button
                  type="button"
                  onClick={() => onViewModeChange("grid")}
                  className={cn(
                    "flex items-center gap-1 px-3 text-sm font-medium transition",
                    viewMode === "grid"
                      ? "bg-brand-primary text-white"
                      : "text-stone hover:text-foreground"
                  )}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange("map")}
                  className={cn(
                    "flex items-center gap-1 px-3 text-sm font-medium transition",
                    viewMode === "map"
                      ? "bg-brand-primary text-white"
                      : "text-stone hover:text-foreground"
                  )}
                  aria-label="Map view"
                  aria-pressed={viewMode === "map"}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <span className="hidden sm:inline">Map</span>
                </button>
              </div>
            )}

            {/* Refine button */}
            <button
              onClick={onFiltersClick}
              aria-label="Refine filters"
              className={cn(
                "flex items-center gap-1.5 rounded-lg border h-12 px-3 text-sm font-medium transition shrink-0",
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

          {/* Active filter chips */}
          {hasChips && (
            <div className="flex flex-wrap items-center justify-center gap-2 pb-3">
              {chipFilters.map((filter, index) => (
                <button
                  key={`${filter.type}-${filter.value}-${index}`}
                  onClick={() => onRemoveFilter?.(filter)}
                  className="inline-flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1 text-xs font-medium text-foreground-secondary hover:bg-border/50 border border-border/50 transition group"
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
    </>
  );
}
