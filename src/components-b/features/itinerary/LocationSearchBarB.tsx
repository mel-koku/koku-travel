"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Loader2, X, Star, Sparkles } from "lucide-react";
import { useLocationSearch } from "@/hooks/useLocationSearch";
import { useAiRecommend, type AiRecommendation, type AiRecommendResponse } from "@/hooks/useAiRecommend";
import { createActivityFromLocation } from "@/lib/itinerary/createActivityFromLocation";
import type { ItineraryActivity } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { Location } from "@/types/location";
import { logger } from "@/lib/logger";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type LocationSearchBarBProps = {
  /** Current day's activities (for duplicate detection + timeOfDay inference) */
  dayActivities: ItineraryActivity[];
  /** Callback when a new activity is created from a search result */
  onAddActivity: (activity: Extract<ItineraryActivity, { kind: "place" }>) => void;
  /** Current day's city ID for AI context */
  cityId?: string;
  /** Current day index for AI context */
  dayIndex?: number;
  /** Current day's date label (e.g. "2026-03-15") for schedule-aware scoring */
  dayDate?: string;
  /** Trip builder data for AI scoring context */
  tripBuilderData?: TripBuilderData;
  /** All location IDs already used across the entire trip */
  allUsedLocationIds?: string[];
  /** Callback when AI command reorders activities */
  onReorderActivities?: (activityIds: string[]) => void;
  /** Callback when AI command removes an activity */
  onRemoveActivity?: (activityId: string) => void;
  /** Callback when AI command triggers route optimization */
  onOptimizeRoute?: () => void;
};

export function LocationSearchBarB({
  dayActivities,
  onAddActivity,
  cityId,
  dayIndex,
  dayDate,
  tripBuilderData,
  allUsedLocationIds,
  onReorderActivities,
  onRemoveActivity,
  onOptimizeRoute,
}: LocationSearchBarBProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results, isLoading, isNotFound, isDebouncing } = useLocationSearch(query, {
    limit: 8,
  });

  const aiMutation = useAiRecommend();
  const aiMutationRef = useRef(aiMutation);
  aiMutationRef.current = aiMutation;

  // Reset state when day changes (cityId/dayIndex props change)
  useEffect(() => {
    setIsExpanded(false);
    setQuery("");
    setFetchingId(null);
    aiMutationRef.current.reset();
  }, [cityId, dayIndex]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
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
    aiMutationRef.current.reset();
  }, []);

  // Handle command response from AI (swap, move, remove, optimize)
  const handleCommandResponse = useCallback(
    (data: AiRecommendResponse) => {
      if (!data.command) return false;

      const { command } = data;
      const placeActivities = dayActivities.filter(
        (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place",
      );
      const activityIds = placeActivities.map((a) => a.id);

      switch (command.type) {
        case "swap": {
          if (!onReorderActivities || !command.targetActivityId || !command.secondActivityId) break;
          const idxA = activityIds.indexOf(command.targetActivityId);
          const idxB = activityIds.indexOf(command.secondActivityId);
          if (idxA === -1 || idxB === -1) break;
          const newOrder = [...activityIds];
          newOrder[idxA] = command.secondActivityId;
          newOrder[idxB] = command.targetActivityId;
          onReorderActivities(newOrder);
          collapse();
          return true;
        }
        case "move": {
          if (!onReorderActivities || !command.targetActivityId || !command.secondActivityId) break;
          const targetIdx = activityIds.indexOf(command.targetActivityId);
          const refIdx = activityIds.indexOf(command.secondActivityId);
          if (targetIdx === -1 || refIdx === -1) break;
          const newOrder = activityIds.filter((id) => id !== command.targetActivityId);
          const insertIdx = newOrder.indexOf(command.secondActivityId);
          if (insertIdx === -1) break;
          const pos = command.movePosition === "after" ? insertIdx + 1 : insertIdx;
          newOrder.splice(pos, 0, command.targetActivityId);
          onReorderActivities(newOrder);
          collapse();
          return true;
        }
        case "remove": {
          if (!onRemoveActivity || !command.targetActivityId) break;
          onRemoveActivity(command.targetActivityId);
          collapse();
          return true;
        }
        case "optimize_route": {
          if (!onOptimizeRoute) break;
          onOptimizeRoute();
          collapse();
          return true;
        }
      }
      return false;
    },
    [dayActivities, onReorderActivities, onRemoveActivity, onOptimizeRoute, collapse],
  );

  // Escape to collapse, Enter to trigger AI
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        collapse();
      } else if (e.key === "Enter" && query.trim().length >= 2) {
        e.preventDefault();
        aiMutationRef.current.mutate(
          {
            query: query.trim(),
            cityId: cityId ?? "",
            dayIndex: dayIndex ?? 0,
            dayDate,
            dayActivities: dayActivities
              .filter((a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place")
              .map((a) => ({
                id: a.id,
                name: a.title,
                category: a.tags?.[0],
                isAnchor: a.isAnchor,
                departureTime: a.schedule?.departureTime,
                arrivalTime: a.schedule?.arrivalTime,
              })),
            tripBuilderData,
            usedLocationIds: allUsedLocationIds ?? [],
          },
          {
            onSuccess: (data) => {
              handleCommandResponse(data);
            },
          },
        );
      }
    },
    [collapse, query, cityId, dayIndex, dayDate, dayActivities, tripBuilderData, allUsedLocationIds, handleCommandResponse],
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

  // Handle selecting a search result (text search or AI recommendation)
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
  const hasCommand = aiMutation.isSuccess && !!aiMutation.data.command;
  const hasAiResults = aiMutation.isSuccess && !hasCommand && aiMutation.data.recommendations.length > 0;
  const showAiSection = !hasCommand && (aiMutation.isPending || hasAiResults || (aiMutation.isSuccess && aiMutation.data.recommendations.length === 0));

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
                placeholder="Search or describe what you want..."
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
                  className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--card)",
                    boxShadow: "var(--shadow-elevated)",
                  }}
                >
                  {/* Text search results */}
                  {isNotFound && !showAiSection && (
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
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors disabled:opacity-60"
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

                  {/* AI Recommendations section */}
                  {showAiSection && (
                    <>
                      {/* Divider */}
                      {results && results.length > 0 && (
                        <div
                          className="mx-3 border-t"
                          style={{ borderColor: "var(--border)" }}
                        />
                      )}

                      {/* AI section header */}
                      <div className="px-3 pt-3 pb-1.5">
                        <div
                          className="flex items-center gap-1.5 text-xs font-medium"
                          style={{ color: "var(--primary)" }}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Koku recommends</span>
                        </div>
                      </div>

                      {/* Loading state */}
                      {aiMutation.isPending && (
                        <div className="flex items-center gap-2 px-3 py-3">
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            style={{ color: "var(--primary)" }}
                          />
                          <span
                            className="text-sm"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            Koku is thinking...
                          </span>
                        </div>
                      )}

                      {/* Empty results */}
                      {aiMutation.isSuccess && aiMutation.data.recommendations.length === 0 && (
                        <div
                          className="px-3 py-3 text-sm"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          No recommendations found. Try a different description.
                        </div>
                      )}

                      {/* Recommendation cards */}
                      {aiMutation.isSuccess && aiMutation.data.recommendations.map((rec) => (
                        <AiRecommendationCard
                          key={rec.id}
                          recommendation={rec}
                          isDuplicate={isDuplicate(rec.id)}
                          isFetching={fetchingId === rec.id}
                          isDisabled={!!fetchingId}
                          onAdd={() => handleSelect({ id: rec.id, name: rec.name })}
                        />
                      ))}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Card for a single AI recommendation in the dropdown
 */
function AiRecommendationCard({
  recommendation,
  isDuplicate: duplicate,
  isFetching,
  isDisabled,
  onAdd,
}: {
  recommendation: AiRecommendation;
  isDuplicate: boolean;
  isFetching: boolean;
  isDisabled: boolean;
  onAdd: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      style={{ color: "var(--foreground)" }}
    >
      {/* Thumbnail */}
      {recommendation.image ? (
        <img
          src={recommendation.image}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-medium"
          style={{
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "var(--primary)",
          }}
        >
          {recommendation.name.charAt(0)}
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {recommendation.name}
          </span>
          <span
            className="shrink-0 text-xs capitalize"
            style={{ color: "var(--muted-foreground)" }}
          >
            {recommendation.category}
          </span>
        </div>
        <div
          className="mt-0.5 flex items-center gap-1.5 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          {recommendation.rating != null && (
            <>
              <Star className="h-3 w-3 fill-current" />
              <span>{recommendation.rating.toFixed(1)}</span>
              <span aria-hidden="true">&middot;</span>
            </>
          )}
          <span className="truncate">{recommendation.reasoning}</span>
        </div>
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={onAdd}
        disabled={isDisabled}
        className="flex h-8 shrink-0 items-center rounded-lg px-3 text-xs font-medium transition-colors active:scale-[0.98] disabled:opacity-50"
        style={{
          background: duplicate
            ? "color-mix(in srgb, var(--warning) 10%, transparent)"
            : "color-mix(in srgb, var(--primary) 10%, transparent)",
          color: duplicate ? "var(--warning)" : "var(--primary)",
        }}
      >
        {isFetching ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : duplicate ? (
          "Added"
        ) : (
          "Add"
        )}
      </button>
    </div>
  );
}
