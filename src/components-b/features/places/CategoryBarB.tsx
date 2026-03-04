"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/cn";

type CategoryTab = {
  id: string | null;
  label: string;
  count: number;
};

type CategoryBarBProps = {
  onFiltersClick: () => void;
  activeFilterCount: number;
  inputValue: string;
  onInputChange: (value: string) => void;
  onInputSubmit: () => void;
  tabs?: CategoryTab[];
  activeTab?: string | null;

  viewMode?: "grid" | "map";
  onViewModeChange?: (mode: "grid" | "map") => void;
  mapAvailable?: boolean;
  featuredOnly?: boolean;
  onFeaturedToggle?: () => void;
};

export function CategoryBarB({
  onFiltersClick,
  activeFilterCount,
  inputValue,
  onInputChange,
  onInputSubmit,
  tabs,
  activeTab,
  viewMode = "grid",
  onViewModeChange,
  mapAvailable = false,
  featuredOnly = false,
  onFeaturedToggle,
}: CategoryBarBProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry!.isIntersecting);
      },
      { threshold: 0, rootMargin: "-82px 0px 0px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

      <div
        className={cn(
          "sticky transition-[background-color,box-shadow] duration-300",
          isStuck || viewMode === "map" ? "z-50" : "z-40",
          !(isStuck || viewMode === "map") && "bg-transparent",
        )}
        style={{
          top: isStuck || viewMode === "map" ? "calc(var(--header-h) - 3px)" : "var(--header-h)",
          backgroundColor: isStuck || viewMode === "map" ? "var(--card)" : undefined,
          boxShadow: isStuck || viewMode === "map" ? "var(--shadow-sm)" : "none",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Search row */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
            {/* Compact location count */}
            {tabs && tabs.length > 0 && (() => {
              const activeTabData = tabs.find((t) => t.id === activeTab) ?? tabs[0];
              return activeTabData ? (
                <span className="hidden shrink-0 text-xs font-medium text-[var(--muted-foreground)] whitespace-nowrap sm:inline">
                  {activeTabData.count.toLocaleString()} places
                </span>
              ) : null;
            })()}

            {/* Search input */}
            <form
              className="relative w-full max-w-sm min-w-0"
              onSubmit={(e) => {
                e.preventDefault();
                onInputSubmit();
              }}
            >
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder="Search places..."
                className="w-full rounded-xl border border-[var(--border)] bg-white pl-9 pr-12 py-2.5 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition"
              />
              <button
                type="submit"
                title="Search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--brand-secondary)] active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                aria-label="Search"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>

            {/* Grid / Map toggle */}
            {mapAvailable && onViewModeChange && (
              <div className="flex shrink-0 rounded-xl border border-[var(--border)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => onViewModeChange("grid")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30",
                    viewMode === "grid"
                      ? "bg-[var(--primary)] text-white"
                      : "bg-white text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                  )}
                  aria-label="Grid view"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange("map")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30",
                    viewMode === "map"
                      ? "bg-[var(--primary)] text-white"
                      : "bg-white text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                  )}
                  aria-label="Map view"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                  <span className="hidden sm:inline">Map</span>
                </button>
              </div>
            )}

            {/* Featured toggle */}
            {onFeaturedToggle && (
              <button
                onClick={onFeaturedToggle}
                aria-label="Show featured places"
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30",
                  featuredOnly
                    ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--foreground)]",
                )}
              >
                <svg className="h-4 w-4" fill={featuredOnly ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                <span className="hidden sm:inline">Featured</span>
              </button>
            )}

            {/* Refine button */}
            <button
              onClick={onFiltersClick}
              aria-label="Refine filters"
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30",
                activeFilterCount > 0
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--foreground)]",
              )}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              <span className="hidden sm:inline">Refine</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>


        </div>
      </div>
    </>
  );
}
