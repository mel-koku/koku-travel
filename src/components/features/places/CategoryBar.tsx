"use client";

import { useRef, useState, useEffect } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ActiveFilter } from "@/types/filters";
import type { VideoPlatform } from "@/lib/video/platforms";
import { PlatformIcon } from "@/components/features/video-import/PlatformIcon";

export type InputMode = "search" | "url-detected" | "extracting";

type CategoryBarProps = {
  onFiltersClick: () => void;
  activeFilterCount: number;
  /** Active filters to render as removable chips */
  activeFilters?: ActiveFilter[];
  onRemoveFilter?: (filter: ActiveFilter) => void;
  onClearAllFilters?: () => void;
  /** Unified input */
  inputValue: string;
  onInputChange: (value: string) => void;
  onInputPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onInputSubmit: () => void;
  inputMode: InputMode;
  detectedPlatform: VideoPlatform | null;
  /** Ask Koku chat integration */
  onAskKokuClick?: () => void;
  isChatOpen?: boolean;
};

export function CategoryBar({
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
  onAskKokuClick,
  isChatOpen = false,
}: CategoryBarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  // Detect when the bar becomes sticky via a sentinel element
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel scrolls out of view, the bar is stuck
        setIsStuck(!entry!.isIntersecting);
      },
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Show all active filters as chips
  const chipFilters = activeFilters.filter((f) => f.type !== "search");
  const hasChips = chipFilters.length > 0;

  const isExtracting = inputMode === "extracting";
  const isUrlDetected = inputMode === "url-detected";

  return (
    <>
      {/* Sentinel — sits right above the sticky bar to detect stuck state */}
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

      <div
        className={cn(
          "sticky top-20 z-40",
          isStuck
            ? "bg-background/95 backdrop-blur-xl border-b border-border/50"
            : "bg-transparent border-b border-transparent"
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              "flex items-center justify-center gap-2 sm:gap-3 py-3",
            )}
          >
            {/* Unified search / link import input */}
            <form
              className="relative w-full max-w-sm min-w-0"
              onSubmit={(e) => {
                e.preventDefault();
                onInputSubmit();
              }}
            >
              {/* Left icon — search or platform */}
              {detectedPlatform ? (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <PlatformIcon
                    platform={detectedPlatform}
                    className="h-4 w-4 text-foreground-secondary"
                  />
                </div>
              ) : (
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone pointer-events-none"
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
                className="w-full rounded-xl border border-border bg-surface/50 pl-9 pr-12 py-2.5 text-base text-foreground placeholder:text-stone focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 transition disabled:opacity-60"
              />
              {/* Right CTA button */}
              <button
                type="submit"
                disabled={isExtracting}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 active:scale-[0.95] transition disabled:opacity-60"
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

            {/* Refine button */}
            <button
              onClick={onFiltersClick}
              aria-label="Refine filters"
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition shrink-0",
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

            {/* Ask Koku button */}
            {onAskKokuClick && (
              <button
                onClick={onAskKokuClick}
                aria-label="Ask Koku"
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition shrink-0",
                  isChatOpen
                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                    : "border-brand-primary/60 text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5 active:scale-[0.98]"
                )}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Ask Koku</span>
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {hasChips && (
            <div className="flex flex-wrap items-center justify-center gap-2 pb-3">
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
    </>
  );
}
