"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { useAppState } from "@/state/AppState";
import { Itinerary, type ItineraryActivity } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import { DaySelector } from "./DaySelector";
import { ItineraryTimeline } from "./ItineraryTimeline";
import { ItineraryMapPanel } from "./ItineraryMapPanel";
import { Select } from "@/components/ui/Select";
import { planItinerary } from "@/lib/itineraryPlanner";
import { logger } from "@/lib/logger";
import type { StoredTrip } from "@/state/AppState";
import { ActivityReplacementPicker } from "./ActivityReplacementPicker";
import { findReplacementCandidates, locationToActivity, type ReplacementCandidate } from "@/lib/activityReplacement";

type ItineraryShellProps = {
  tripId: string;
  itinerary: Itinerary;
  onItineraryChange?: (next: Itinerary) => void;
  selectedTripId: string | null;
  onTripChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  trips: StoredTrip[];
  headingRef?: RefObject<HTMLHeadingElement>;
  headingText: string;
  descriptionText: string;
  createdLabel: string | null;
  updatedLabel: string | null;
  isUsingMock: boolean;
  tripStartDate?: string; // ISO date string (yyyy-mm-dd)
  tripBuilderData?: TripBuilderData;
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
  selectedTripId,
  onTripChange,
  trips,
  headingRef,
  headingText,
  descriptionText,
  createdLabel,
  updatedLabel,
  isUsingMock,
  tripStartDate,
  tripBuilderData,
}: ItineraryShellProps) => {
  const { reorderActivities, replaceActivity, addActivity, getTripById, dayEntryPoints } = useAppState();
  const [selectedDay, setSelectedDay] = useState(0);
  const [model, setModelState] = useState<Itinerary>(() => normalizeItinerary(itinerary));
  const [isPlanning, setIsPlanning] = useState(false);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [replacementActivityId, setReplacementActivityId] = useState<string | null>(null);
  const [replacementCandidates, setReplacementCandidates] = useState<ReplacementCandidate[]>([]);
  const [isLoadingReplacements, setIsLoadingReplacements] = useState(false);
  const internalHeadingRef = useRef<HTMLHeadingElement>(null);
  const finalHeadingRef = headingRef ?? internalHeadingRef;

  const currentTrip = useMemo(() => {
    return tripId && !isUsingMock ? getTripById(tripId) : null;
  }, [tripId, isUsingMock, getTripById]);

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

      setIsLoadingReplacements(true);
      setReplacementActivityId(activityId);

      // Calculate date for this day
      let dayDate: string | undefined;
      if (tripStartDate) {
        const startDate = new Date(tripStartDate);
        startDate.setDate(startDate.getDate() + selectedDay);
        dayDate = startDate.toISOString().split("T")[0];
      }

      // Weather forecast is not implemented - scoring system works without it
      // Backend uses mock/historical data during itinerary generation
      let weatherForecast: import("@/types/weather").WeatherForecast | undefined;

      // Find replacement candidates with enhanced options
      const options = findReplacementCandidates(
        activity,
        currentTrip.builderData,
        model.days.flatMap((d) => d.activities),
        currentDay.activities,
        selectedDay,
        10,
        {
          weatherForecast,
          date: dayDate,
        },
      );

      setReplacementCandidates(options.candidates);
      setIsLoadingReplacements(false);
    },
    [tripId, isUsingMock, currentTrip, model, selectedDay, tripStartDate],
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

      // Update local model
      setModelState((current) => {
        const nextDays = current.days.map((d) => {
          if (d.id !== currentDay.id) return d;
          return {
            ...d,
            activities: d.activities.map((a) => (a.id === replacementActivityId ? newActivity : a)),
          };
        });
        return { ...current, days: nextDays };
      });

      setReplacementActivityId(null);
      setReplacementCandidates([]);
    },
    [tripId, isUsingMock, replacementActivityId, model, selectedDay, replaceActivity],
  );

  const handleCopy = useCallback(
    (activityId: string) => {
      if (!tripId || isUsingMock) return;

      const currentDay = model.days[selectedDay];
      if (!currentDay) return;

      const activity = currentDay.activities.find((a) => a.id === activityId);
      if (!activity) return;

      // Create a copy with new ID
      const copiedActivity: ItineraryActivity = {
        ...activity,
        id: `${activity.id}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      };

      // Find position to insert (after the original)
      const originalIndex = currentDay.activities.findIndex((a) => a.id === activityId);
      const insertPosition = originalIndex >= 0 ? originalIndex + 1 : undefined;

      if (tripId && !isUsingMock) {
        addActivity(tripId, currentDay.id, copiedActivity, insertPosition);
      }

      // Update local model
      setModelState((current) => {
        const nextDays = current.days.map((d) => {
          if (d.id !== currentDay.id) return d;
          const activities = [...d.activities];
          if (insertPosition !== undefined && insertPosition <= activities.length) {
            activities.splice(insertPosition, 0, copiedActivity);
          } else {
            activities.push(copiedActivity);
          }
          return { ...d, activities };
        });
        return { ...current, days: nextDays };
      });
    },
    [tripId, isUsingMock, model, selectedDay, addActivity],
  );

  useEffect(() => {
    if (finalHeadingRef.current) {
      finalHeadingRef.current.focus();
    }
  }, [finalHeadingRef]);
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
          logger.warn("Travel planning watchdog fired, falling back to previous schedule");
          pendingPlanRef.current = null;
          setPlanningError((prev) => prev ?? "We couldn't refresh travel times right now. Showing previous estimates.");
          setIsPlanning(false);
        }, 15000);

        setPlanningError(null);
        setIsPlanning(true);

        const dayEntryPointsMap = buildDayEntryPointsMap(target);
        
        planItinerary(target, undefined, dayEntryPointsMap)
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
    [setIsPlanning, setModelState, setPlanningError, buildDayEntryPointsMap],
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
    
    planItinerary(nextNormalized, undefined, dayEntryPointsMap)
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
        logger.error("Failed to plan itinerary", error);
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
  }, [serializedItinerary, itinerary, tripId, buildDayEntryPointsMap]);

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
          <div className="sticky h-[400px] rounded-2xl border border-gray-200 bg-white shadow-sm sm:h-[500px] xl:h-[calc(100vh-100px)] xl:min-h-[600px]" style={{ top: 'var(--sticky-offset, calc(80px + 10px))' }}>
            <ItineraryMapPanel
              day={safeSelectedDay}
              activities={currentDay?.activities ?? []}
              selectedActivityId={selectedActivityId}
              onSelectActivity={handleSelectActivity}
              isPlanning={isPlanning}
              startPoint={currentDayEntryPoints?.startPoint}
              endPoint={currentDayEntryPoints?.endPoint}
            />
          </div>
        </div>
        {/* Timeline panel */}
        <div className="order-1 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm xl:order-2">
          <div className="border-b border-gray-200 p-3 sm:p-4">
            <div className="mb-4 space-y-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1
                  ref={finalHeadingRef}
                  tabIndex={-1}
                  className="text-2xl font-semibold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:text-3xl"
                >
                  {headingText}
                </h1>
                {trips.length > 1 && (
                  <div className="flex flex-col gap-1 sm:min-w-[200px] sm:max-w-xs">
                    <label htmlFor="itinerary-select" className="text-xs font-medium text-gray-700">
                      View itinerary
                    </label>
                    <Select
                      id="itinerary-select"
                      value={selectedTripId ?? ""}
                      onChange={onTripChange}
                      options={trips.map((trip) => ({
                        label: trip.name,
                        value: trip.id,
                      }))}
                      placeholder="Select a trip"
                    />
                  </div>
                )}
              </div>
              {isUsingMock ? (
                <p className="mt-2 text-sm text-gray-500 sm:mt-3">
                  Showing mock itinerary for development. Build a trip to see your personalized plan.
                </p>
              ) : null}
              {trips.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600">
                    {descriptionText}
                  </p>
                  {createdLabel ? (
                    <p className="text-xs text-gray-400">
                      Saved {createdLabel}
                      {updatedLabel ? ` · Updated ${updatedLabel}` : ""}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
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
                tripStartDate={tripStartDate}
                tripId={tripId && !isUsingMock ? tripId : undefined}
                onReorder={handleReorder}
                onReplace={tripId && !isUsingMock ? handleReplace : undefined}
                onCopy={tripId && !isUsingMock ? handleCopy : undefined}
                startPoint={currentDayEntryPoints?.startPoint}
                endPoint={currentDayEntryPoints?.endPoint}
                tripBuilderData={tripBuilderData}
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">Planning error</p>
                    <p className="text-xs text-rose-600/80">{planningError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPlanningError(null);
                      scheduleUserPlanning(model);
                    }}
                    className="mt-2 shrink-0 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 sm:mt-0"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : null}
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


