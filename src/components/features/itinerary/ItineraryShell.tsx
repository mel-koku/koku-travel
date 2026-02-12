"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { durationFast, durationSlow, easeReveal, easePageTransition } from "@/lib/motion";
import { useAppState } from "@/state/AppState";
import { Itinerary, type ItineraryActivity } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import { DaySelector } from "./DaySelector";
import { ItineraryTimeline } from "./ItineraryTimeline";
import { WhatsNextCard } from "./WhatsNextCard";
import { ItineraryMapPanel } from "./ItineraryMapPanel";
import { planItineraryClient } from "@/hooks/usePlanItinerary";
import { logger } from "@/lib/logger";
import { ActivityReplacementPicker } from "./ActivityReplacementPicker";
import {
  useReplacementCandidates,
  locationToActivity,
  type ReplacementCandidate,
} from "@/hooks/useReplacementCandidates";
import { REGIONS } from "@/data/regions";
import { optimizeRouteOrder } from "@/lib/routeOptimizer";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";
import { detectItineraryConflicts, getDayConflicts } from "@/lib/validation/itineraryConflicts";
import type { AcceptGapResult } from "@/hooks/useSmartPromptActions";

// Lazy-load guide builder to keep ~90KB of template data out of the main bundle
const buildGuideAsync = () => import("@/lib/guide/guideBuilder").then((m) => m.buildGuide);

type ItineraryShellProps = {
  tripId: string;
  itinerary: Itinerary;
  onItineraryChange?: (next: Itinerary) => void;
  headingRef?: RefObject<HTMLHeadingElement>;
  createdLabel: string | null;
  updatedLabel: string | null;
  isUsingMock: boolean;
  tripStartDate?: string; // ISO date string (yyyy-mm-dd)
  tripBuilderData?: TripBuilderData;
  // Smart suggestions (all days)
  suggestions?: DetectedGap[];
  onAcceptSuggestion?: (gap: DetectedGap) => Promise<AcceptGapResult>;
  onSkipSuggestion?: (gap: DetectedGap) => void;
  loadingSuggestionId?: string | null;
};

const normalizeItinerary = (incoming: Itinerary): Itinerary => {
  return {
    days: (incoming.days ?? []).map((day, index) => ({
      ...day,
      // Ensure day has an ID for backward compatibility
      id: day.id ?? `day-${index + 1}-legacy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      activities: (day.activities ?? []).map((activity) => {
        if (
          activity &&
          typeof activity === "object" &&
          "kind" in activity &&
          activity.kind
        ) {
          const typedActivity = activity as ItineraryActivity;
          if (typedActivity.kind === "note") {
            return {
              ...typedActivity,
              startTime:
                typedActivity.startTime !== undefined
                  ? typedActivity.startTime
                  : undefined,
              endTime:
                typedActivity.endTime !== undefined
                  ? typedActivity.endTime
                  : undefined,
            };
          }
          return typedActivity;
        }

        const legacyActivity = activity as Omit<
          Extract<ItineraryActivity, { kind: "place" }>,
          "kind"
        >;

        return {
          kind: "place",
          ...legacyActivity,
        };
      }),
    })),
  };
};

export const ItineraryShell = ({
  itinerary,
  tripId,
  onItineraryChange,
  headingRef,
  createdLabel,
  updatedLabel,
  isUsingMock,
  tripStartDate,
  tripBuilderData,
  suggestions,
  onAcceptSuggestion,
  onSkipSuggestion,
  loadingSuggestionId,
}: ItineraryShellProps) => {
  const { reorderActivities, replaceActivity, getTripById, dayEntryPoints } = useAppState();
  const [selectedDay, setSelectedDay] = useState(0);
  const [model, setModelState] = useState<Itinerary>(() => normalizeItinerary(itinerary));
  const [isPlanning, setIsPlanning] = useState(false);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [replacementActivityId, setReplacementActivityId] = useState<string | null>(null);
  const [replacementCandidates, setReplacementCandidates] = useState<ReplacementCandidate[]>([]);
  const internalHeadingRef = useRef<HTMLHeadingElement>(null);
  const finalHeadingRef = headingRef ?? internalHeadingRef;
  // Ref to store scheduleUserPlanning for use in handleReplaceSelect (avoids initialization order issues)
  const scheduleUserPlanningRef = useRef<((next: Itinerary) => void) | null>(null);
  // When true, skip auto-optimization in scheduleUserPlanning (e.g. after drag reorder)
  const skipAutoOptimizeRef = useRef(false);

  // Mutation hook for fetching replacement candidates
  const replacementMutation = useReplacementCandidates();
  const isLoadingReplacements = replacementMutation.isPending;

  const currentTrip = useMemo(() => {
    return tripId && !isUsingMock ? getTripById(tripId) : null;
  }, [tripId, isUsingMock, getTripById]);

  // Build a map of city IDs to display names
  const cityIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const region of REGIONS) {
      for (const city of region.cities) {
        map[city.id] = city.name;
      }
    }
    return map;
  }, []);

  // Get selected city names for display
  const selectedCityNames = useMemo(() => {
    if (!tripBuilderData?.cities?.length) return [];
    return tripBuilderData.cities
      .map((cityId) => cityIdToName[cityId] ?? cityId)
      .filter(Boolean);
  }, [tripBuilderData, cityIdToName]);

  const buildDayEntryPointsMap = useCallback(
    (target: Itinerary) => {
      if (!tripId) {
        return {};
      }
      const map: Record<
        string,
        {
          startPoint?: { coordinates: { lat: number; lng: number } };
          endPoint?: { coordinates: { lat: number; lng: number } };
        }
      > = {};

      for (const day of target.days ?? []) {
        if (!day?.id) {
          continue;
        }
        const entryPoints = dayEntryPoints[`${tripId}-${day.id}`];
        if (!entryPoints) {
          continue;
        }
        const { startPoint, endPoint } = entryPoints;
        if (!startPoint && !endPoint) {
          continue;
        }
        map[day.id] = {
          startPoint: startPoint ? { coordinates: startPoint.coordinates } : undefined,
          endPoint: endPoint ? { coordinates: endPoint.coordinates } : undefined,
        };
      }

      return map;
    },
    [tripId, dayEntryPoints],
  );

  const handleReorder = useCallback(
    (dayId: string, activityIds: string[]) => {
      if (tripId && !isUsingMock) {
        reorderActivities(tripId, dayId, activityIds);
      }
    },
    [tripId, isUsingMock, reorderActivities],
  );

  const handleReplace = useCallback(
    (activityId: string) => {
      if (!tripId || isUsingMock || !currentTrip) return;

      const currentDay = model.days[selectedDay];
      if (!currentDay) return;

      const activity = currentDay.activities.find((a) => a.id === activityId);
      if (!activity || activity.kind !== "place") return;

      setReplacementActivityId(activityId);

      // Find replacement candidates via API
      replacementMutation.mutate(
        {
          activity,
          tripData: currentTrip.builderData,
          allActivities: model.days.flatMap((d) => d.activities),
          dayActivities: currentDay.activities,
          currentDayIndex: selectedDay,
          maxCandidates: 10,
        },
        {
          onSuccess: (options) => {
            setReplacementCandidates(options.candidates);
          },
          onError: (error) => {
            logger.error("Failed to find replacement candidates", error);
            setReplacementCandidates([]);
          },
        },
      );
    },
    [tripId, isUsingMock, currentTrip, model, selectedDay, replacementMutation],
  );

  const handleReplaceSelect = useCallback(
    (candidate: ReplacementCandidate) => {
      if (!tripId || isUsingMock || !replacementActivityId) return;

      const currentDay = model.days[selectedDay];
      if (!currentDay) return;

      const activity = currentDay.activities.find((a) => a.id === replacementActivityId);
      if (!activity || activity.kind !== "place") return;

      const newActivity = locationToActivity(candidate.location, activity);

      if (tripId && !isUsingMock) {
        replaceActivity(tripId, currentDay.id, replacementActivityId, newActivity);
      }

      // Build the updated itinerary for replanning
      const nextDays = model.days.map((d) => {
        if (d.id !== currentDay.id) return d;
        return {
          ...d,
          activities: d.activities.map((a) => (a.id === replacementActivityId ? newActivity : a)),
        };
      });
      const nextItinerary = { ...model, days: nextDays };

      // Update local model
      setModelState(nextItinerary);

      // Schedule replanning after state update to recalculate travel times
      setTimeout(() => {
        scheduleUserPlanningRef.current?.(nextItinerary);
      }, 0);

      setReplacementActivityId(null);
      setReplacementCandidates([]);
    },
    [tripId, isUsingMock, replacementActivityId, model, selectedDay, replaceActivity],
  );

  useEffect(() => {
    if (finalHeadingRef.current) {
      finalHeadingRef.current.focus();
    }
  }, [finalHeadingRef]);
  // Shallow fingerprint instead of full JSON.stringify (~O(days*activities) vs O(entire tree))
  const itineraryFingerprint = useMemo(() => {
    const days = itinerary.days ?? [];
    return days
      .map((d) => `${d.id}:${d.activities?.length ?? 0}:${d.activities?.map((a) => a.id).join(",")}`)
      .join("|");
  }, [itinerary]);
  const previousFingerprintRef = useRef<string | null>(null);
  const skipSyncRef = useRef(true);
  const skipNextPlanRef = useRef(false);
  const planTimeoutRef = useRef<number | null>(null);
  const planWatchdogRef = useRef<number | null>(null);
  const pendingPlanRef = useRef<Itinerary | null>(null);
  const planningRequestRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Reset to true on mount (handles React Strict Mode double-mounting)
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (planTimeoutRef.current) {
        clearTimeout(planTimeoutRef.current);
        planTimeoutRef.current = null;
      }
      if (planWatchdogRef.current) {
        clearTimeout(planWatchdogRef.current);
        planWatchdogRef.current = null;
      }
    };
  }, []);

  const scheduleUserPlanning = useCallback(
    (next: Itinerary) => {
      pendingPlanRef.current = next;
      if (planTimeoutRef.current) {
        clearTimeout(planTimeoutRef.current);
        planTimeoutRef.current = null;
      }

      const runId = ++planningRequestRef.current;

      planTimeoutRef.current = window.setTimeout(() => {
        planTimeoutRef.current = null;
        let target = pendingPlanRef.current;
        if (!target) {
          if (planningRequestRef.current === runId && isMountedRef.current) {
            setIsPlanning(false);
          }
          return;
        }

        if (planWatchdogRef.current) {
          clearTimeout(planWatchdogRef.current);
        }
        planWatchdogRef.current = window.setTimeout(() => {
          if (!isMountedRef.current || planningRequestRef.current !== runId) {
            return;
          }
          logger.warn("Travel planning watchdog fired, falling back to previous schedule");
          pendingPlanRef.current = null;
          setPlanningError((prev) => prev ?? "We couldn't refresh travel times right now. Showing previous estimates.");
          setIsPlanning(false);
        }, 15000);

        setPlanningError(null);
        setIsPlanning(true);

        // Auto-optimize route order before replanning (unless skipped for drag reorder)
        if (skipAutoOptimizeRef.current) {
          skipAutoOptimizeRef.current = false;
        } else {
          const startPoint = tripBuilderData?.entryPoint;
          if (startPoint) {
            let optimized = false;
            const nextDays = target.days.map((day) => {
              const result = optimizeRouteOrder(day.activities, startPoint);
              if (!result.orderChanged) return day;
              optimized = true;
              const activityMap = new Map(day.activities.map((a) => [a.id, a]));
              const reordered = result.order
                .map((id) => activityMap.get(id))
                .filter((a): a is ItineraryActivity => a !== undefined);
              return { ...day, activities: reordered };
            });
            if (optimized) {
              target = { ...target, days: nextDays };
              pendingPlanRef.current = target;
              // Also update the visual model immediately so user sees the reorder
              setModelState(target);
            }
          }
        }

        const dayEntryPointsMap = buildDayEntryPointsMap(target);
        const plannerOptions = tripBuilderData?.dayStartTime
          ? { defaultDayStart: tripBuilderData.dayStartTime }
          : undefined;

        planItineraryClient(target, plannerOptions, dayEntryPointsMap)
          .then((planned) => {
            if (planningRequestRef.current !== runId || !isMountedRef.current) {
              return;
            }
            skipNextPlanRef.current = true;
            setModelState(planned);
          })
          .catch((error: unknown) => {
            if (planningRequestRef.current !== runId || !isMountedRef.current) {
              return;
            }
            logger.error("Failed to plan itinerary after user change", error);
            setPlanningError(error instanceof Error ? error.message : "Unknown error");
          })
          .finally(() => {
            if (planningRequestRef.current === runId && isMountedRef.current) {
              pendingPlanRef.current = null;
              setIsPlanning(false);
            }
            if (planWatchdogRef.current) {
              clearTimeout(planWatchdogRef.current);
              planWatchdogRef.current = null;
            }
          });
      }, 450);
    },
    [setIsPlanning, setModelState, setPlanningError, buildDayEntryPointsMap, tripBuilderData],
  );

  // Keep ref in sync with scheduleUserPlanning for use in handleReplaceSelect
  useEffect(() => {
    scheduleUserPlanningRef.current = scheduleUserPlanning;
  }, [scheduleUserPlanning]);

  const applyModelUpdate = useCallback<Dispatch<SetStateAction<Itinerary>>>(
    (updater) => {
      setModelState((current) => {
        const next =
          typeof updater === "function"
            ? (updater as (prev: Itinerary) => Itinerary)(current)
            : updater;

        if (next === current) {
          return current;
        }

        if (skipNextPlanRef.current) {
          skipNextPlanRef.current = false;
          return next;
        }

        scheduleUserPlanning(next);
        return next;
      });
    },
    [scheduleUserPlanning],
  );

  useEffect(() => {
    if (previousFingerprintRef.current === itineraryFingerprint) {
      return;
    }
    previousFingerprintRef.current = itineraryFingerprint;
    const nextNormalized = normalizeItinerary(itinerary);
    if (planTimeoutRef.current) {
      clearTimeout(planTimeoutRef.current);
      planTimeoutRef.current = null;
    }
    pendingPlanRef.current = null;
    skipNextPlanRef.current = true;
    skipSyncRef.current = true;
    // Use setTimeout to avoid calling setState synchronously within effect
    setTimeout(() => {
      setModelState(nextNormalized);
      setSelectedActivityId(null);
    }, 0);

    let cancelled = false;
    const runId = ++planningRequestRef.current;

    if (planWatchdogRef.current) {
      clearTimeout(planWatchdogRef.current);
    }
    planWatchdogRef.current = window.setTimeout(() => {
      if (!isMountedRef.current || planningRequestRef.current !== runId) {
        return;
      }
      logger.warn("Initial travel planning watchdog fired, using existing itinerary data");
      setPlanningError((prev) => prev ?? "We couldn't refresh travel times right now. Showing previous estimates.");
      setIsPlanning(false);
    }, 15000);

    // Use setTimeout to avoid calling setState synchronously within effect
    setTimeout(() => {
      setIsPlanning(true);
      setPlanningError(null);
    }, 0);

    const dayEntryPointsMap = buildDayEntryPointsMap(nextNormalized);
    const initialPlannerOptions = tripBuilderData?.dayStartTime
      ? { defaultDayStart: tripBuilderData.dayStartTime }
      : undefined;

    planItineraryClient(nextNormalized, initialPlannerOptions, dayEntryPointsMap)
      .then((planned) => {
        // Always apply the result if component is mounted - newer results will overwrite older ones
        if (!isMountedRef.current) {
          return;
        }
        skipSyncRef.current = true;
        skipNextPlanRef.current = true;
        setModelState(planned);
        // Don't reset selectedDay - preserve user's day selection
        setSelectedActivityId(null);
      })
      .catch((error: unknown) => {
        if (!isMountedRef.current) {
          return;
        }
        logger.error("Failed to plan itinerary", error);
        skipSyncRef.current = true;
        skipNextPlanRef.current = true;
        setModelState(nextNormalized);
        setPlanningError(error instanceof Error ? error.message : "Unknown error");
      })
      .finally(() => {
        if (!cancelled && planningRequestRef.current === runId && isMountedRef.current) {
          setIsPlanning(false);
        }
        if (planWatchdogRef.current) {
          clearTimeout(planWatchdogRef.current);
          planWatchdogRef.current = null;
        }
      });

    return () => {
      cancelled = true;
      if (planWatchdogRef.current) {
        clearTimeout(planWatchdogRef.current);
        planWatchdogRef.current = null;
      }
    };
  }, [itineraryFingerprint, itinerary, tripId, buildDayEntryPointsMap, tripBuilderData]);

  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    onItineraryChange?.(model);
  }, [model, onItineraryChange]);

  const days = model.days ?? [];
  const safeSelectedDay =
    days.length === 0 ? 0 : Math.min(selectedDay, Math.max(days.length - 1, 0));
  const currentDay = days[safeSelectedDay];
  const currentDayEntryPoints =
    tripId && currentDay?.id ? dayEntryPoints[`${tripId}-${currentDay.id}`] : undefined;

  // Filter suggestions for the current day
  const currentDaySuggestions = useMemo(() => {
    if (!suggestions || !currentDay) return [];
    return suggestions.filter((gap) => gap.dayIndex === safeSelectedDay);
  }, [suggestions, currentDay, safeSelectedDay]);

  // Detect scheduling conflicts in the itinerary
  const conflictsResult = useMemo(() => {
    return detectItineraryConflicts(model);
  }, [model]);

  // Build guide (lazy-loaded to avoid bundling ~90KB of template data)
  const [tripGuide, setTripGuide] = useState<Awaited<ReturnType<typeof import("@/lib/guide/guideBuilder").buildGuide>> | null>(null);
  useEffect(() => {
    let cancelled = false;
    buildGuideAsync().then((buildGuide) => {
      if (!cancelled) {
        setTripGuide(buildGuide(model, tripBuilderData));
      }
    });
    return () => { cancelled = true; };
  }, [model, tripBuilderData]);

  const currentDayGuide = useMemo(() => {
    if (!tripGuide || !currentDay) return null;
    return tripGuide.days.find((dg) => dg.dayId === currentDay.id) ?? null;
  }, [tripGuide, currentDay]);

  // Get conflicts for the current day
  const currentDayConflicts = useMemo(() => {
    if (!currentDay) return [];
    return getDayConflicts(conflictsResult, currentDay.id);
  }, [conflictsResult, currentDay]);

  const [dayTransitionLabel, setDayTransitionLabel] = useState<string | null>(null);

  // Suppression flag: when true, IntersectionObserver won't override selectedActivityId.
  // This prevents the observer from racing against programmatic scrollIntoView after
  // an explicit user action (map pin click, card click).
  const suppressObserverRef = useRef(false);

  // Scroll-linked map panning: observe activity cards in the timeline
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const activityListEl = document.querySelector("[data-itinerary-activities]");
    if (!activityListEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Skip if an explicit selection is in progress (scrollIntoView still animating)
        if (suppressObserverRef.current) return;

        // Find the most visible activity card
        let bestEntry: IntersectionObserverEntry | null = null;
        let bestRatio = 0;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestEntry = entry;
          }
        }
        if (bestEntry?.target) {
          const activityId = (bestEntry.target as HTMLElement).dataset.activityId;
          if (activityId && activityId !== selectedActivityId) {
            setSelectedActivityId(activityId);
          }
        }
      },
      {
        root: activityListEl,
        threshold: [0.3, 0.5, 0.8],
      }
    );

    const activityCards = activityListEl.querySelectorAll("[data-activity-id]");
    activityCards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [selectedActivityId, safeSelectedDay]);

  const handleSelectDayChange = useCallback((dayIndex: number) => {
    // Show brief city interstitial on day change
    const targetDay = model.days[dayIndex];
    if (targetDay?.dateLabel) {
      const cityName = targetDay.dateLabel.replace(/Day \d+\s*(\(([^)]+)\))?/, "$2").trim();
      if (cityName) {
        setDayTransitionLabel(cityName);
        setTimeout(() => setDayTransitionLabel(null), 500);
      }
    }
    setSelectedDay(dayIndex);
    setSelectedActivityId(null);
  }, [model.days]);

  const handleSelectActivity = useCallback((activityId: string | null) => {
    setSelectedActivityId(activityId);
    if (!activityId) {
      return;
    }
    // Suppress IntersectionObserver during programmatic scroll so it doesn't
    // immediately override the selection with whichever card is currently visible.
    suppressObserverRef.current = true;
    setTimeout(() => { suppressObserverRef.current = false; }, 1000);

    window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(
        `[data-activity-id="${activityId}"]`,
      );
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.focus({ preventScroll: true });
    });
  }, []);

  // Wrapper for onAcceptSuggestion - the prop change from AppState will trigger
  // replanning via the serializedItinerary effect
  const handleAcceptSuggestion = useCallback(
    async (gap: DetectedGap) => {
      if (!onAcceptSuggestion) return;

      const result = await onAcceptSuggestion(gap);

      // Activity was added to AppState. The itinerary prop will update and trigger
      // the effect which calls planItineraryClient to recalculate times.
      if (result.success) {
        // Force immediate UI update by triggering planning indicator
        setIsPlanning(true);
      }
    },
    [onAcceptSuggestion],
  );

  return (
    <section className="mx-auto min-h-[calc(100dvh-64px)] max-w-screen-2xl">
      {/* Dark banner — merges with transparent header */}
      <div className="relative -mt-20 bg-charcoal pt-24 pb-6">
        <div className="texture-grain absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-screen-2xl px-4 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1
                  ref={finalHeadingRef}
                  tabIndex={-1}
                  className="font-serif italic text-2xl text-white focus:outline-none sm:text-3xl"
                >
                  Your Itinerary
                </h1>
                {isUsingMock && (
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                    Mock
                  </span>
                )}
              </div>
              {createdLabel && (
                <p className="mt-1 font-mono text-[11px] text-white/50">
                  Saved {createdLabel}
                  {updatedLabel ? ` · Updated ${updatedLabel}` : ""}
                </p>
              )}
              {/* Cities chips */}
              {selectedCityNames.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedCityNames.map((cityName) => (
                    <span
                      key={cityName}
                      className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80"
                    >
                      {cityName}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* Day picker */}
            <div className="w-full sm:w-auto sm:min-w-[280px]">
              <DaySelector
                totalDays={days.length}
                selected={safeSelectedDay}
                onChange={handleSelectDayChange}
                labels={days.map((day) => day.dateLabel ?? "")}
                tripStartDate={tripStartDate}
                variant="dark"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile peek map strip (< lg) ── */}
      <div className="relative lg:hidden">
        <motion.div
          animate={{ height: mapExpanded ? "100dvh" : "30vh" }}
          transition={{
            duration: durationSlow,
            ease: [...easePageTransition] as [number, number, number, number],
          }}
          className="relative overflow-hidden"
        >
          <ItineraryMapPanel
            day={safeSelectedDay}
            activities={currentDay?.activities ?? []}
            selectedActivityId={selectedActivityId}
            onSelectActivity={handleSelectActivity}
            isPlanning={isPlanning}
            startPoint={currentDayEntryPoints?.startPoint}
            endPoint={currentDayEntryPoints?.endPoint}
            tripStartDate={tripStartDate}
            dayLabel={currentDay?.dateLabel}
          />

          {/* Tap-to-expand overlay (when collapsed) */}
          {!mapExpanded && (
            <button
              type="button"
              onClick={() => setMapExpanded(true)}
              className="absolute inset-0 z-10"
              aria-label="Expand map"
            >
              {/* Bottom gradient hint */}
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-charcoal/60 to-transparent pb-2.5 pt-8">
                <span className="rounded-full bg-charcoal/80 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                  Tap to expand map
                </span>
              </div>
            </button>
          )}

          {/* Collapse button (when expanded) */}
          <AnimatePresence>
            {mapExpanded && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: durationFast, ease: easeReveal }}
                onClick={() => setMapExpanded(false)}
                className="absolute top-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-xl bg-charcoal/80 text-white/90 backdrop-blur-sm transition-colors hover:bg-charcoal"
                aria-label="Collapse map"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="flex flex-col lg:flex-row lg:gap-4 lg:p-4">
        {/* Left: Cards Panel (50%) */}
        <div className="flex flex-col lg:w-1/2">
          {/* Activities List */}
          <div data-itinerary-activities className="relative flex-1 overflow-y-auto overscroll-contain border-border bg-background p-3 lg:rounded-2xl lg:border">
            {/* Day transition interstitial */}
            <AnimatePresence>
              {dayTransitionLabel && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: durationFast, ease: easeReveal }}
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                >
                  <h2 className="font-serif italic text-3xl text-foreground sm:text-4xl">
                    {dayTransitionLabel}
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>

            {/* What's Next Card */}
            {currentDay && tripStartDate && (
              <WhatsNextCard
                day={currentDay}
                tripStartDate={tripStartDate}
                dayIndex={safeSelectedDay}
                onActivityClick={handleSelectActivity}
                className="mb-3"
              />
            )}

            {/* Timeline */}
            {currentDay ? (
              <ItineraryTimeline
                day={currentDay}
                dayIndex={safeSelectedDay}
                model={model}
                setModel={applyModelUpdate}
                selectedActivityId={selectedActivityId}
                onSelectActivity={handleSelectActivity}
                tripStartDate={tripStartDate}
                tripId={tripId && !isUsingMock ? tripId : undefined}
                onReorder={handleReorder}
                onReplace={tripId && !isUsingMock ? handleReplace : undefined}
                tripBuilderData={tripBuilderData}
                suggestions={currentDaySuggestions}
                onAcceptSuggestion={handleAcceptSuggestion}
                onSkipSuggestion={onSkipSuggestion}
                loadingSuggestionId={loadingSuggestionId}
                conflicts={currentDayConflicts}
                conflictsResult={conflictsResult}
                guide={currentDayGuide}
                onBeforeDragReorder={() => { skipAutoOptimizeRef.current = true; }}
              />
            ) : (
              <p className="text-sm text-stone">
                This day couldn&apos;t be loaded. Try selecting another.
              </p>
            )}

            {/* Planning status */}
            {isPlanning && (
              <div className="mt-3 rounded-lg border border-dashed border-sage/30 bg-sage/10 p-2.5 text-xs text-sage">
                Updating travel times...
              </div>
            )}

            {/* Planning error */}
            {planningError && (
              <div className="mt-3 rounded-lg border border-error/30 bg-error/10 p-2.5 text-xs text-error">
                <p className="font-medium">Something went wrong</p>
                <p className="mt-0.5 text-error/80">{planningError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setPlanningError(null);
                    scheduleUserPlanning(model);
                  }}
                  className="mt-2 w-full rounded-md bg-error px-3 py-1.5 text-xs font-medium text-white transition hover:bg-error/90"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sticky Map — desktop only (50%) */}
        <div className="hidden lg:sticky lg:top-[80px] lg:block lg:h-[calc(100dvh-96px)] lg:w-1/2">
          <div className="h-full lg:rounded-2xl lg:overflow-hidden lg:border lg:border-border">
            <ItineraryMapPanel
              day={safeSelectedDay}
              activities={currentDay?.activities ?? []}
              selectedActivityId={selectedActivityId}
              onSelectActivity={handleSelectActivity}
              isPlanning={isPlanning}
              startPoint={currentDayEntryPoints?.startPoint}
              endPoint={currentDayEntryPoints?.endPoint}
              tripStartDate={tripStartDate}
              dayLabel={currentDay?.dateLabel}
            />
          </div>
        </div>
      </div>

      {/* Replacement Picker Modal */}
      {replacementActivityId && (() => {
        const originalActivity = model.days[selectedDay]?.activities.find(
          (a) => a.id === replacementActivityId && a.kind === "place",
        ) as Extract<ItineraryActivity, { kind: "place" }> | undefined;

        if (!originalActivity) return null;

        return (
          <ActivityReplacementPicker
            isOpen={true}
            onClose={() => {
              setReplacementActivityId(null);
              setReplacementCandidates([]);
            }}
            candidates={replacementCandidates}
            originalActivity={originalActivity}
            onSelect={handleReplaceSelect}
            isLoading={isLoadingReplacements}
          />
        );
      })()}
    </section>
  );
};


