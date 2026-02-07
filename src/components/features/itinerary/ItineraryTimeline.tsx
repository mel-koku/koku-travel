"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import { flushSync } from "react-dom";
import {
  type Itinerary,
  type ItineraryActivity,
  type ItineraryDay,
  type ItineraryTravelMode,
} from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";
import type { ItineraryConflict, ItineraryConflictsResult } from "@/lib/validation/itineraryConflicts";
import { getActivityConflicts } from "@/lib/validation/itineraryConflicts";
import type { DayGuide } from "@/types/itineraryGuide";
import { GuideSegmentCard } from "./GuideSegmentCard";
import { SortableActivity } from "./SortableActivity";
import { TravelSegment } from "./TravelSegment";
import { DayHeader } from "./DayHeader";
import { getActivityCoordinates } from "@/lib/itineraryCoordinates";
import { REGIONS } from "@/data/regions";
import type { RoutingRequest, Coordinate } from "@/lib/routing/types";

function formatCityName(cityId: string): string {
  for (const region of REGIONS) {
    const city = region.cities.find((c) => c.id === cityId);
    if (city) {
      return city.name;
    }
  }
  // Fallback: capitalize first letter
  return cityId.charAt(0).toUpperCase() + cityId.slice(1);
}

type ItineraryTimelineProps = {
  day: ItineraryDay;
  dayIndex: number;
  model: Itinerary;
  setModel: Dispatch<SetStateAction<Itinerary>>;
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string) => void;
  tripStartDate?: string; // ISO date string (yyyy-mm-dd)
  tripId?: string;
  onReorder?: (dayId: string, activityIds: string[]) => void;
  onReplace?: (activityId: string) => void;
  tripBuilderData?: TripBuilderData;
  // Smart suggestions for this day
  suggestions?: DetectedGap[];
  onAcceptSuggestion?: (gap: DetectedGap) => void;
  onSkipSuggestion?: (gap: DetectedGap) => void;
  loadingSuggestionId?: string | null;
  // Conflicts for this day
  conflicts?: ItineraryConflict[];
  conflictsResult?: ItineraryConflictsResult;
  // Guide segments for this day
  guide?: DayGuide | null;
};

export const ItineraryTimeline = ({
  day,
  dayIndex,
  model,
  setModel,
  selectedActivityId,
  onSelectActivity,
  tripStartDate,
  tripId,
  onReorder,
  onReplace,
  tripBuilderData,
  suggestions,
  onAcceptSuggestion,
  onSkipSuggestion,
  loadingSuggestionId,
  conflicts,
  conflictsResult,
  guide,
}: ItineraryTimelineProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  // Activities list - entry points are not displayed in the timeline
  // (they are shown on the map via ItineraryMapPanel)
  const extendedActivities = useMemo(() => {
    return day.activities ?? [];
  }, [day.activities]);

  const handleDelete = useCallback(
    (activityId: string) => {
      setModel((current) => {
        let hasChanged = false;
        const nextDays = current.days.map((entry, index) => {
          if (index !== dayIndex) return entry;

          const nextActivities = entry.activities.filter((activity) => {
            const shouldKeep = activity.id !== activityId;
            if (!shouldKeep) {
              hasChanged = true;
            }
            return shouldKeep;
          });

          if (!hasChanged) {
            return entry;
          }

          return { ...entry, activities: nextActivities };
        });

        return hasChanged ? { ...current, days: nextDays } : current;
      });
    },
    [dayIndex, setModel],
  );

  const handleUpdate = useCallback(
    (activityId: string, patch: Partial<ItineraryActivity>) => {
      setModel((current) => {
        let hasChanged = false;
        const nextDays = current.days.map((entry, index) => {
          if (index !== dayIndex) return entry;

          const nextActivities = entry.activities.map((activity) => {
            if (activity.id !== activityId) return activity;

            const nextActivity = { ...activity, ...patch } as ItineraryActivity;
            hasChanged =
              hasChanged ||
              Object.entries(patch).some(([key, value]) => {
                const typedKey = key as keyof ItineraryActivity;
                return activity[typedKey] !== value;
              });
            return nextActivity;
          });

          return hasChanged ? { ...entry, activities: nextActivities } : entry;
        });

        return hasChanged ? { ...current, days: nextDays } : current;
      });
    },
    [dayIndex, setModel],
  );

  // Helper function to recalculate travel segment between two place activities
  const recalculateTravelSegment = useCallback(
    async (
      fromActivity: Extract<ItineraryActivity, { kind: "place" }>,
      toActivity: Extract<ItineraryActivity, { kind: "place" }>,
      currentTravelSegment: NonNullable<Extract<ItineraryActivity, { kind: "place" }>["travelFromPrevious"]>,
      timezone?: string,
    ) => {
      const originCoordinates = getActivityCoordinates(fromActivity);
      const destinationCoordinates = getActivityCoordinates(toActivity);

      if (!originCoordinates || !destinationCoordinates) {
        return null;
      }

      try {
        const request: RoutingRequest = {
          origin: originCoordinates,
          destination: destinationCoordinates,
          mode: currentTravelSegment.mode,
          departureTime: currentTravelSegment.departureTime,
          timezone,
        };

        const response = await fetch("/api/routing/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const routeData = await response.json();

        return {
          ...currentTravelSegment,
          mode: currentTravelSegment.mode,
          durationMinutes: routeData.durationMinutes ?? currentTravelSegment.durationMinutes,
          distanceMeters: routeData.distanceMeters ?? currentTravelSegment.distanceMeters,
          path: routeData.path ?? currentTravelSegment.path,
          instructions: routeData.instructions ?? currentTravelSegment.instructions,
          arrivalTime: routeData.arrivalTime ?? currentTravelSegment.arrivalTime,
        };
      } catch (_error) {
        // Return null on error - keep existing segment
        return null;
      }
    },
    [],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      setActiveId(null);
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      if (activeId === overId) return;

      let oldIndex = -1;
      let newIndex = -1;
      let movedActivity: ItineraryActivity | null = null as ItineraryActivity | null;

      // First, update the model with the new order
      // Use flushSync to ensure state update completes synchronously before proceeding
      let activityIdsForReorder: string[] | null = null;

      flushSync(() => {
        setModel((current) => {
        let hasChanged = false;

        const nextDays = current.days.map((entry, index) => {
          if (index !== dayIndex) return entry;

          const currentActivities = [...(entry.activities ?? [])];
          const activeIndex = currentActivities.findIndex(
            (activity) => activity.id === activeId,
          );

          if (activeIndex === -1) {
            return entry;
          }

          const movingActivity = currentActivities[activeIndex];
          if (!movingActivity) {
            return entry;
          }

          // Store for later recalculation
          movedActivity = movingActivity;
          oldIndex = activeIndex;

          // Remove the activity from its current position
          const updatedList = [...currentActivities];
          updatedList.splice(activeIndex, 1);

          // Find the target position
          const overIndex = updatedList.findIndex(
            (activity) => activity.id === overId,
          );
          const destinationIndex =
            overIndex >= 0 ? overIndex : updatedList.length;

          newIndex = Math.min(destinationIndex, updatedList.length);

          // Insert at the new position
          updatedList.splice(newIndex, 0, movingActivity);

          hasChanged = true;
          
          // Capture activityIds for reorder call outside of setState
          if (hasChanged && tripId && day.id && onReorder) {
            activityIdsForReorder = updatedList.map((a) => a.id);
          }
          
          return { ...entry, activities: updatedList };
        });

        return hasChanged ? { ...current, days: nextDays } : current;
        });
      }); // End flushSync - state update is now complete

      // Call AppState reorder after state update - flushSync ensures state is updated
      if (activityIdsForReorder && tripId && day.id && onReorder) {
        onReorder(day.id, activityIdsForReorder);
      }

      // After model update, recalculate affected travel segments
      // flushSync above ensures the model state is already updated
      if (movedActivity && movedActivity.kind === "place" && oldIndex !== -1 && newIndex !== -1) {
        const capturedActivity = movedActivity as Extract<ItineraryActivity, { kind: "place" }>;
        // Get current state to find affected activities
        setModel((current) => {
            const day = current.days[dayIndex];
            if (!day) return current;

            const activities = day.activities ?? [];
            const movedIndex = activities.findIndex((a) => a.id === capturedActivity.id);

            if (movedIndex === -1) return current;

            const activitiesToUpdate: Array<{
              activityId: string;
              previousActivity: Extract<ItineraryActivity, { kind: "place" }>;
              currentTravelSegment: NonNullable<Extract<ItineraryActivity, { kind: "place" }>["travelFromPrevious"]>;
            }> = [];

            // 1. Recalculate travel TO the moved activity (from previous place)
            if (movedIndex > 0) {
              for (let i = movedIndex - 1; i >= 0; i--) {
                const prev = activities[i];
                const moved = activities[movedIndex];
                if (prev && prev.kind === "place" && moved && moved.kind === "place") {
                  // Create default segment if it doesn't exist
                  const currentSegment = moved.travelFromPrevious ?? {
                    mode: "transit" as const,
                    durationMinutes: 0,
                    distanceMeters: undefined,
                    departureTime: undefined,
                    arrivalTime: undefined,
                    instructions: undefined,
                    path: undefined,
                  };
                  activitiesToUpdate.push({
                    activityId: capturedActivity.id,
                    previousActivity: prev,
                    currentTravelSegment: currentSegment,
                  });
                  break;
                }
              }
            }

            // 2. Recalculate travel FROM the moved activity (to next place)
            if (movedIndex < activities.length - 1) {
              for (let i = movedIndex + 1; i < activities.length; i++) {
                const next = activities[i];
                if (next && next.kind === "place" && capturedActivity && capturedActivity.kind === "place") {
                  // Create default segment if it doesn't exist
                  const currentSegment = next.travelFromPrevious ?? {
                    mode: "transit" as const,
                    durationMinutes: 0,
                    distanceMeters: undefined,
                    departureTime: undefined,
                    arrivalTime: undefined,
                    instructions: undefined,
                    path: undefined,
                  };
                  activitiesToUpdate.push({
                    activityId: next.id,
                    previousActivity: capturedActivity,
                    currentTravelSegment: currentSegment,
                  });
                  break;
                }
              }
            }

            // 3. Recalculate travel for activity that was previously after moved activity
            // (if it exists and now has a different previous place)
            if (oldIndex < activities.length - 1 && oldIndex !== movedIndex) {
              const activityAfterOldPosition = activities[oldIndex];
              if (activityAfterOldPosition && activityAfterOldPosition.kind === "place") {
                // Find its new previous place
                for (let j = oldIndex - 1; j >= 0; j--) {
                  const prev = activities[j];
                  if (prev && prev.kind === "place") {
                    // Create default segment if it doesn't exist
                    const currentSegment = activityAfterOldPosition.travelFromPrevious ?? {
                      mode: "transit" as const,
                      durationMinutes: 0,
                      distanceMeters: undefined,
                      departureTime: undefined,
                      arrivalTime: undefined,
                      instructions: undefined,
                      path: undefined,
                    };
                    activitiesToUpdate.push({
                      activityId: activityAfterOldPosition.id,
                      previousActivity: prev,
                      currentTravelSegment: currentSegment,
                    });
                    break;
                  }
                }
              }
            }

            // Recalculate all affected segments asynchronously
            if (activitiesToUpdate.length > 0) {
              Promise.all(
                activitiesToUpdate.map(async ({ activityId, previousActivity, currentTravelSegment }) => {
                  const activity = activities.find((a) => a.id === activityId);
                  if (!activity || activity.kind !== "place" || !previousActivity) {
                    return;
                  }

                  const updatedSegment = await recalculateTravelSegment(
                    previousActivity,
                    activity,
                    currentTravelSegment,
                    day.timezone,
                  );

                  if (updatedSegment) {
                    // Update the model with the new segment
                    setModel((prev) => {
                      const updatedDays = prev.days.map((d, idx) => {
                        if (idx !== dayIndex) return d;
                        return {
                          ...d,
                          activities: d.activities.map((a) =>
                            a.id === activityId && a.kind === "place"
                              ? { ...a, travelFromPrevious: updatedSegment }
                              : a,
                          ),
                        };
                      });
                      return { ...prev, days: updatedDays };
                    });
                  }
                }),
              ).catch((error) => {
                // Log warning for debugging - segments will be recalculated on next plan
                // eslint-disable-next-line no-console
                console.warn("[ItineraryTimeline] Failed to recalculate travel segments after reorder:", error);
              });
            }

            return current;
          });
      }
    },
    [dayIndex, setModel, recalculateTravelSegment, tripId, onReorder, day],
  );

  const handleAddNote = useCallback(() => {
    setModel((current) => {
      const nextDays = current.days.map((entry, index) => {
        if (index !== dayIndex) return entry;

        const newNote: ItineraryActivity = {
          kind: "note",
          id:
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `note-${Date.now()}-${Math.random()}`,
          title: "Note",
          timeOfDay: "morning", // Keep for type compatibility, but not used in UI
          notes: "",
          startTime: undefined,
          endTime: undefined,
        };

        const nextActivities = [
          ...(entry.activities ?? []),
          newNote,
        ];

        return { ...entry, activities: nextActivities };
      });

      return { ...current, days: nextDays };
    });
  }, [dayIndex, setModel]);

  const handleDayStartTimeChange = useCallback(
    (startTime: string) => {
      setModel((current) => {
        const nextDays = current.days.map((entry, index) => {
          if (index !== dayIndex) return entry;
          return {
            ...entry,
            bounds: {
              ...(entry.bounds ?? {}),
              startTime,
            },
          };
        });
        return { ...current, days: nextDays };
      });
    },
    [dayIndex, setModel]
  );

  // Get the active activity for DragOverlay
  const activeActivity = activeId
    ? extendedActivities.find((a) => a.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Day Header */}
          <DayHeader
            day={day}
            dayIndex={dayIndex}
            tripStartDate={tripStartDate}
            tripId={tripId}
            builderData={tripBuilderData}
            itinerary={model}
            onRefineDay={(refinedDay) => {
              setModel((current) => {
                const nextDays = [...current.days];
                nextDays[dayIndex] = refinedDay;
                return { ...current, days: nextDays };
              });
            }}
            suggestions={suggestions}
            onAcceptSuggestion={onAcceptSuggestion}
            onSkipSuggestion={onSkipSuggestion}
            loadingSuggestionId={loadingSuggestionId}
            conflicts={conflicts}
            onDayStartTimeChange={handleDayStartTimeChange}
          />

        {/* City Transition Display */}
        {day.cityTransition && (
          <div className="rounded-xl border-2 border-dashed border-sage/30 bg-sage/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-sage"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-charcoal">
                  Traveling from {formatCityName(day.cityTransition.fromCityId)} to{" "}
                  {formatCityName(day.cityTransition.toCityId)}
                </h4>
                <div className="mt-1 space-y-1 text-sm text-foreground-secondary">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Mode:</span>
                    <span className="capitalize">{day.cityTransition.mode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Duration:</span>
                    <span>
                      {day.cityTransition.durationMinutes} minute
                      {day.cityTransition.durationMinutes !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {day.cityTransition.departureTime && day.cityTransition.arrivalTime && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Time:</span>
                      <span>
                        {day.cityTransition.departureTime} → {day.cityTransition.arrivalTime}
                      </span>
                    </div>
                  )}
                  {day.cityTransition.notes && (
                    <p className="text-xs text-sage">{day.cityTransition.notes}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Simple list of activities with travel segments */}
        {extendedActivities.length > 0 ? (
          <SortableContext
            items={extendedActivities.map((activity) => activity.id)}
            strategy={verticalListSortingStrategy}
          >
            {/* Guide: Day Intro */}
            {guide?.intro && !activeId && (
              <GuideSegmentCard segment={guide.intro} className="mb-3" />
            )}

            <ul className="space-y-3">
              {extendedActivities.map((activity, index) => {
                // Calculate place number (only for place activities, 1-indexed to match map pins)
                let placeNumber: number | undefined = undefined;
                if (activity.kind === "place") {
                  // Count place activities before this index, starting from 1
                  let placeCounter = 1;
                  for (let i = 0; i < index; i++) {
                    if (extendedActivities[i]?.kind === "place") {
                      placeCounter++;
                    }
                  }
                  placeNumber = placeCounter;
                }

                // Get previous place activity for travel segment
                let previousActivity: ItineraryActivity | null = null;
                for (let i = index - 1; i >= 0; i--) {
                  const prev = extendedActivities[i];
                  if (prev && prev.kind === "place") {
                    previousActivity = prev;
                    break;
                  }
                }

                const originCoordinates =
                  previousActivity && previousActivity.kind === "place"
                    ? getActivityCoordinates(previousActivity)
                    : null;

                const destinationCoordinates =
                  activity.kind === "place" ? getActivityCoordinates(activity) : null;

                const travelFromPrevious =
                  activity.kind === "place" ? activity.travelFromPrevious : null;

                // Show travel segment if we have both coordinates and a previous place activity
                const shouldShowTravelSegment =
                  activity.kind === "place" &&
                  previousActivity !== null &&
                  previousActivity.kind === "place" &&
                  originCoordinates &&
                  destinationCoordinates;

                // Create a default travel segment if one doesn't exist
                const displayTravelSegment = travelFromPrevious ?? (shouldShowTravelSegment ? {
                  mode: "transit" as const,
                  durationMinutes: 0,
                  distanceMeters: undefined,
                  departureTime: undefined,
                  arrivalTime: undefined,
                  instructions: undefined,
                  path: undefined,
                } : null);

                // Render travel segment between activities
                const travelSegmentElement =
                  shouldShowTravelSegment && displayTravelSegment && previousActivity && previousActivity.kind === "place" ? (
                    <TravelSegmentWrapper
                      activity={activity}
                      previousActivity={previousActivity}
                      travelFromPrevious={displayTravelSegment}
                      originCoordinates={originCoordinates!}
                      destinationCoordinates={destinationCoordinates!}
                      dayTimezone={day.timezone}
                      onUpdate={(activityId, patch) => handleUpdate(activityId, patch)}
                    />
                  ) : undefined;

                // Get conflicts for this specific activity
                const activityConflicts = conflictsResult
                  ? getActivityConflicts(conflictsResult, activity.id)
                  : [];

                // Find guide segments that should appear after this activity
                const guideSegmentsAfter = guide?.segments.filter(
                  (seg) => seg.afterActivityId === activity.id,
                ) ?? [];

                // Find guide segments that should appear before this activity (prep content)
                const guideSegmentsBefore = guide?.segments.filter(
                  (seg) => seg.beforeActivityId === activity.id,
                ) ?? [];

                const fragmentKey = activity.id;
                return (
                  <Fragment key={fragmentKey}>
                    {/* Guide segments before this activity (cultural insights, tips) */}
                    {!activeId && guideSegmentsBefore.map((seg) => (
                      <li key={seg.id} className="list-none">
                        <GuideSegmentCard segment={seg} />
                      </li>
                    ))}
                    <SortableActivity
                      activity={activity}
                      allActivities={extendedActivities}
                      dayTimezone={day.timezone}
                      onDelete={() => handleDelete(activity.id)}
                      onUpdate={(patch) => handleUpdate(activity.id, patch)}
                      isSelected={activity.id === selectedActivityId}
                      onSelect={onSelectActivity}
                      placeNumber={placeNumber}
                      travelSegment={travelSegmentElement}
                      tripId={tripId}
                      dayId={day.id}
                      onReplace={onReplace ? () => onReplace(activity.id) : undefined}
                      conflicts={activityConflicts}
                    />
                    {/* Guide segments after this activity */}
                    {!activeId && guideSegmentsAfter.map((seg) => (
                      <li key={seg.id} className="list-none">
                        <GuideSegmentCard segment={seg} />
                      </li>
                    ))}
                  </Fragment>
                );
              })}
            </ul>

            {/* Guide: Day Summary */}
            {guide?.summary && !activeId && (
              <GuideSegmentCard segment={guide.summary} className="mt-3" />
            )}
          </SortableContext>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border p-6 text-center text-stone">
            <p className="text-sm">No activities yet for this day.</p>
            <button
              type="button"
              onClick={handleAddNote}
              className="mt-3 text-sm font-medium text-sage hover:text-sage/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              + Add note
            </button>
          </div>
        )}
      </div>

      {/* Drag Preview Overlay - Compact card preview */}
      <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeActivity && activeActivity.kind === "place" && (
          <div className="pointer-events-none w-[320px] max-w-[90vw]">
            <div className="rounded-2xl border-2 border-brand-primary/50 bg-background p-3 shadow-2xl ring-4 ring-brand-primary/20 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {/* Drag indicator */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10">
                  <svg className="h-5 w-5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
                {/* Activity info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-charcoal">
                    {activeActivity.title}
                  </p>
                  <div className="flex items-center gap-2">
                    {activeActivity.schedule?.arrivalTime && (
                      <span className="text-xs text-sage">
                        {activeActivity.schedule.arrivalTime}
                      </span>
                    )}
                    {activeActivity.neighborhood && (
                      <span className="truncate text-xs text-stone">
                        {activeActivity.neighborhood}
                      </span>
                    )}
                  </div>
                </div>
                {/* Visual indicator that it's being dragged */}
                <div className="shrink-0 rounded-full bg-sage/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sage">
                  Moving
                </div>
              </div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// TravelSegmentWrapper component (moved from TimelineSection)
type TravelSegmentWrapperProps = {
  activity: Extract<ItineraryActivity, { kind: "place" }>;
  previousActivity: Extract<ItineraryActivity, { kind: "place" }>;
  travelFromPrevious: NonNullable<Extract<ItineraryActivity, { kind: "place" }>["travelFromPrevious"]>;
  originCoordinates: Coordinate;
  destinationCoordinates: Coordinate;
  dayTimezone?: string;
  onUpdate: (activityId: string, patch: Partial<ItineraryActivity>) => void;
};

function TravelSegmentWrapper({
  activity,
  previousActivity,
  travelFromPrevious,
  originCoordinates,
  destinationCoordinates,
  dayTimezone,
  onUpdate,
}: TravelSegmentWrapperProps) {
  const [isRecalculatingRoute, setIsRecalculatingRoute] = useState(false);
  const [hasAutoFetched, setHasAutoFetched] = useState(false);

  const handleModeChange = useCallback(async (newMode: ItineraryTravelMode) => {
    // Validate coordinates exist before allowing mode change
    if (!originCoordinates || !destinationCoordinates) {
      return;
    }

    // Validate mode is valid
    const validModes: ItineraryTravelMode[] = ["walk", "car", "taxi", "bus", "train", "subway", "transit", "bicycle"];
    if (!validModes.includes(newMode)) {
      return;
    }

    setIsRecalculatingRoute(true);
    try {
      // Fetch new route for the selected mode
      const request: RoutingRequest = {
        origin: originCoordinates,
        destination: destinationCoordinates,
        mode: newMode,
        departureTime: travelFromPrevious.departureTime,
        timezone: dayTimezone,
      };

      const response = await fetch("/api/routing/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const routeData = await response.json();

      // Update the travel segment with new route data
      onUpdate(activity.id, {
        travelFromPrevious: {
          ...travelFromPrevious,
          mode: newMode,
          durationMinutes: routeData.durationMinutes ?? travelFromPrevious.durationMinutes,
          distanceMeters: routeData.distanceMeters ?? travelFromPrevious.distanceMeters,
          path: routeData.path ?? travelFromPrevious.path,
          instructions: routeData.instructions ?? travelFromPrevious.instructions,
          arrivalTime: routeData.arrivalTime ?? travelFromPrevious.arrivalTime,
          isEstimated: routeData.isEstimated ?? false,
        },
      });
    } catch (_error) {
      // On error, still update mode but keep existing route data
      // The full itinerary replan will eventually fix it
      onUpdate(activity.id, {
        travelFromPrevious: {
          ...travelFromPrevious,
          mode: newMode,
        },
      });
    } finally {
      setIsRecalculatingRoute(false);
    }
  }, [activity.id, originCoordinates, destinationCoordinates, travelFromPrevious, dayTimezone, onUpdate]);

  // Auto-fetch route if segment is missing or incomplete (duration is 0)
  useEffect(() => {
    if (
      !hasAutoFetched &&
      !isRecalculatingRoute &&
      travelFromPrevious.durationMinutes === 0 &&
      originCoordinates &&
      destinationCoordinates
    ) {
      setHasAutoFetched(true);
      handleModeChange(travelFromPrevious.mode).catch((error) => {
        // Log warning for debugging - planning system will recalculate on refresh
        // eslint-disable-next-line no-console
        console.warn("[TravelSegmentWrapper] Failed to auto-fetch route:", error);
      });
    }
  }, [hasAutoFetched, isRecalculatingRoute, travelFromPrevious.durationMinutes, travelFromPrevious.mode, originCoordinates, destinationCoordinates, handleModeChange]);

  return (
    <TravelSegment
      segment={travelFromPrevious}
      origin={originCoordinates}
      destination={destinationCoordinates}
      originName={previousActivity.title}
      destinationName={activity.title}
      timezone={dayTimezone}
      onModeChange={handleModeChange}
      isRecalculating={isRecalculatingRoute}
    />
  );
}

