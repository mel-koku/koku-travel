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
  memo,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
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
import type { PreviewState, RefinementFilters } from "@/hooks/useSmartPromptActions";
import { getActivityConflicts } from "@/lib/validation/itineraryConflicts";
import type { DayGuide } from "@/types/itineraryGuide";
import { GuideSegmentCard } from "./GuideSegmentCard";
import { SortableActivity } from "./SortableActivity";
import { TravelSegment } from "./TravelSegment";
import { DayHeader } from "./DayHeader";
import { getActivityCoordinates } from "@/lib/itineraryCoordinates";
import { REGIONS } from "@/data/regions";
import { useToast } from "@/context/ToastContext";
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
  // Called before a drag-reorder is applied to the model
  onBeforeDragReorder?: () => void;
  // Preview props
  previewState?: PreviewState | null;
  onConfirmPreview?: () => void;
  onShowAnother?: () => Promise<void>;
  onCancelPreview?: () => void;
  onFilterChange?: (filter: Partial<RefinementFilters>) => void;
  isPreviewLoading?: boolean;
  isReadOnly?: boolean;
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
  onBeforeDragReorder,
  previewState,
  onConfirmPreview,
  onShowAnother,
  onCancelPreview,
  onFilterChange,
  isPreviewLoading,
  isReadOnly,
}: ItineraryTimelineProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const { showToast } = useToast();

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  });
  const activeSensors = useSensors(pointerSensor);
  const emptySensors = useSensors();
  const sensors = isReadOnly ? emptySensors : activeSensors;

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

      // Signal to skip auto-optimization for this drag reorder (respect user intent)
      onBeforeDragReorder?.();

      let oldIndex = -1;
      let newIndex = -1;
      let movedActivity: ItineraryActivity | null = null as ItineraryActivity | null;

      // First, update the model with the new order.
      // flushSync is required here because DnD-kit reads DOM positions immediately
      // after onDragEnd — React's batched/async updates would leave stale DOM positions,
      // causing the dropped item to snap to the wrong visual position.
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

        // Read current state to build the list of segments to recalculate
        // We use a synchronous setModel that returns current unchanged, just to read state
        const activitiesToUpdate: Array<{
          activityId: string;
          previousActivity: Extract<ItineraryActivity, { kind: "place" }>;
          currentActivity: Extract<ItineraryActivity, { kind: "place" }>;
          currentTravelSegment: NonNullable<Extract<ItineraryActivity, { kind: "place" }>["travelFromPrevious"]>;
        }> = [];
        let dayTimezone: string | undefined;

        setModel((current) => {
            const currentDay = current.days[dayIndex];
            if (!currentDay) return current;

            dayTimezone = currentDay.timezone;
            const activities = currentDay.activities ?? [];
            const movedIndex = activities.findIndex((a) => a.id === capturedActivity.id);

            if (movedIndex === -1) return current;

            const defaultSegment = {
              mode: "transit" as const,
              durationMinutes: 0,
              distanceMeters: undefined,
              departureTime: undefined,
              arrivalTime: undefined,
              instructions: undefined,
              path: undefined,
            };

            // 1. Recalculate travel TO the moved activity (from previous place)
            if (movedIndex > 0) {
              for (let i = movedIndex - 1; i >= 0; i--) {
                const prev = activities[i];
                const moved = activities[movedIndex];
                if (prev && prev.kind === "place" && moved && moved.kind === "place") {
                  activitiesToUpdate.push({
                    activityId: capturedActivity.id,
                    previousActivity: prev,
                    currentActivity: moved,
                    currentTravelSegment: moved.travelFromPrevious ?? defaultSegment,
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
                  activitiesToUpdate.push({
                    activityId: next.id,
                    previousActivity: capturedActivity,
                    currentActivity: next,
                    currentTravelSegment: next.travelFromPrevious ?? defaultSegment,
                  });
                  break;
                }
              }
            }

            // 3. Recalculate travel for activity that was previously after moved activity
            if (oldIndex < activities.length - 1 && oldIndex !== movedIndex) {
              const activityAfterOldPosition = activities[oldIndex];
              if (activityAfterOldPosition && activityAfterOldPosition.kind === "place") {
                for (let j = oldIndex - 1; j >= 0; j--) {
                  const prev = activities[j];
                  if (prev && prev.kind === "place") {
                    activitiesToUpdate.push({
                      activityId: activityAfterOldPosition.id,
                      previousActivity: prev,
                      currentActivity: activityAfterOldPosition,
                      currentTravelSegment: activityAfterOldPosition.travelFromPrevious ?? defaultSegment,
                    });
                    break;
                  }
                }
              }
            }

            return current; // No mutation — just reading state
          });

        // Run async recalculations outside the state updater
        if (activitiesToUpdate.length > 0) {
          Promise.all(
            activitiesToUpdate.map(async ({ activityId, previousActivity, currentActivity, currentTravelSegment }) => {
              const updatedSegment = await recalculateTravelSegment(
                previousActivity,
                currentActivity,
                currentTravelSegment,
                dayTimezone,
              );
              return updatedSegment ? { activityId, segment: updatedSegment } : null;
            }),
          ).then((results) => {
            if (!isMountedRef.current) return;
            const updates = results.filter(
              (r): r is { activityId: string; segment: NonNullable<typeof r> extends { segment: infer S } ? S : never } => r !== null,
            );
            if (updates.length === 0) return;

            // Single batched update for all segments
            setModel((prev) => {
              const updatedDays = prev.days.map((d, idx) => {
                if (idx !== dayIndex) return d;
                return {
                  ...d,
                  activities: d.activities.map((a) => {
                    const update = updates.find((u) => u.activityId === a.id);
                    if (update && a.kind === "place") {
                      return { ...a, travelFromPrevious: update.segment };
                    }
                    return a;
                  }),
                };
              });
              return { ...prev, days: updatedDays };
            });
          }).catch((error) => {
            // eslint-disable-next-line no-console
            console.warn("[ItineraryTimeline] Failed to recalculate travel segments after reorder:", error);
          });
        }
      }
    },
    [dayIndex, setModel, recalculateTravelSegment, tripId, onReorder, day, onBeforeDragReorder],
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

  const handleDelayRemaining = useCallback(
    (delayMinutes: number) => {
      // Get current time as minutes since midnight
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const parseTime = (t: string): number | null => {
        const m = t.match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return null;
        return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
      };

      const formatTime = (mins: number): string => {
        const clamped = Math.min(mins, 23 * 60 + 59);
        const h = Math.floor(clamped / 60);
        const m = clamped % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      };

      setModel((current) => {
        const currentDay = current.days[dayIndex];
        if (!currentDay) return current;

        const activities = currentDay.activities ?? [];
        const placeActs = activities
          .map((a, i) => ({ a, i }))
          .filter((x): x is { a: Extract<ItineraryActivity, { kind: "place" }>; i: number } => x.a.kind === "place");

        // Find first activity at or after current time
        let startIdx = 0;
        for (let j = 0; j < placeActs.length; j++) {
          const act = placeActs[j]!.a;
          const timeStr = act.manualStartTime ?? act.schedule?.arrivalTime;
          if (timeStr) {
            const t = parseTime(timeStr);
            if (t !== null && t >= currentMinutes) {
              startIdx = j;
              break;
            }
          }
          // If no time found, default to shifting all
          if (j === placeActs.length - 1) startIdx = 0;
        }

        let shifted = 0;
        const nextActivities = [...activities];

        for (let j = startIdx; j < placeActs.length; j++) {
          const { a: act, i: actIndex } = placeActs[j]!;
          const arrTime = act.schedule?.arrivalTime;
          const depTime = act.schedule?.departureTime;
          const manual = act.manualStartTime;

          const baseTime = manual ?? arrTime;
          if (!baseTime) continue;

          const parsed = parseTime(baseTime);
          if (parsed === null) continue;

          const newStart = formatTime(parsed + delayMinutes);
          let newDep = depTime;
          if (depTime) {
            const depParsed = parseTime(depTime);
            if (depParsed !== null) {
              newDep = formatTime(depParsed + delayMinutes);
            }
          }

          nextActivities[actIndex] = {
            ...act,
            manualStartTime: newStart,
            schedule: act.schedule
              ? { ...act.schedule, arrivalTime: newStart, departureTime: newDep ?? act.schedule.departureTime }
              : undefined,
          };
          shifted++;
        }

        if (shifted === 0) return current;

        const nextDays = [...current.days];
        nextDays[dayIndex] = { ...currentDay, activities: nextActivities };
        return { ...current, days: nextDays };
      });

      // Show toast after state update (count computed inline)
      const activities = day.activities ?? [];
      const placeActs = activities.filter((a) => a.kind === "place");
      const label = delayMinutes >= 60
        ? `${Math.floor(delayMinutes / 60)}h${delayMinutes % 60 ? ` ${delayMinutes % 60}m` : ""}`
        : `${delayMinutes}m`;
      showToast(`Shifted ${placeActs.length} activities by ${label}`);
    },
    [dayIndex, setModel, day.activities, showToast],
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
            tripId={isReadOnly ? undefined : tripId}
            builderData={tripBuilderData}
            itinerary={model}
            onRefineDay={isReadOnly ? undefined : (refinedDay) => {
              setModel((current) => {
                const nextDays = [...current.days];
                nextDays[dayIndex] = refinedDay;
                return { ...current, days: nextDays };
              });
            }}
            suggestions={isReadOnly ? undefined : suggestions}
            onAcceptSuggestion={isReadOnly ? undefined : onAcceptSuggestion}
            onSkipSuggestion={isReadOnly ? undefined : onSkipSuggestion}
            loadingSuggestionId={isReadOnly ? undefined : loadingSuggestionId}
            conflicts={conflicts}
            onDayStartTimeChange={isReadOnly ? undefined : handleDayStartTimeChange}
            onDelayRemaining={isReadOnly ? undefined : handleDelayRemaining}
            previewState={isReadOnly ? undefined : previewState}
            onConfirmPreview={isReadOnly ? undefined : onConfirmPreview}
            onShowAnother={isReadOnly ? undefined : onShowAnother}
            onCancelPreview={isReadOnly ? undefined : onCancelPreview}
            onFilterChange={isReadOnly ? undefined : onFilterChange}
            isPreviewLoading={isReadOnly ? undefined : isPreviewLoading}
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
                <h4 className="text-sm font-semibold text-foreground">
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
                    <span className="font-mono">
                      {day.cityTransition.durationMinutes} minute
                      {day.cityTransition.durationMinutes !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {day.cityTransition.departureTime && day.cityTransition.arrivalTime && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Time:</span>
                      <span className="font-mono">
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
                      onUpdate={handleUpdate}
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
                      onDelete={isReadOnly ? () => {} : () => handleDelete(activity.id)}
                      onUpdate={isReadOnly ? () => {} : (patch) => handleUpdate(activity.id, patch)}
                      isSelected={activity.id === selectedActivityId}
                      onSelect={onSelectActivity}
                      placeNumber={placeNumber}
                      travelSegment={travelSegmentElement}
                      tripId={tripId}
                      dayId={day.id}
                      onReplace={!isReadOnly && onReplace ? () => onReplace(activity.id) : undefined}
                      conflicts={activityConflicts}
                      isReadOnly={isReadOnly}
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
            <p className="text-sm">{isReadOnly ? "No activities planned for this day." : "This day is wide open. Add a note to get started."}</p>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleAddNote}
                className="mt-3 text-sm font-medium text-sage hover:text-sage/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                + Add note
              </button>
            )}
          </div>
        )}
      </div>

      {/* Drag Preview Overlay - Compact card preview */}
      {!isReadOnly && (
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
                  <p className="truncate text-sm font-semibold text-foreground">
                    {activeActivity.title}
                  </p>
                  <div className="flex items-center gap-2">
                    {activeActivity.schedule?.arrivalTime && (
                      <span className="font-mono text-xs text-sage">
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
      )}
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

const TravelSegmentWrapper = memo(function TravelSegmentWrapper({
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
});

