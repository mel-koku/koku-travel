"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Plus, Search, Loader2, X, Star, Check, SlidersHorizontal } from "lucide-react";
import { easeReveal } from "@/lib/motion";
import { useLocationSearch } from "@/hooks/useLocationSearch";
import { createActivityFromLocation } from "@/lib/itinerary/createActivityFromLocation";
import type { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { LocationSearchResult } from "@/app/api/locations/search/route";
import { logger } from "@/lib/logger";
import {
  trackSmartSearchTriggered,
  trackSmartSearchCompleted,
} from "@/lib/analytics/addPlace";

type SmartSearchResponse = {
  results: LocationSearchResult[];
  interpretedAs: string[];
  originalQuery: string;
};

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
  /**
   * Current day's city for trip-context ranking. Results in this city rank
   * highest. Optional — without it, results stay in their default order.
   */
  currentDayCity?: string;
  /**
   * All cities in the current trip. Results in any of these (other than the
   * current day's) rank below current-city matches but above unrelated results.
   * Results outside both lists fade visually to de-emphasize.
   */
  tripCities?: string[];
  /**
   * Optional callback fired when the user clicks the "Add as custom place"
   * CTA inside the empty-state of catalog search. Receives the query text so
   * the parent can switch to the custom tab and pre-fill the title.
   * When omitted, the CTA isn't rendered.
   */
  onAddCustomFromQuery?: (query: string) => void;
};

export function LocationSearchBar({
  dayActivities,
  onAddActivity,
  defaultExpanded = false,
  currentDayCity,
  tripCities,
  onAddCustomFromQuery,
}: LocationSearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [query, setQuery] = useState("");
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [smartSearch, setSmartSearch] = useState<{
    state: "idle" | "loading" | "done" | "error";
    response?: SmartSearchResponse;
  }>({ state: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results, isLoading, isNotFound, isDebouncing } = useLocationSearch(query, {
    limit: 8,
    currentCity: currentDayCity,
    tripCities,
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

  // Reset smart search whenever the user types — stale rewrites for a previous
  // query shouldn't bleed into the new one.
  useEffect(() => {
    setSmartSearch({ state: "idle" });
  }, [query]);

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

  const runSmartSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || smartSearch.state === "loading") return;

    trackSmartSearchTriggered({ query: trimmed });
    setSmartSearch({ state: "loading" });

    try {
      const res = await fetch("/api/locations/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          limit: 8,
          currentCity: currentDayCity,
          tripCities,
        }),
      });
      if (!res.ok) {
        throw new Error(`smart search failed: ${res.status}`);
      }
      const response = (await res.json()) as SmartSearchResponse;
      trackSmartSearchCompleted({
        query: trimmed,
        candidateCount: response.interpretedAs.length,
        hadResults: response.results.length > 0,
      });
      setSmartSearch({ state: "done", response });
    } catch (error) {
      logger.warn("smart search failed", {
        error: error instanceof Error ? error.message : String(error),
        query: trimmed,
      });
      setSmartSearch({ state: "error" });
    }
  }, [query, smartSearch.state, currentDayCity, tripCities]);

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

  // When smart-search has filled the gap, prefer those results over the empty
  // keyword/fuzzy/semantic set — the user explicitly asked for the LLM
  // interpretation and that's the relevant signal.
  const displayResults =
    smartSearch.state === "done" &&
    smartSearch.response &&
    smartSearch.response.results.length > 0
      ? smartSearch.response.results
      : results;

  // Strip candidate interpretations that just echo the user's typed query —
  // showing "Showing results for: Amerika-Mura" when the user already typed
  // "amerika-mura" is noise. Case-insensitive comparison; trim both sides.
  const meaningfulInterpretations =
    smartSearch.state === "done" && smartSearch.response
      ? (() => {
          const original = smartSearch.response.originalQuery.toLowerCase().trim();
          return smartSearch.response.interpretedAs.filter(
            (c) => c.toLowerCase().trim() !== original,
          );
        })()
      : [];

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
                  {/* Smart-search interpretation banner — shown when LLM
                      rewrite returned candidates that meaningfully reframe
                      the user's query. Skipped when the only interpretation
                      verbatim-matches the typed query (would just be noise). */}
                  {smartSearch.state === "done" &&
                    smartSearch.response &&
                    smartSearch.response.results.length > 0 &&
                    meaningfulInterpretations.length > 0 && (
                      <div className="mb-2 flex items-start gap-2 rounded-md bg-canvas px-3 py-2 text-xs text-foreground-secondary">
                        <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-primary" />
                        <div>
                          Showing results for{" "}
                          <span className="font-medium text-foreground">
                            {meaningfulInterpretations.join(", ")}
                          </span>
                        </div>
                      </div>
                    )}

                  {/* Empty state — only when keyword/fuzzy/semantic returned 0
                      AND smart-search hasn't already filled the gap. */}
                  {isNotFound &&
                    !(
                      smartSearch.state === "done" &&
                      smartSearch.response &&
                      smartSearch.response.results.length > 0
                    ) && (
                      <div className="px-1 py-6 text-center">
                        <div className="text-sm text-stone">
                          No locations found for &ldquo;{query}&rdquo;
                          {smartSearch.state === "done" &&
                            smartSearch.response &&
                            smartSearch.response.results.length === 0 && (
                              <span className="ml-1">No extra matches found either.</span>
                            )}
                        </div>

                        {/* Refined-search button — hidden once the refined search
                            has completed (results or no results, the user has
                            already used their one shot). */}
                        {smartSearch.state === "idle" && (
                          <button
                            type="button"
                            onClick={runSmartSearch}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-primary/10 px-3 py-1.5 text-sm font-medium text-brand-primary hover:bg-brand-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Refine search
                          </button>
                        )}
                        {smartSearch.state === "loading" && (
                          <div className="mt-3 inline-flex items-center gap-2 text-sm text-foreground-secondary">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Refining your search…
                          </div>
                        )}
                        {smartSearch.state === "error" && (
                          <div className="mt-3 text-sm text-warning">
                            Couldn&apos;t reach the server. Try again, or add your own below.
                          </div>
                        )}

                        {onAddCustomFromQuery && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => onAddCustomFromQuery(query.trim())}
                              className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-sm"
                            >
                              Add &ldquo;{query.trim()}&rdquo; as your own
                              <span aria-hidden="true">→</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                  <ul className="divide-y divide-border">
                    {displayResults?.map((result) => {
                      const duplicate = isDuplicate(result.id);
                      const isFetching = fetchingId === result.id;
                      // Soft fade for results outside the trip's cities. Keeps
                      // them accessible (rank, don't filter) while signalling
                      // they're less relevant to the current day.
                      const fadeFar = result.cityTier === "other";

                      return (
                        <li key={result.id}>
                          <button
                            type="button"
                            disabled={!!fetchingId}
                            onClick={() => handleSelect(result)}
                            className={`flex w-full items-center gap-3 rounded-md px-2 py-3 text-left text-foreground transition-colors hover:bg-canvas hover:opacity-100 disabled:opacity-60 ${fadeFar ? "opacity-60" : ""}`}
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
