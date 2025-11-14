"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Itinerary, type ItineraryActivity } from "@/types/itinerary";
import { DaySelector } from "./DaySelector";
import { ItineraryTimeline } from "./ItineraryTimeline";
import { ItineraryMapPanel } from "./ItineraryMapPanel";
import { planItinerary } from "@/lib/itineraryPlanner";

type ItineraryShellProps = {
  tripId: string;
  itinerary: Itinerary;
  onItineraryChange?: (next: Itinerary) => void;
};

const normalizeItinerary = (incoming: Itinerary): Itinerary => {
  return {
    days: (incoming.days ?? []).map((day) => ({
      ...day,
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

export const ItineraryShell = ({ itinerary, tripId, onItineraryChange }: ItineraryShellProps) => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [model, setModelState] = useState<Itinerary>(() => normalizeItinerary(itinerary));
  const [isPlanning, setIsPlanning] = useState(false);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const serializedItinerary = useMemo(() => JSON.stringify(itinerary), [itinerary]);
  const previousSerializedRef = useRef<string | null>(null);
  const skipSyncRef = useRef(true);
  const skipNextPlanRef = useRef(false);
  const planTimeoutRef = useRef<number | null>(null);
  const planWatchdogRef = useRef<number | null>(null);
  const pendingPlanRef = useRef<Itinerary | null>(null);
  const planningRequestRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
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
        const target = pendingPlanRef.current;
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
          console.warn("[ItineraryShell] Travel planning watchdog fired, falling back to previous schedule.");
          pendingPlanRef.current = null;
          setPlanningError((prev) => prev ?? "We couldn't refresh travel times right now. Showing previous estimates.");
          setIsPlanning(false);
        }, 15000);

        setPlanningError(null);
        setIsPlanning(true);

        planItinerary(target)
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
            console.error("[ItineraryShell] Failed to plan itinerary after user change", error);
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
    [setIsPlanning, setModelState, setPlanningError],
  );

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
    if (previousSerializedRef.current === serializedItinerary) {
      return;
    }
    previousSerializedRef.current = serializedItinerary;
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
      console.warn("[ItineraryShell] Initial travel planning watchdog fired, using existing itinerary data.");
      setPlanningError((prev) => prev ?? "We couldn't refresh travel times right now. Showing previous estimates.");
      setIsPlanning(false);
    }, 15000);

    // Use setTimeout to avoid calling setState synchronously within effect
    setTimeout(() => {
      setIsPlanning(true);
      setPlanningError(null);
    }, 0);

    planItinerary(nextNormalized)
      .then((planned) => {
        if (
          cancelled ||
          planningRequestRef.current !== runId ||
          !isMountedRef.current
        ) {
          return;
        }
        skipSyncRef.current = true;
        skipNextPlanRef.current = true;
        setModelState(planned);
        setSelectedDay(0);
        setSelectedActivityId(null);
      })
      .catch((error: unknown) => {
        if (
          cancelled ||
          planningRequestRef.current !== runId ||
          !isMountedRef.current
        ) {
          return;
        }
        console.error("[ItineraryShell] Failed to plan itinerary", error);
        skipSyncRef.current = true;
        skipNextPlanRef.current = true;
        setModelState(nextNormalized);
        setSelectedDay(0);
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
  }, [serializedItinerary, itinerary, tripId]);

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

  const handleSelectDayChange = useCallback((dayIndex: number) => {
    setSelectedDay(dayIndex);
    setSelectedActivityId(null);
  }, []);

  const handleSelectActivity = useCallback((activityId: string | null) => {
    setSelectedActivityId(activityId);
    if (!activityId) {
      return;
    }
    window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(
        `[data-activity-id="${activityId}"]`,
      );
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.focus({ preventScroll: true });
    });
  }, []);

  return (
    <section className="mx-auto min-h-[calc(100vh-120px)] max-w-screen-2xl p-3 sm:p-4 md:p-6 md:min-h-[calc(100vh-140px)]">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(380px,40%)_1fr] xl:gap-6">
        {/* Map panel - full width on mobile, sidebar on desktop */}
        <div className="order-2 xl:order-1">
          <div className="h-[400px] rounded-2xl border border-gray-200 bg-white shadow-sm sm:h-[500px] xl:h-full xl:min-h-[600px]">
            <ItineraryMapPanel
              day={safeSelectedDay}
              activities={currentDay?.activities ?? []}
              selectedActivityId={selectedActivityId}
              onSelectActivity={handleSelectActivity}
              isPlanning={isPlanning}
            />
          </div>
        </div>
        {/* Timeline panel */}
        <div className="order-1 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm xl:order-2">
          <div className="border-b border-gray-200 p-3 sm:p-4">
            <DaySelector
              totalDays={days.length}
              selected={safeSelectedDay}
              onChange={handleSelectDayChange}
              labels={days.map((day) => day.dateLabel ?? "")}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3 pr-2 sm:p-4">
            {currentDay ? (
              <ItineraryTimeline
                day={currentDay}
                dayIndex={safeSelectedDay}
                model={model}
                setModel={applyModelUpdate}
                selectedActivityId={selectedActivityId}
                onSelectActivity={handleSelectActivity}
              />
            ) : (
              <p className="text-sm text-gray-500">
                We could not find this itinerary day. Please select another.
              </p>
            )}
            {isPlanning ? (
              <div className="mt-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3 text-sm text-indigo-700 sm:p-4">
                Updating travel times and schedule…
              </div>
            ) : null}
            {planningError ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-sm text-rose-700 sm:p-4">
                Planner fell back to a basic ordering: {planningError}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};


