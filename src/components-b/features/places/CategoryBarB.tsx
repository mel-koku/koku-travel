"use client";

import { useRef, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ActiveFilter } from "@/types/filters";
import type { VideoPlatform } from "@/lib/video/platforms";
import { PlatformIcon } from "@/components/features/video-import/PlatformIcon";

export type InputMode = "search" | "url-detected" | "extracting";

type CategoryTab = {
  id: string | null;
  label: string;
  count: number;
};

type CategoryBarBProps = {
  onFiltersClick: () => void;
  activeFilterCount: number;
  activeFilters?: ActiveFilter[];
  onRemoveFilter?: (filter: ActiveFilter) => void;
  onClearAllFilters?: () => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onInputPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onInputSubmit: () => void;
  inputMode: InputMode;
  detectedPlatform: VideoPlatform | null;
  tabs?: CategoryTab[];
  activeTab?: string | null;
  onTabChange?: (tabId: string | null) => void;
  viewMode?: "grid" | "map";
  onViewModeChange?: (mode: "grid" | "map") => void;
  mapAvailable?: boolean;
};

export function CategoryBarB({
  onFiltersClick,
  activeFilterCount,
  activeFilters = [],
  onRemoveFilter,
  onClearAllFilters,
  inputValue,
  onInputChange,
  onInputPaste,
  onInputSubmit,
  inputMode,
  detectedPlatform,
  tabs,
  activeTab,
  onTabChange: _onTabChange,
  viewMode = "grid",
  onViewModeChange,
  mapAvailable = false,
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

  const chipFilters = activeFilters.filter((f) => f.type !== "search");
  const hasChips = chipFilters.length > 0;

  const isExtracting = inputMode === "extracting";
  const isUrlDetected = inputMode === "url-detected";

  return (
    <>
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

      <div
        className={cn(
          "sticky z-40",
          isStuck || viewMode === "map"
            ? "bg-white/85 backdrop-blur-xl border-b border-[var(--border)]"
            : "bg-transparent border-b border-transparent",
        )}
        style={{ top: "var(--header-h)" }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Search row */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
            {/* Compact location count */}
            {tabs && tabs.length > 0 && (() => {
              const activeTabData = tabs.find((t) => t.id === activeTab) ?? tabs[0];
              return activeTabData ? (
                <span className="shrink-0 text-xs font-medium text-[var(--muted-foreground)] whitespace-nowrap">
                  {activeTabData.count.toLocaleString()} places
                </span>
              ) : null;
            })()}
            {/* Search / link import input */}
            <form
              className="relative w-full max-w-sm min-w-0"
              onSubmit={(e) => {
                e.preventDefault();
                onInputSubmit();
              }}
            >
              {detectedPlatform ? (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <PlatformIcon
                    platform={detectedPlatform}
                    className="h-4 w-4 text-[var(--muted-foreground)]"
                  />
                </div>
              ) : (
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              <input
                ref={searchInputRef}
                type="text"
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onPaste={onInputPaste}
                placeholder="Search places or paste a link..."
                disabled={isExtracting}
                className="w-full rounded-xl border border-[var(--border)] bg-white pl-9 pr-12 py-2.5 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isExtracting}
                title={isExtracting ? "Importing..." : isUrlDetected ? "Import link" : "Search"}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--brand-secondary)] active:scale-[0.98] transition disabled:opacity-60"
                aria-label={isExtracting ? "Importing..." : isUrlDetected ? "Import link" : "Search"}
              >
                {isExtracting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isUrlDetected ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>
            </form>

            {/* Grid / Map toggle */}
            {mapAvailable && onViewModeChange && (
              <div className="flex shrink-0 rounded-xl border border-[var(--border)] overflow-hidden h-11">
                <button
                  type="button"
                  onClick={() => onViewModeChange("grid")}
                  title="Grid view"
                  className={cn(
                    "flex items-center justify-center w-11 transition",
                    viewMode === "grid"
                      ? "bg-[var(--primary)] text-white"
                      : "bg-white text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                  )}
                  aria-label="Grid view"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange("map")}
                  title="Map view"
                  className={cn(
                    "flex items-center justify-center w-11 transition",
                    viewMode === "map"
                      ? "bg-[var(--primary)] text-white"
                      : "bg-white text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                  )}
                  aria-label="Map view"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                </button>
              </div>
            )}

            {/* Refine button */}
            <button
              onClick={onFiltersClick}
              aria-label="Refine filters"
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition shrink-0",
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

          {/* Active filter chips */}
          {hasChips && (
            <div className="flex flex-wrap items-center justify-center gap-2 pb-3">
              {chipFilters.map((filter, index) => (
                <button
                  key={`${filter.type}-${filter.value}-${index}`}
                  onClick={() => onRemoveFilter?.(filter)}
                  title={`Remove ${filter.label}`}
                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground-secondary)] hover:bg-[var(--border)] border border-[var(--border)] transition group"
                  aria-label={`Remove ${filter.label} filter`}
                >
                  <span>{filter.label}</span>
                  <svg
                    className="h-3 w-3 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition"
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
                  className="text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline underline-offset-2 transition ml-1"
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
