"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
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
import type { DayGuide } from "@/types/itineraryGuide";
import { TravelSegment } from "./TravelSegment";
import { DayHeader } from "./DayHeader";
import { AccommodationBookend } from "./AccommodationBookend";
import { getActivityCoordinates } from "@/lib/itineraryCoordinates";
import { estimateHeuristicRoute } from "@/lib/routing/heuristic";
import { addActivity, replaceActivity } from "@/services/trip/activityOperations";
import { createKonbiniActivity, TIME_SLOT_BY_MEAL } from "@/lib/itinerary/konbiniNote";

import { useDayAvailability } from "@/hooks/useDayAvailability";
import { logger } from "@/lib/logger";
import type { RoutingRequest, Coordinate } from "@/lib/routing/types";
import { TimelineCityTransition } from "./TimelineCityTransition";
import { TimelineDragOverlay } from "./TimelineDragOverlay";
import { TimelineActivityList } from "./TimelineActivityList";
import { LockedDayOverlay } from "./LockedDayOverlay";

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
  /** Whether this day is locked behind the paywall */
  isLocked?: boolean;
  /** Called when the user taps unlock on a locked day */
  onUnlockClick?: () => void;
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
  isLocked,
  onUnlockClick,
}: ItineraryTimelineProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
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
      if (isReadOnly) return;
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
    [dayIndex, setModel, isReadOnly],
  );

  const handleUpdate = useCallback(
    (activityId: string, patch: Partial<ItineraryActivity>) => {
      if (isReadOnly) return;
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
    [dayIndex, setModel, isReadOnly],
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
      if (isReadOnly) return;
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
    [dayIndex, setModel, recalculateTravelSegment, tripId, onReorder, day, onBeforeDragReorder, onAfterDragReorder, isReadOnly],
  );

  const handleAddNote = useCallback(() => {
    if (isReadOnly) return;
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
  }, [dayIndex, setModel, isReadOnly]);



  const handleAddAtIndex = useCallback(
    (
      activity: Extract<ItineraryActivity, { kind: "place" }>,
      index: number,
      _meta: { addressSource: "mapbox" | "google" | "as-is" | "none" },
    ) => {
      if (isReadOnly) return;
      setModel((current) => addActivity(current, day.id, activity, index));
    },
    [day.id, setModel, isReadOnly],
  );

  const handleAddKonbini = useCallback(
    (mealType: "breakfast" | "lunch" | "dinner", index: number) => {
      if (isReadOnly) return;
      const note = createKonbiniActivity(mealType, TIME_SLOT_BY_MEAL[mealType]);
      setModel((current) => addActivity(current, day.id, note, index));
    },
    [day.id, setModel, isReadOnly],
  );

  const handleEditActivity = useCallback(
    (
      original: Extract<ItineraryActivity, { kind: "place" }>,
      updated: Extract<ItineraryActivity, { kind: "place" }>,
      _meta: { addressSource: "mapbox" | "google" | "as-is" | "none" },
    ) => {
      if (isReadOnly) return;
      setModel((current) => replaceActivity(current, day.id, original.id, updated));
    },
    [day.id, setModel, isReadOnly],
  );

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
      <div data-itinerary-day className="space-y-6">
        {/* Day Header (conflicts + accommodation only) */}
        {/* On arrival day, accommodation picker moves below the anchor card */}
        {(() => {
          const hasArrivalAnchor = extendedActivities.some(
            (a) => a.kind === "place" && a.isAnchor && a.id.startsWith("anchor-arrival"),
          );
          return (
            <DayHeader
              day={day}
              conflicts={conflicts}
              startLocation={hasArrivalAnchor ? undefined : startLocation}
              endLocation={hasArrivalAnchor ? undefined : endLocation}
              onStartLocationChange={hasArrivalAnchor || isReadOnly ? undefined : onStartLocationChange}
              onEndLocationChange={hasArrivalAnchor || isReadOnly ? undefined : onEndLocationChange}
              onCityAccommodationChange={hasArrivalAnchor || isReadOnly ? undefined : onCityAccommodationChange}
            />
          );
        })()}

        {day.cityTransition && (
          <TimelineCityTransition cityTransition={day.cityTransition} />
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

        {isLocked ? (
          <div className="relative min-h-50">
            <div className="select-none" aria-hidden="true">
              {day.activities
                .filter((a) => a.kind === "place")
                .slice(0, 3)
                .map((a) => (
                  <div key={a.id} className="mb-4 rounded-lg bg-surface p-4">
                    <div className="font-serif text-sm text-foreground">{a.title}</div>
                    <div className="mt-1 h-3 w-2/3 rounded bg-sand/50" />
                  </div>
                ))}
            </div>
            <LockedDayOverlay onUnlockClick={onUnlockClick ?? (() => {})} />
          </div>
        ) : (
          <TimelineActivityList
            day={day}
            dayIndex={dayIndex}
            totalDays={model.days.length}
            extendedActivities={extendedActivities}
            activeId={activeId}
            selectedActivityId={selectedActivityId}
            onSelectActivity={onSelectActivity}
            tripStartDate={tripStartDate}
            tripId={tripId}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            onReplace={onReplace}
            onAddAtIndex={handleAddAtIndex}
            onEditActivity={handleEditActivity}
            onAddKonbini={handleAddKonbini}
            accommodationStyle={tripBuilderData?.accommodationStyle}
            conflictsResult={conflictsResult}
            guide={guide}
            isReadOnly={isReadOnly}
            startLocation={startLocation}
            endLocation={endLocation}
            bookendEstimates={bookendEstimates}
            availabilityIssues={availabilityIssues}
            onViewDetails={onViewDetails}
            handleAddNote={handleAddNote}
            TravelSegmentWrapper={TravelSegmentWrapper}
            onStartLocationChange={isReadOnly ? undefined : onStartLocationChange}
            onEndLocationChange={isReadOnly ? undefined : onEndLocationChange}
            onCityAccommodationChange={isReadOnly ? undefined : onCityAccommodationChange}
          />
        )}
      </div>

      {!isReadOnly && (
        <TimelineDragOverlay activeActivity={activeActivity} />
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
  segmentIndex?: number;
};

const TravelSegmentWrapper = memo(function TravelSegmentWrapper({
  activity,
  previousActivity,
  travelFromPrevious,
  originCoordinates,
  destinationCoordinates,
  dayTimezone,
  onUpdate,
  segmentIndex,
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
  // Staggered by segmentIndex to avoid concurrent API storm on mount
  useEffect(() => {
    if (
      !hasAutoFetched &&
      !isRecalculatingRoute &&
      travelFromPrevious.durationMinutes === 0 &&
      originCoordinates &&
      destinationCoordinates
    ) {
      // Stagger auto-fetch calls to avoid concurrent API storm
      const delay = (segmentIndex ?? 0) * 500;
      const timer = setTimeout(() => {
        setHasAutoFetched(true);
        handleModeChange(travelFromPrevious.mode).catch((error) => {
          logger.warn("[TravelSegmentWrapper] Failed to auto-fetch route", { error });
        });
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [hasAutoFetched, isRecalculatingRoute, travelFromPrevious.durationMinutes, travelFromPrevious.mode, originCoordinates, destinationCoordinates, handleModeChange, segmentIndex]);

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

