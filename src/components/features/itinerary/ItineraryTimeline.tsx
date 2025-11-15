"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useState,
  useEffect,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  type Itinerary,
  type ItineraryActivity,
  type ItineraryDay,
  type ItineraryTravelMode,
} from "@/types/itinerary";
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
};

export const ItineraryTimeline = ({
  day,
  dayIndex,
  model: _model,
  setModel,
  selectedActivityId,
  onSelectActivity,
  tripStartDate,
}: ItineraryTimelineProps) => {
  void _model;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activities = day.activities ?? [];

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
      } catch (error) {
        // Return null on error - keep existing segment
        return null;
      }
    },
    [],
  );

  const handleDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      if (activeId === overId) return;

      let oldIndex = -1;
      let newIndex = -1;
      let movedActivity: ItineraryActivity | null = null as ItineraryActivity | null;

      // First, update the model with the new order
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
          return { ...entry, activities: updatedList };
        });

        return hasChanged ? { ...current, days: nextDays } : current;
      });

      // After model update, recalculate affected travel segments
      if (movedActivity && movedActivity.kind === "place" && oldIndex !== -1 && newIndex !== -1) {
        const capturedActivity = movedActivity as Extract<ItineraryActivity, { kind: "place" }>;
        // Use setTimeout to ensure state has updated, then recalculate
        setTimeout(() => {
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
                    mode: "walk" as const,
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
                    mode: "walk" as const,
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
                      mode: "walk" as const,
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
              ).catch(() => {
                // Silently fail - segments will be recalculated on next plan
              });
            }

            return current;
          });
        }, 0);
      }
    },
    [dayIndex, setModel, recalculateTravelSegment],
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Day Header */}
        <DayHeader day={day} dayIndex={dayIndex} tripStartDate={tripStartDate} />

        {/* City Transition Display */}
        {day.cityTransition && (
          <div className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-indigo-600"
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
                <h4 className="text-sm font-semibold text-indigo-900">
                  Traveling from {formatCityName(day.cityTransition.fromCityId)} to{" "}
                  {formatCityName(day.cityTransition.toCityId)}
                </h4>
                <div className="mt-1 space-y-1 text-sm text-indigo-700">
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
                    <p className="text-xs text-indigo-600">{day.cityTransition.notes}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Simple list of activities with travel segments */}
        {activities.length > 0 ? (
          <SortableContext
            items={activities.map((activity) => activity.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-3">
              {activities.map((activity, index) => {
                // Calculate place number (only for place activities, sequential starting from 1)
                let placeNumber: number | undefined = undefined;
                if (activity.kind === "place") {
                  let placeCounter = 1;
                  for (let i = 0; i < index; i++) {
                    if (activities[i]?.kind === "place") {
                      placeCounter++;
                    }
                  }
                  placeNumber = placeCounter;
                }

                // Get previous place activity for travel segment
                let previousActivity: ItineraryActivity | null = null;
                for (let i = index - 1; i >= 0; i--) {
                  const prev = activities[i];
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

                // Show travel segment if we have both coordinates, even if travelFromPrevious doesn't exist yet
                const shouldShowTravelSegment =
                  activity.kind === "place" &&
                  previousActivity &&
                  previousActivity.kind === "place" &&
                  originCoordinates &&
                  destinationCoordinates;

                // Create a default travel segment if one doesn't exist
                const displayTravelSegment = travelFromPrevious ?? (shouldShowTravelSegment ? {
                  mode: "walk" as const,
                  durationMinutes: 0,
                  distanceMeters: undefined,
                  departureTime: undefined,
                  arrivalTime: undefined,
                  instructions: undefined,
                  path: undefined,
                } : null);

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

                return (
                  <SortableActivity
                    key={activity.id}
                    activity={activity}
                    allActivities={activities}
                    dayTimezone={day.timezone}
                    onDelete={() => handleDelete(activity.id)}
                    onUpdate={(patch) => handleUpdate(activity.id, patch)}
                    isSelected={activity.id === selectedActivityId}
                    onSelect={onSelectActivity}
                    placeNumber={placeNumber}
                    travelSegment={travelSegmentElement}
                  />
                );
              })}
            </ul>
          </SortableContext>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center text-gray-500">
            <p className="text-sm">No activities yet for this day.</p>
            <button
              type="button"
              onClick={handleAddNote}
              className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              + Add note
            </button>
          </div>
        )}
      </div>
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
        },
      });
    } catch (error) {
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
      handleModeChange(travelFromPrevious.mode).catch(() => {
        // Silently fail - planning system will handle it
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

