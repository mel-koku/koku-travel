"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Loader2, X, Star } from "lucide-react";
import { useLocationSearch } from "@/hooks/useLocationSearch";
import { createActivityFromLocation } from "@/lib/itinerary/createActivityFromLocation";
import type { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import { logger } from "@/lib/logger";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type LocationSearchBarBProps = {
  /** Current day's activities (for duplicate detection + timeOfDay inference) */
  dayActivities: ItineraryActivity[];
  /** Callback when a new activity is created from a search result */
  onAddActivity: (activity: Extract<ItineraryActivity, { kind: "place" }>) => void;
};

export function LocationSearchBarB({
  dayActivities,
  onAddActivity,
}: LocationSearchBarBProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results, isLoading, isNotFound, isDebouncing } = useLocationSearch(query, {
    limit: 8,
  });

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      // Small delay to let the animation start
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Click-outside to close dropdown
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        collapse();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  const collapse = useCallback(() => {
    setIsExpanded(false);
    setQuery("");
    setFetchingId(null);
  }, []);

  // Escape to collapse
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        collapse();
      }
    },
    [collapse],
  );

  // Check if location already exists in this day
  const isDuplicate = useCallback(
    (locationId: string) => {
      return dayActivities.some(
        (a) => a.kind === "place" && a.locationId === locationId,
      );
    },
    [dayActivities],
  );

  // Handle selecting a search result
  const handleSelect = useCallback(
    async (result: { id: string; name: string }) => {
      if (fetchingId) return;

      // Duplicate warning
      if (isDuplicate(result.id)) {
        // Still allow adding — just let them know
      }

      setFetchingId(result.id);

      try {
        // Fetch full location data (need coordinates, recommendedVisit, etc.)
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
    [fetchingId, isDuplicate, dayActivities, onAddActivity, collapse],
  );

  const showDropdown = isExpanded && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.button
            key="collapsed"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: bEase }}
            onClick={() => setIsExpanded(true)}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed text-sm font-medium transition-colors active:scale-[0.98]"
            style={{
              borderColor: "var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Add a place</span>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: bEase }}
          >
            <div
              className="flex h-12 items-center gap-2 rounded-xl border px-3"
              style={{
                borderColor: "var(--primary)",
                background: "var(--card)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Search
                className="h-4 w-4 shrink-0"
                style={{ color: "var(--muted-foreground)" }}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search locations..."
                className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-[var(--muted-foreground)]"
                style={{ color: "var(--foreground)" }}
              />
              {(isLoading || isDebouncing) && query.trim().length >= 2 && (
                <Loader2
                  className="h-4 w-4 shrink-0 animate-spin"
                  style={{ color: "var(--muted-foreground)" }}
                />
              )}
              <button
                type="button"
                onClick={collapse}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                style={{ color: "var(--muted-foreground)" }}
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dropdown results */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12, ease: bEase }}
                  className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--card)",
                    boxShadow: "var(--shadow-elevated)",
                  }}
                >
                  {isNotFound && (
                    <div
                      className="px-3 py-4 text-center text-sm"
                      style={{ color: "var(--muted-foreground)" }}
                    >
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
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors first:rounded-t-xl last:rounded-b-xl disabled:opacity-60"
                        style={{
                          color: "var(--foreground)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "color-mix(in srgb, var(--primary) 6%, transparent)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {/* Thumbnail */}
                        {result.image ? (
                          <img
                            src={result.image}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-medium"
                            style={{
                              background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                              color: "var(--primary)",
                            }}
                          >
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
                              <span
                                className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                style={{
                                  background: "color-mix(in srgb, var(--warning) 12%, transparent)",
                                  color: "var(--warning)",
                                }}
                              >
                                Already added
                              </span>
                            )}
                          </div>
                          <div
                            className="flex items-center gap-1.5 text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            <span className="truncate">{result.city}</span>
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

                        {/* Loading indicator for selected row */}
                        {isFetching && (
                          <Loader2
                            className="h-4 w-4 shrink-0 animate-spin"
                            style={{ color: "var(--primary)" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
