"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Plus, Search, Loader2, X, Star } from "lucide-react";
import { easeReveal } from "@/lib/motion";
import { useLocationSearch } from "@/hooks/useLocationSearch";
import { createActivityFromLocation } from "@/lib/itinerary/createActivityFromLocation";
import type { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import { logger } from "@/lib/logger";

type LocationSearchBarProps = {
  /** Current day's activities (for duplicate detection + timeOfDay inference) */
  dayActivities: ItineraryActivity[];
  /** Callback when a new activity is created from a search result */
  onAddActivity: (activity: Extract<ItineraryActivity, { kind: "place" }>) => void;
  /**
   * When true, the search input renders expanded + focused immediately, and
   * the internal close-X + click-outside-to-collapse behavior is disabled
   * (the parent container — e.g. a modal — owns dismissal).
   */
  defaultExpanded?: boolean;
};

export function LocationSearchBar({
  dayActivities,
  onAddActivity,
  defaultExpanded = false,
}: LocationSearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [query, setQuery] = useState("");
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results, isLoading, isNotFound, isDebouncing } = useLocationSearch(query, {
    limit: 8,
  });

  const collapse = useCallback(() => {
    setIsExpanded(false);
    setQuery("");
    setFetchingId(null);
  }, []);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Click-outside to close dropdown (skipped when parent owns dismissal)
  useEffect(() => {
    if (!isExpanded || defaultExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        collapse();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded, collapse, defaultExpanded]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        collapse();
      }
    },
    [collapse],
  );

  const isDuplicate = useCallback(
    (locationId: string) => {
      return dayActivities.some(
        (a) => a.kind === "place" && a.locationId === locationId,
      );
    },
    [dayActivities],
  );

  const handleSelect = useCallback(
    async (result: { id: string; name: string }) => {
      if (fetchingId) return;

      setFetchingId(result.id);

      try {
        const res = await fetch(`/api/locations/${result.id}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch location: ${res.status}`);
        }

        const data = (await res.json()) as { location: Location };
        const activity = createActivityFromLocation(data.location, dayActivities);
        onAddActivity(activity);
        collapse();
      } catch (error) {
        logger.error("Failed to add location", error instanceof Error ? error : new Error(String(error)));
        setFetchingId(null);
      }
    },
    [fetchingId, dayActivities, onAddActivity, collapse],
  );

  const showDropdown = isExpanded && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <m.button
            key="collapsed"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [...easeReveal] as [number, number, number, number] }}
            onClick={() => setIsExpanded(true)}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-sm font-medium text-stone transition-colors hover:border-sage hover:text-foreground-secondary active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Add a place</span>
          </m.button>
        ) : (
          <m.div
            key="expanded"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: [...easeReveal] as [number, number, number, number] }}
          >
            <div className="flex h-12 items-center gap-2 rounded-lg border border-sage bg-surface px-3">
              <Search className="h-4 w-4 shrink-0 text-stone" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search locations..."
                className="h-full flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-stone"
              />
              {(isLoading || isDebouncing) && query.trim().length >= 2 && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-stone" />
              )}
              {!defaultExpanded && (
                <button
                  type="button"
                  onClick={collapse}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-stone transition-colors hover:text-foreground"
                  aria-label="Close search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown results */}
            <AnimatePresence>
              {showDropdown && (
                <m.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12, ease: [...easeReveal] as [number, number, number, number] }}
                  className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface shadow-[var(--shadow-elevated)]"
                >
                  {isNotFound && (
                    <div className="px-3 py-4 text-center text-sm text-stone">
                      No locations found for &ldquo;{query}&rdquo;
                    </div>
                  )}

                  {results?.map((result) => {
                    const duplicate = isDuplicate(result.id);
                    const isFetching = fetchingId === result.id;

                    return (
                      <button
                        key={result.id}
                        type="button"
                        disabled={!!fetchingId}
                        onClick={() => handleSelect(result)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-foreground transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-canvas disabled:opacity-60"
                      >
                        {/* Thumbnail */}
                        {result.image ? (
                          // 32x32 search result thumbnail, external URL.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={result.image}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sage/10 text-xs font-medium text-sage">
                            {result.name.charAt(0)}
                          </div>
                        )}

                        {/* Text */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {result.name}
                            </span>
                            {duplicate && (
                              <span className="shrink-0 rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                                Already added
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-stone">
                            <span className="truncate">{result.parentName ? `${result.city} · in ${result.parentName}` : result.city}</span>
                            <span aria-hidden="true">&middot;</span>
                            <span className="capitalize">{result.category}</span>
                            {result.rating != null && (
                              <>
                                <span aria-hidden="true">&middot;</span>
                                <Star className="h-3 w-3 fill-current" />
                                <span>{result.rating.toFixed(1)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Loading indicator */}
                        {isFetching && (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sage" />
                        )}
                      </button>
                    );
                  })}
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
