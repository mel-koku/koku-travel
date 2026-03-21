"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/cn";

type CategoryTab = {
  id: string | null;
  label: string;
  count: number;
};

type CategoryBarCProps = {
  onFiltersClick: () => void;
  activeFilterCount: number;
  inputValue: string;
  onInputChange: (value: string) => void;
  onInputSubmit: () => void;
  tabs?: CategoryTab[];
  activeTab?: string | null;
  onTabChange?: (id: string | null) => void;
  viewMode?: "grid" | "map";
  onViewModeChange?: (mode: "grid" | "map") => void;
  mapAvailable?: boolean;
};

export function CategoryBarC({
  onFiltersClick,
  activeFilterCount,
  inputValue,
  onInputChange,
  onInputSubmit,
  tabs,
  activeTab,
  onTabChange,
  viewMode = "grid",
  onViewModeChange,
  mapAvailable = false,
}: CategoryBarCProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  // Publish actual height as CSS variable for PlacesMapLayoutC
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
        ref={barRef}
        className={cn(
          "sticky transition-[background-color,border-color] duration-300",
          isStuck || viewMode === "map" ? "z-50" : "z-40",
        )}
        style={{
          top: isStuck || viewMode === "map" ? "calc(var(--header-h) - 1px)" : "var(--header-h)",
          backgroundColor: "var(--background)",
          borderBottom: isStuck || viewMode === "map" ? "1px solid var(--border)" : "1px solid transparent",
        }}
      >
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 py-2">
            {/* Category tabs */}
            {tabs && tabs.length > 1 && (
              <div className="flex items-center gap-0 overflow-x-auto overscroll-contain scrollbar-hide -mx-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id ?? "all"}
                    type="button"
                    onClick={() => onTabChange?.(tab.id)}
                    className={cn(
                      "shrink-0 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors whitespace-nowrap min-h-[44px]",
                      activeTab === tab.id
                        ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-b-2 border-transparent",
                    )}
                  >
                    {tab.label}
                    <span className="ml-1.5 text-[10px] font-medium opacity-60">
                      {tab.count.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1" />

            {/* Search input */}
            <form
              className="relative w-full max-w-56 min-w-0"
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
                placeholder="Search..."
                className="w-full border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition h-11"
                style={{ borderRadius: 0 }}
              />
            </form>

            {/* Grid / Map toggle */}
            {mapAvailable && onViewModeChange && (
              <div className="flex shrink-0 border border-[var(--border)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => onViewModeChange("grid")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30",
                    viewMode === "grid"
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
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
                    "flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30",
                    viewMode === "map"
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
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

            {/* Refine button */}
            <button
              onClick={onFiltersClick}
              aria-label="Refine filters"
              className={cn(
                "flex items-center gap-1.5 border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition shrink-0 min-h-[44px] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30",
                activeFilterCount > 0
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]",
              )}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              <span className="hidden sm:inline">Refine</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center bg-[var(--primary)] text-[10px] font-bold text-white">
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
