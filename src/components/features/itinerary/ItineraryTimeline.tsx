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
import type { Location } from "@/types/location";
import type { EntryPoint, TripBuilderData } from "@/types/trip";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";
import type { ItineraryConflict, ItineraryConflictsResult } from "@/lib/validation/itineraryConflicts";
import type { PreviewState, RefinementFilters } from "@/hooks/useSmartPromptActions";
import { getActivityConflicts } from "@/lib/validation/itineraryConflicts";
import type { DayGuide } from "@/types/itineraryGuide";
import { GuideSegmentCard } from "./GuideSegmentCard";
import { DayBookingCards } from "./DayBookingCards";
import { SortableActivity } from "./SortableActivity";
import { TravelSegment } from "./TravelSegment";
import { DayHeader } from "./DayHeader";
import { AccommodationBookend } from "./AccommodationBookend";
import { LateArrivalCard } from "./LateArrivalCard";
import { getActivityCoordinates } from "@/lib/itineraryCoordinates";
import { estimateHeuristicRoute } from "@/lib/routing/heuristic";

import { useDayAvailability } from "@/hooks/useDayAvailability";
import { AvailabilityAlert } from "./AvailabilityAlert";
import { easeCinematicCSS } from "@/lib/motion";
import { logger } from "@/lib/logger";
import type { RoutingRequest, Coordinate } from "@/lib/routing/types";
import { formatCityName } from "@/lib/itinerary/dayLabel";

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
  // Called after drag-reorder with the reordered itinerary, to schedule replanning
  onAfterDragReorder?: (reorderedItinerary: Itinerary) => void;
  // Preview props
  previewState?: PreviewState | null;
  onConfirmPreview?: () => void;
  onShowAnother?: () => Promise<void>;
  onCancelPreview?: () => void;
  onFilterChange?: (filter: Partial<RefinementFilters>) => void;
  isPreviewLoading?: boolean;
  isReadOnly?: boolean;
  // Start/end location
  startLocation?: EntryPoint;
  endLocation?: EntryPoint;
  onStartLocationChange?: (location: EntryPoint | undefined) => void;
  onEndLocationChange?: (location: EntryPoint | undefined) => void;
  onCityAccommodationChange?: (location: EntryPoint | undefined) => void;
  /** Open the LocationExpanded slide-in panel for a location */
  onViewDetails?: (location: Location) => void;
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
  tripBuilderData: _tripBuilderData,
  suggestions: _suggestions,
  onAcceptSuggestion: _onAcceptSuggestion,
  onSkipSuggestion: _onSkipSuggestion,
  loadingSuggestionId: _loadingSuggestionId,
  conflicts,
  conflictsResult,
  guide,
  onBeforeDragReorder,
  onAfterDragReorder,
  previewState: _previewState,
  onConfirmPreview: _onConfirmPreview,
  onShowAnother: _onShowAnother,
  onCancelPreview: _onCancelPreview,
  onFilterChange: _onFilterChange,
  isPreviewLoading: _isPreviewLoading,
  isReadOnly,
  startLocation,
  endLocation,
  onStartLocationChange,
  onEndLocationChange,
  onCityAccommodationChange,
  onViewDetails,
}: ItineraryTimelineProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lateArrivalDismissed, setLateArrivalDismissed] = useState(false);
  const isMountedRef = useRef(true);
  const availabilityIssues = useDayAvailability(day, dayIndex, tripStartDate);

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
  const extendedActivities = useMemo(() => day.activities ?? [], [day.activities]);

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
      let reorderedItinerary: Itinerary | null = null;

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

        const result = hasChanged ? { ...current, days: nextDays } : current;
        reorderedItinerary = result !== current ? result : null;
        return result;
        });
      }); // End flushSync - state update is now complete

      // Call AppState reorder after state update - flushSync ensures state is updated
      if (activityIdsForReorder && tripId && day.id && onReorder) {
        onReorder(day.id, activityIdsForReorder);
      }

      // Schedule replanning to recalculate arrival/departure times for the new order
      if (reorderedItinerary) {
        onAfterDragReorder?.(reorderedItinerary);
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
            logger.warn("[ItineraryTimeline] Failed to recalculate travel segments after reorder", { error });
          });
        }
      }
    },
    [dayIndex, setModel, recalculateTravelSegment, tripId, onReorder, day, onBeforeDragReorder, onAfterDragReorder],
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



  // ── Accommodation bookend travel estimates ──
  const bookendEstimates = useMemo(() => {
    const placeActivities = extendedActivities.filter(
      (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place",
    );
    if (placeActivities.length === 0) return { start: null, end: null };

    let startEstimate: { travelMinutes: number; distanceMeters: number } | null = null;
    let endEstimate: { travelMinutes: number; distanceMeters: number } | null = null;

    const firstActivity = placeActivities[0]!;
    const lastActivity = placeActivities[placeActivities.length - 1]!;

    if (startLocation?.coordinates) {
      const firstCoords = getActivityCoordinates(firstActivity);
      if (firstCoords) {
        const heuristic = estimateHeuristicRoute({
          origin: startLocation.coordinates,
          destination: firstCoords,
          mode: "walk",
        });
        startEstimate = {
          travelMinutes: Math.max(1, Math.round(heuristic.durationSeconds / 60)),
          distanceMeters: heuristic.distanceMeters,
        };
      }
    }

    if (endLocation?.coordinates) {
      const lastCoords = getActivityCoordinates(lastActivity);
      if (lastCoords) {
        const heuristic = estimateHeuristicRoute({
          origin: lastCoords,
          destination: endLocation.coordinates,
          mode: "walk",
        });
        endEstimate = {
          travelMinutes: Math.max(1, Math.round(heuristic.durationSeconds / 60)),
          distanceMeters: heuristic.distanceMeters,
        };
      }
    }

    return { start: startEstimate, end: endEstimate };
  }, [extendedActivities, startLocation, endLocation]);

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
        {/* Day Header (conflicts + accommodation only) */}
          <DayHeader
            day={day}
            conflicts={conflicts}
            startLocation={startLocation}
            endLocation={endLocation}
            onStartLocationChange={isReadOnly ? undefined : onStartLocationChange}
            onEndLocationChange={isReadOnly ? undefined : onEndLocationChange}
            onCityAccommodationChange={isReadOnly ? undefined : onCityAccommodationChange}
          />

        {/* City Transition Display */}
        {day.cityTransition && (
          <div className="rounded-lg border-2 border-dashed border-sage/30 bg-sage/10 p-4">
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

        {/* Accommodation: Start bookend — skip if day starts with an arrival anchor (rendered inline after anchor instead) */}
        {startLocation && extendedActivities.length > 0 && !activeId && (() => {
          const firstPlace = extendedActivities.find((a) => a.kind === "place");
          if (firstPlace?.kind === "place" && firstPlace.isAnchor) return null;
          return (
            <AccommodationBookend
              location={startLocation}
              variant="start"
              travelMinutes={bookendEstimates.start?.travelMinutes}
              distanceMeters={bookendEstimates.start?.distanceMeters}
            />
          );
        })()}

        {/* Simple list of activities with travel segments */}
        {extendedActivities.length > 0 ? (
          <>
          <SortableContext
            items={extendedActivities.map((activity) => activity.id)}
            strategy={verticalListSortingStrategy}
          >
            {/* Confirmed bookings for this day */}
            <DayBookingCards
              tripStartDate={tripStartDate}
              dayIndex={dayIndex}
              totalDays={model.days.length}
            />

            <ul className="space-y-3">
              {extendedActivities.map((activity, index) => {
                // Calculate place number (only for non-anchor place activities, 1-indexed to match map pins)
                let placeNumber: number | undefined = undefined;
                if (activity.kind === "place" && !activity.isAnchor) {
                  // Count non-anchor place activities before this index, starting from 1
                  let placeCounter = 1;
                  for (let i = 0; i < index; i++) {
                    const prev = extendedActivities[i];
                    if (prev?.kind === "place" && !prev.isAnchor) {
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
                // For anchor activities (arrival/departure), shift "before" segments to render
                // after instead, so they don't sit between accommodation pickers and the anchor card.
                const rawSegmentsBefore = guide?.segments.filter(
                  (seg) => seg.beforeActivityId === activity.id,
                ) ?? [];
                const isAnchor = activity.kind === "place" && activity.isAnchor;
                const guideSegmentsBefore = isAnchor ? [] : rawSegmentsBefore;
                const guideSegmentsAfterAnchor = isAnchor ? rawSegmentsBefore : [];

                const fragmentKey = activity.id;
                // Render guide segments before with card-width offset
                const guideBeforeElement = !activeId && guideSegmentsBefore.length > 0 ? (
                  <div className="space-y-1">
                    {guideSegmentsBefore.map((seg) => (
                      <GuideSegmentCard key={seg.id} segment={seg} />
                    ))}
                  </div>
                ) : undefined;

                return (
                  <Fragment key={fragmentKey}>
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
                      guideSegmentsBefore={guideBeforeElement}
                      tripId={tripId}
                      dayId={day.id}
                      onReplace={!isReadOnly && onReplace ? () => onReplace(activity.id) : undefined}
                      conflicts={activityConflicts}
                      isReadOnly={isReadOnly}
                      activeDragId={activeId}
                      onViewDetails={onViewDetails}
                      tripStartDate={tripStartDate}
                      dayIndex={dayIndex}
                    />
                    {/* Guide segments after this activity */}
                    {!activeId && guideSegmentsAfter.map((seg) => (
                      <li key={seg.id} className="list-none">
                        <GuideSegmentCard segment={seg} />
                      </li>
                    ))}
                    {/* Inline accommodation bookend after arrival anchor */}
                    {!activeId && activity.kind === "place" && activity.isAnchor && activity.id.startsWith("anchor-arrival") && startLocation && (
                      <li className="list-none">
                        <AccommodationBookend
                          location={startLocation}
                          variant="start"
                          travelMinutes={bookendEstimates.start?.travelMinutes}
                          distanceMeters={bookendEstimates.start?.distanceMeters}
                        />
                      </li>
                    )}
                    {/* Late arrival card after hotel bookend */}
                    {!activeId && activity.kind === "place" && activity.isAnchor && activity.id.startsWith("anchor-arrival") && day.isLateArrival && !lateArrivalDismissed && (
                      <li className="list-none mt-3">
                        <LateArrivalCard
                          city={day.cityId ?? "your destination"}
                          onDismiss={() => setLateArrivalDismissed(true)}
                        />
                      </li>
                    )}
                    {/* Guide segments shifted from before anchor to after (below bookend + late arrival) */}
                    {!activeId && guideSegmentsAfterAnchor.map((seg) => (
                      <li key={seg.id} className="list-none">
                        <GuideSegmentCard segment={seg} />
                      </li>
                    ))}
                  </Fragment>
                );
              })}
            </ul>

          </SortableContext>

          {/* Availability Alert */}
          {!activeId && availabilityIssues && availabilityIssues.summary.total > 0 && (
            <AvailabilityAlert
              issues={availabilityIssues}
              onFindAlternative={
                !isReadOnly && onReplace
                  ? (activityId) => onReplace(activityId)
                  : undefined
              }
              className="mt-3"
            />
          )}

          {/* Accommodation: End bookend — skip if day ends with a departure anchor */}
          {endLocation && !activeId && (() => {
            const lastPlace = [...extendedActivities].reverse().find((a) => a.kind === "place");
            if (lastPlace?.kind === "place" && lastPlace.isAnchor) return null;
            return (
              <AccommodationBookend
                location={endLocation}
                variant="end"
                travelMinutes={bookendEstimates.end?.travelMinutes}
                distanceMeters={bookendEstimates.end?.distanceMeters}
              />
            );
          })()}
          </>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-border p-6 text-center text-stone">
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
      <DragOverlay dropAnimation={{ duration: 250, easing: easeCinematicCSS }}>
        {activeActivity && activeActivity.kind === "place" && (
          <div className="pointer-events-none w-[320px] max-w-[90vw]">
            <div className="rounded-lg border-2 border-brand-primary/50 bg-background p-3 shadow-[var(--shadow-elevated)] ring-4 ring-brand-primary/20 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {/* Drag indicator */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10">
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
        logger.warn("[TravelSegmentWrapper] Failed to auto-fetch route", { error });
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

