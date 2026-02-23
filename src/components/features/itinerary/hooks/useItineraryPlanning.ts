import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import type { CityAccommodation, TripBuilderData, DayEntryPoint } from "@/types/trip";
import { resolveEffectiveDayEntryPoints } from "@/lib/itinerary/accommodationDefaults";
import { planItineraryClient } from "@/hooks/usePlanItinerary";
import { optimizeRouteOrder } from "@/lib/routeOptimizer";
import { logger } from "@/lib/logger";

const normalizeItinerary = (incoming: Itinerary): Itinerary => {
  return {
    days: (incoming.days ?? []).map((day, index) => ({
      ...day,
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

type UseItineraryPlanningOptions = {
  itinerary: Itinerary;
  tripBuilderData?: TripBuilderData;
  dayEntryPoints: Record<string, DayEntryPoint>;
  cityAccommodations: Record<string, CityAccommodation>;
  tripId: string;
  onItineraryChange?: (next: Itinerary) => void;
};

/**
 * Encapsulates all planning logic: model state, travel-time replanning,
 * route optimization, debounced user-edit replanning, and parent sync.
 */
export function useItineraryPlanning({
  itinerary,
  tripBuilderData,
  dayEntryPoints,
  cityAccommodations,
  tripId,
  onItineraryChange,
}: UseItineraryPlanningOptions) {
  const [model, setModelState] = useState<Itinerary>(() => normalizeItinerary(itinerary));
  const [isPlanning, setIsPlanning] = useState(false);
  const [planningError, setPlanningError] = useState<string | null>(null);

  // Ref to store scheduleUserPlanning for use in handleReplaceSelect (avoids initialization order issues)
  const scheduleUserPlanningRef = useRef<((next: Itinerary) => void) | null>(null);
  // When true, skip auto-optimization in scheduleUserPlanning (e.g. after drag reorder)
  const skipAutoOptimizeRef = useRef(false);

  // Shallow fingerprint instead of full JSON.stringify
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
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
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

  const buildDayEntryPointsMap = useCallback(
    (target: Itinerary) => {
      if (!tripId) return {};

      // Use accommodation resolution to get effective entry points for each day
      const resolved = resolveEffectiveDayEntryPoints(
        target,
        tripId,
        dayEntryPoints,
        cityAccommodations,
        tripBuilderData?.entryPoint,
      );

      const map: Record<
        string,
        {
          startPoint?: { coordinates: { lat: number; lng: number } };
          endPoint?: { coordinates: { lat: number; lng: number } };
        }
      > = {};

      for (const [dayId, ep] of Object.entries(resolved)) {
        if (!ep.startPoint && !ep.endPoint) continue;
        map[dayId] = {
          startPoint: ep.startPoint ? { coordinates: ep.startPoint.coordinates } : undefined,
          endPoint: ep.endPoint ? { coordinates: ep.endPoint.coordinates } : undefined,
        };
      }

      return map;
    },
    [tripId, dayEntryPoints, cityAccommodations, tripBuilderData?.entryPoint],
  );

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
          if (!isMountedRef.current || planningRequestRef.current !== runId) return;
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
              setModelState(target);
            }
          }
        }

        const dayEntryPointsMap = buildDayEntryPointsMap(target);
        const plannerOptions = tripBuilderData?.dayStartTime
          ? { defaultDayStart: tripBuilderData.dayStartTime }
          : undefined;

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        planItineraryClient(target, plannerOptions, dayEntryPointsMap, controller.signal)
          .then((planned) => {
            if (controller.signal.aborted || planningRequestRef.current !== runId || !isMountedRef.current) return;
            skipNextPlanRef.current = true;
            setModelState(planned);
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted || planningRequestRef.current !== runId || !isMountedRef.current) return;
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

        if (next === current) return current;

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

  // Initial planning on itinerary prop change
  useEffect(() => {
    if (previousFingerprintRef.current === itineraryFingerprint) return;
    previousFingerprintRef.current = itineraryFingerprint;
    const nextNormalized = normalizeItinerary(itinerary);
    if (planTimeoutRef.current) {
      clearTimeout(planTimeoutRef.current);
      planTimeoutRef.current = null;
    }
    pendingPlanRef.current = null;
    skipNextPlanRef.current = true;
    skipSyncRef.current = true;
    setTimeout(() => {
      setModelState(nextNormalized);
    }, 0);

    let cancelled = false;
    const runId = ++planningRequestRef.current;

    if (planWatchdogRef.current) {
      clearTimeout(planWatchdogRef.current);
    }
    planWatchdogRef.current = window.setTimeout(() => {
      if (!isMountedRef.current || planningRequestRef.current !== runId) return;
      logger.warn("Initial travel planning watchdog fired, using existing itinerary data");
      setPlanningError((prev) => prev ?? "We couldn't refresh travel times right now. Showing previous estimates.");
      setIsPlanning(false);
    }, 15000);

    setTimeout(() => {
      setIsPlanning(true);
      setPlanningError(null);
    }, 0);

    const dayEntryPointsMap = buildDayEntryPointsMap(nextNormalized);
    const initialPlannerOptions = tripBuilderData?.dayStartTime
      ? { defaultDayStart: tripBuilderData.dayStartTime }
      : undefined;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    planItineraryClient(nextNormalized, initialPlannerOptions, dayEntryPointsMap, controller.signal)
      .then((planned) => {
        if (controller.signal.aborted || !isMountedRef.current) return;
        skipSyncRef.current = true;
        skipNextPlanRef.current = true;
        setModelState(planned);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || !isMountedRef.current) return;
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
      controller.abort();
      if (planWatchdogRef.current) {
        clearTimeout(planWatchdogRef.current);
        planWatchdogRef.current = null;
      }
    };
  }, [itineraryFingerprint, itinerary, tripId, buildDayEntryPointsMap, tripBuilderData]);

  // Replan when accommodation (dayEntryPoints or cityAccommodations) changes
  const accommodationFingerprint = useMemo(() => {
    const parts: string[] = [];
    for (const [key, ep] of Object.entries(dayEntryPoints)) {
      if (ep.startPoint || ep.endPoint) {
        parts.push(`${key}:${ep.startPoint?.id ?? ""}:${ep.endPoint?.id ?? ""}`);
      }
    }
    for (const [key, accom] of Object.entries(cityAccommodations)) {
      parts.push(`c:${key}:${accom.entryPoint.id}`);
    }
    return parts.sort().join("|");
  }, [dayEntryPoints, cityAccommodations]);

  const prevAccommodationFpRef = useRef(accommodationFingerprint);
  useEffect(() => {
    if (prevAccommodationFpRef.current === accommodationFingerprint) return;
    prevAccommodationFpRef.current = accommodationFingerprint;
    // Skip auto-optimize since user isn't reordering, just changing start/end points
    skipAutoOptimizeRef.current = true;
    scheduleUserPlanning(model);
  }, [accommodationFingerprint, model, scheduleUserPlanning, skipAutoOptimizeRef]);

  // Sync model changes to parent
  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    onItineraryChange?.(model);
  }, [model, onItineraryChange]);

  return {
    model,
    setModelState,
    isPlanning,
    setIsPlanning,
    planningError,
    setPlanningError,
    applyModelUpdate,
    scheduleUserPlanning,
    scheduleUserPlanningRef,
    skipAutoOptimizeRef,
  };
}
