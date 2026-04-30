"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Plus, Search, Loader2, X, Star, Check } from "lucide-react";
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

            {/* Inline results — modal body owns scroll, no popover treatment */}
            <AnimatePresence>
              {showDropdown && (
                <m.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12, ease: [...easeReveal] as [number, number, number, number] }}
                  className="mt-2"
                >
                  {isNotFound && (
                    <div className="px-1 py-4 text-center text-sm text-stone">
                      No locations found for &ldquo;{query}&rdquo;
                    </div>
                  )}

                  <ul className="divide-y divide-border">
                    {results?.map((result) => {
                      const duplicate = isDuplicate(result.id);
                      const isFetching = fetchingId === result.id;

                      return (
                        <li key={result.id}>
                          <button
                            type="button"
                            disabled={!!fetchingId}
                            onClick={() => handleSelect(result)}
                            className="flex w-full items-center gap-3 rounded-md px-2 py-3 text-left text-foreground transition-colors hover:bg-canvas disabled:opacity-60"
                          >
                            {/* Thumbnail (56×56) with overlay check for duplicates */}
                            <div className="relative shrink-0">
                              {result.image ? (
                                // 56×56 search result thumbnail, external URL.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={result.image}
                                  alt=""
                                  className="h-14 w-14 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-sage/10 text-base font-medium text-sage">
                                  {result.name.charAt(0)}
                                </div>
                              )}
                              {duplicate && (
                                <span
                                  aria-label="Already added to this day"
                                  className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-white shadow-[var(--shadow-sm)]"
                                >
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                </span>
                              )}
                            </div>

                            {/* Text — name + Category · City */}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">
                                {result.name}
                              </div>
                              <div className="mt-0.5 truncate text-xs text-stone">
                                <span className="capitalize">{result.category}</span>
                                <span aria-hidden="true"> · </span>
                                <span>{result.city}</span>
                              </div>
                            </div>

                            {/* Right side: rating pill (de-emphasized) + loading */}
                            {result.rating != null && !isFetching && (
                              <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-canvas px-2 py-0.5 text-xs text-foreground-secondary">
                                <Star className="h-3 w-3 fill-current" />
                                {result.rating.toFixed(1)}
                              </span>
                            )}
                            {isFetching && (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sage" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
