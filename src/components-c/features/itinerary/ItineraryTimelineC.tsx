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
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { flushSync } from "react-dom";
import { GripVertical } from "lucide-react";
import {
  type Itinerary,
  type ItineraryActivity,
  type ItineraryDay,
  type ItineraryTravelMode,
} from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { EntryPoint, TripBuilderData } from "@/types/trip";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";
import type {
  ItineraryConflict,
  ItineraryConflictsResult,
} from "@/lib/validation/itineraryConflicts";
import type {
  PreviewState,
  RefinementFilters,
} from "@/hooks/useSmartPromptActions";
import { getActivityConflicts, getDayConflicts } from "@/lib/validation/itineraryConflicts";
import type { DayGuide } from "@/types/itineraryGuide";
import { TravelSegmentC } from "./TravelSegmentC";
import { AccommodationBookendC } from "./AccommodationBookendC";
import { SortableActivityC } from "./SortableActivityC";
import { DayHeaderC } from "./DayHeaderC";
import { DayConflictSummaryC } from "./ConflictBadgeC";


import { useDayAvailability } from "@/hooks/useDayAvailability";
import { getActivityCoordinates } from "@/lib/itineraryCoordinates";
import { estimateHeuristicRoute } from "@/lib/routing/heuristic";
import { REGIONS } from "@/data/regions";
import { logger } from "@/lib/logger";
import type { RoutingRequest, Coordinate } from "@/lib/routing/types";

function formatCityName(cityId: string): string {
  for (const region of REGIONS) {
    const city = region.cities.find((c) => c.id === cityId);
    if (city) return city.name;
  }
  return cityId.charAt(0).toUpperCase() + cityId.slice(1);
}

// Simple accommodation travel display
function AccommodationTravelSegment({
  estimate,
}: {
  origin: Coordinate;
  destination: Coordinate;
  originName: string;
  destinationName: string;
  estimate: { travelMinutes: number; distanceMeters: number };
  timezone?: string;
}) {
  const durationLabel =
    estimate.travelMinutes < 60
      ? `${estimate.travelMinutes} min walk`
      : `${Math.floor(estimate.travelMinutes / 60)}h ${estimate.travelMinutes % 60}m walk`;

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--muted-foreground)" }}>
        {durationLabel}
      </span>
      <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
    </div>
  );
}

// Travel segment wrapper for mode changes
function TravelSegmentWrapper({
  activity,
  previousActivity,
  travelFromPrevious,
  originCoordinates,
  destinationCoordinates,
  dayTimezone,
  onUpdate,
}: {
  activity: Extract<ItineraryActivity, { kind: "place" }>;
  previousActivity: Extract<ItineraryActivity, { kind: "place" }>;
  travelFromPrevious: NonNullable<Extract<ItineraryActivity, { kind: "place" }>["travelFromPrevious"]>;
  originCoordinates: Coordinate;
  destinationCoordinates: Coordinate;
  dayTimezone?: string;
  onUpdate: (activityId: string, patch: Partial<ItineraryActivity>) => void;
}) {
  const handleModeChange = useCallback(
    async (newMode: ItineraryTravelMode) => {
      onUpdate(activity.id, {
        travelFromPrevious: {
          ...travelFromPrevious,
          mode: newMode,
        },
      } as Partial<ItineraryActivity>);

      try {
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
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const routeData = await response.json();
        onUpdate(activity.id, {
          travelFromPrevious: {
            ...travelFromPrevious,
            mode: newMode,
            durationMinutes: routeData.durationMinutes ?? travelFromPrevious.durationMinutes,
            distanceMeters: routeData.distanceMeters ?? travelFromPrevious.distanceMeters,
            path: routeData.path ?? travelFromPrevious.path,
            instructions: routeData.instructions ?? travelFromPrevious.instructions,
            arrivalTime: routeData.arrivalTime ?? travelFromPrevious.arrivalTime,
            transitSteps: routeData.transitSteps ?? undefined,
          },
        } as Partial<ItineraryActivity>);
      } catch {
        // Keep optimistic mode change
      }
    },
    [activity.id, travelFromPrevious, originCoordinates, destinationCoordinates, dayTimezone, onUpdate],
  );

  // Compute gap
  let gapMinutes: number | undefined;
  if (previousActivity.schedule?.departureTime && travelFromPrevious.arrivalTime) {
    const parse = (t: string) => {
      const m = t.match(/^(\d{1,2}):(\d{2})$/);
      return m ? parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10) : null;
    };
    const dep = parse(previousActivity.schedule.departureTime);
    const arr = parse(travelFromPrevious.arrivalTime);
    if (dep !== null && arr !== null) {
      gapMinutes = arr - dep - travelFromPrevious.durationMinutes;
    }
  }

  return (
    <TravelSegmentC
      segment={travelFromPrevious}
      origin={originCoordinates}
      destination={destinationCoordinates}
      originName={previousActivity.title}
      destinationName={activity.title}
      timezone={dayTimezone}
      onModeChange={handleModeChange}
      gapMinutes={gapMinutes}
    />
  );
}

type ItineraryTimelineCProps = {
  day: ItineraryDay;
  dayIndex: number;
  model: Itinerary;
  setModel: Dispatch<SetStateAction<Itinerary>>;
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string) => void;
  tripStartDate?: string;
  tripId?: string;
  onReorder?: (dayId: string, activityIds: string[]) => void;
  onReplace?: (activityId: string) => void;
  tripBuilderData?: TripBuilderData;
  suggestions?: DetectedGap[];
  onAcceptSuggestion?: (gap: DetectedGap) => void;
  onSkipSuggestion?: (gap: DetectedGap) => void;
  loadingSuggestionId?: string | null;
  conflicts?: ItineraryConflict[];
  conflictsResult?: ItineraryConflictsResult;
  guide?: DayGuide | null;
  onBeforeDragReorder?: () => void;
  onAfterDragReorder?: (reorderedItinerary: Itinerary) => void;
  previewState?: PreviewState | null;
  onConfirmPreview?: () => void;
  onShowAnother?: () => Promise<void>;
  onCancelPreview?: () => void;
  onFilterChange?: (filter: Partial<RefinementFilters>) => void;
  isPreviewLoading?: boolean;
  isReadOnly?: boolean;
  startLocation?: EntryPoint;
  endLocation?: EntryPoint;
  onStartLocationChange?: (location: EntryPoint | undefined) => void;
  onEndLocationChange?: (location: EntryPoint | undefined) => void;
  onViewDetails?: (location: Location) => void;
};

export const ItineraryTimelineC = ({
  day,
  dayIndex,
  model: _model,
  setModel,
  selectedActivityId,
  onSelectActivity,
  tripStartDate,
  tripId,
  onReorder,
  onReplace,
  tripBuilderData: _tripBuilderData,
  conflicts: _conflicts,
  conflictsResult,
  guide,
  onBeforeDragReorder,
  onAfterDragReorder,
  isReadOnly,
  startLocation,
  endLocation,
  onStartLocationChange: _onStartLocationChange,
  onEndLocationChange: _onEndLocationChange,
  onViewDetails,
}: ItineraryTimelineCProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  useDayAvailability(day, dayIndex, tripStartDate);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  });
  const activeSensors = useSensors(pointerSensor);
  const emptySensors = useSensors();
  const sensors = isReadOnly ? emptySensors : activeSensors;

  const extendedActivities = useMemo(() => {
    return day.activities ?? [];
  }, [day.activities]);

  // Handlers
  const handleDelete = useCallback(
    (activityId: string) => {
      setModel((current) => {
        let hasChanged = false;
        const nextDays = current.days.map((entry, index) => {
          if (index !== dayIndex) return entry;
          const nextActivities = entry.activities.filter((a) => {
            const keep = a.id !== activityId;
            if (!keep) hasChanged = true;
            return keep;
          });
          if (!hasChanged) return entry;
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
          const nextActivities = entry.activities.map((a) => {
            if (a.id !== activityId) return a;
            const next = { ...a, ...patch } as ItineraryActivity;
            hasChanged =
              hasChanged ||
              Object.entries(patch).some(([key, value]) => {
                const typedKey = key as keyof ItineraryActivity;
                return a[typedKey] !== value;
              });
            return next;
          });
          return hasChanged ? { ...entry, activities: nextActivities } : entry;
        });
        return hasChanged ? { ...current, days: nextDays } : current;
      });
    },
    [dayIndex, setModel],
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
          timeOfDay: "morning",
          notes: "",
          startTime: undefined,
          endTime: undefined,
        };
        return {
          ...entry,
          activities: [...(entry.activities ?? []), newNote],
        };
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
            bounds: { ...entry.bounds, startTime },
          };
        });
        return { ...current, days: nextDays };
      });
    },
    [dayIndex, setModel],
  );

  // Travel recalculation
  const recalculateTravelSegment = useCallback(
    async (
      fromActivity: Extract<ItineraryActivity, { kind: "place" }>,
      toActivity: Extract<ItineraryActivity, { kind: "place" }>,
      currentTravelSegment: NonNullable<Extract<ItineraryActivity, { kind: "place" }>["travelFromPrevious"]>,
      timezone?: string,
    ) => {
      const originCoordinates = getActivityCoordinates(fromActivity);
      const destinationCoordinates = getActivityCoordinates(toActivity);
      if (!originCoordinates || !destinationCoordinates) return null;

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
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
      } catch {
        return null;
      }
    },
    [],
  );

  // DnD handlers
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      setActiveId(null);
      if (!over) return;

      const dragActiveId = String(active.id);
      const overId = String(over.id);
      if (dragActiveId === overId) return;

      onBeforeDragReorder?.();

      let oldIndex = -1;
      let newIndex = -1;
      let movedActivity: ItineraryActivity | null = null as ItineraryActivity | null;
      let activityIdsForReorder: string[] | null = null;
      let reorderedItinerary: Itinerary | null = null;

      flushSync(() => {
        setModel((current) => {
          let hasChanged = false;
          const nextDays = current.days.map((entry, index) => {
            if (index !== dayIndex) return entry;
            const currentActivities = [...(entry.activities ?? [])];
            const activeIndex = currentActivities.findIndex((a) => a.id === dragActiveId);
            if (activeIndex === -1) return entry;

            const movingActivity = currentActivities[activeIndex];
            if (!movingActivity) return entry;

            movedActivity = movingActivity;
            oldIndex = activeIndex;

            const updatedList = [...currentActivities];
            updatedList.splice(activeIndex, 1);

            const overIndex = updatedList.findIndex((a) => a.id === overId);
            const destinationIndex = overIndex >= 0 ? overIndex : updatedList.length;
            newIndex = Math.min(destinationIndex, updatedList.length);

            updatedList.splice(newIndex, 0, movingActivity);
            hasChanged = true;

            if (hasChanged && tripId && day.id && onReorder) {
              activityIdsForReorder = updatedList.map((a) => a.id);
            }
            return { ...entry, activities: updatedList };
          });

          const result = hasChanged ? { ...current, days: nextDays } : current;
          reorderedItinerary = result !== current ? result : null;
          return result;
        });
      });

      if (activityIdsForReorder && tripId && day.id && onReorder) {
        onReorder(day.id, activityIdsForReorder);
      }

      if (reorderedItinerary) {
        onAfterDragReorder?.(reorderedItinerary);
      }

      // Recalculate affected travel segments (same logic as B)
      if (movedActivity && movedActivity.kind === "place" && oldIndex !== -1 && newIndex !== -1) {
        const capturedActivity = movedActivity as Extract<ItineraryActivity, { kind: "place" }>;
        const activitiesToUpdate: Array<{
          activityId: string;
          previousActivity: Extract<ItineraryActivity, { kind: "place" }>;
          currentActivity: Extract<ItineraryActivity, { kind: "place" }>;
          currentTravelSegment: NonNullable<Extract<ItineraryActivity, { kind: "place" }>["travelFromPrevious"]>;
        }> = [];
        let dayTimezone: string | undefined;
        const defaultSegment = {
          mode: "transit" as const,
          durationMinutes: 0,
          distanceMeters: undefined,
          departureTime: undefined,
          arrivalTime: undefined,
          instructions: undefined,
          path: undefined,
        };

        setModel((current) => {
          const currentDay = current.days[dayIndex];
          if (!currentDay) return current;
          dayTimezone = currentDay.timezone;
          const activities = currentDay.activities ?? [];
          const movedIdx = activities.findIndex((a) => a.id === capturedActivity.id);
          if (movedIdx === -1) return current;

          if (movedIdx > 0) {
            for (let i = movedIdx - 1; i >= 0; i--) {
              const prev = activities[i];
              const moved = activities[movedIdx];
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

          if (movedIdx < activities.length - 1) {
            for (let i = movedIdx + 1; i < activities.length; i++) {
              const next = activities[i];
              if (next && next.kind === "place") {
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

          return current;
        });

        if (activitiesToUpdate.length > 0) {
          Promise.all(
            activitiesToUpdate.map(async ({ activityId, previousActivity, currentActivity, currentTravelSegment }) => {
              const updatedSegment = await recalculateTravelSegment(previousActivity, currentActivity, currentTravelSegment, dayTimezone);
              return updatedSegment ? { activityId, segment: updatedSegment } : null;
            }),
          )
            .then((results) => {
              if (!isMountedRef.current) return;
              const updates = results.filter((r): r is { activityId: string; segment: NonNullable<typeof r> extends { segment: infer S } ? S : never } => r !== null);
              if (updates.length === 0) return;

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
            })
            .catch((error) => {
              logger.warn("[ItineraryTimelineC] Failed to recalculate travel segments", { error });
            });
        }
      }
    },
    [dayIndex, setModel, recalculateTravelSegment, tripId, onReorder, day, onBeforeDragReorder, onAfterDragReorder],
  );

  // Accommodation bookend travel estimates
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
      const isFirstAnchor = firstActivity.isAnchor;
      const estimateOrigin = isFirstAnchor ? getActivityCoordinates(firstActivity) : startLocation.coordinates;
      const estimateDestination = isFirstAnchor ? startLocation.coordinates : getActivityCoordinates(firstActivity);

      if (estimateOrigin && estimateDestination) {
        const heuristic = estimateHeuristicRoute({ origin: estimateOrigin, destination: estimateDestination, mode: "walk" });
        startEstimate = { travelMinutes: Math.max(1, Math.round(heuristic.durationSeconds / 60)), distanceMeters: heuristic.distanceMeters };
      }
    }

    if (endLocation?.coordinates) {
      const lastCoords = getActivityCoordinates(lastActivity);
      if (lastCoords) {
        const heuristic = estimateHeuristicRoute({ origin: lastCoords, destination: endLocation.coordinates, mode: "walk" });
        endEstimate = { travelMinutes: Math.max(1, Math.round(heuristic.durationSeconds / 60)), distanceMeters: heuristic.distanceMeters };
      }
    }

    return { start: startEstimate, end: endEstimate };
  }, [extendedActivities, startLocation, endLocation]);

  const activeActivity = activeId ? extendedActivities.find((a) => a.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div ref={timelineRef} className="space-y-0">
        {/* Day Header */}
        <DayHeaderC
          day={day}
          dayIndex={dayIndex}
          tripStartDate={tripStartDate}
          onDayStartTimeChange={isReadOnly ? undefined : handleDayStartTimeChange}
          dayIntroSlot={
            !activeId && guide?.intro?.content ? (
              <p
                className="text-xs italic leading-relaxed line-clamp-2 mt-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                {guide.intro.content}
              </p>
            ) : undefined
          }
        />

        {/* City Transition */}
        {day.cityTransition && (
          <div
            className="border-2 border-dashed p-4 mt-3"
            style={{
              borderColor: "var(--primary)",
              backgroundColor: "color-mix(in srgb, var(--primary) 3%, transparent)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center border"
                style={{ borderColor: "var(--primary)" }}
              >
                <svg className="h-4 w-4" style={{ color: "var(--primary)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--foreground)" }}>
                  {formatCityName(day.cityTransition.fromCityId)} to {formatCityName(day.cityTransition.toCityId)}
                </h4>
                <div className="mt-1 space-y-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  <span className="capitalize">{day.cityTransition.mode}</span>
                  <span> · {day.cityTransition.durationMinutes} min</span>
                  {day.cityTransition.departureTime && day.cityTransition.arrivalTime && (
                    <span> · {day.cityTransition.departureTime} → {day.cityTransition.arrivalTime}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity list */}
        {extendedActivities.length > 0 ? (
          <>
            <SortableContext
              items={extendedActivities.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              {/* Start bookend */}
              {startLocation && !activeId && (() => {
                const firstPlaceActivity = extendedActivities.find(
                  (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place",
                );
                if (firstPlaceActivity?.isAnchor) return null;

                const firstCoords = firstPlaceActivity ? getActivityCoordinates(firstPlaceActivity) : null;

                return (
                  <div className="mt-3 space-y-0">
                    <AccommodationBookendC location={startLocation} variant="start" />
                    {startLocation.coordinates && firstCoords && bookendEstimates.start && (
                      <AccommodationTravelSegment
                        origin={startLocation.coordinates}
                        destination={firstCoords}
                        originName={startLocation.name}
                        destinationName={firstPlaceActivity?.title ?? "first stop"}
                        estimate={bookendEstimates.start}
                        timezone={day.timezone}
                      />
                    )}
                  </div>
                );
              })()}

              <ul className="space-y-0 mt-3">
                {extendedActivities.map((activity, index) => {
                  let placeNumber: number | undefined = undefined;
                  if (activity.kind === "place" && !activity.isAnchor) {
                    let counter = 1;
                    for (let i = 0; i < index; i++) {
                      const prev = extendedActivities[i];
                      if (prev?.kind === "place" && !prev.isAnchor) counter++;
                    }
                    placeNumber = counter;
                  }

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

                  const shouldShowTravelSegment =
                    activity.kind === "place" &&
                    previousActivity !== null &&
                    previousActivity.kind === "place" &&
                    originCoordinates &&
                    destinationCoordinates;

                  const displayTravelSegment =
                    travelFromPrevious ??
                    (shouldShowTravelSegment
                      ? {
                          mode: "transit" as const,
                          durationMinutes: 0,
                          distanceMeters: undefined,
                          departureTime: undefined,
                          arrivalTime: undefined,
                          instructions: undefined,
                          path: undefined,
                        }
                      : null);

                  const travelSegmentElement =
                    shouldShowTravelSegment && displayTravelSegment && previousActivity && previousActivity.kind === "place" ? (
                      <TravelSegmentWrapper
                        activity={activity as Extract<ItineraryActivity, { kind: "place" }>}
                        previousActivity={previousActivity}
                        travelFromPrevious={displayTravelSegment}
                        originCoordinates={originCoordinates!}
                        destinationCoordinates={destinationCoordinates!}
                        dayTimezone={day.timezone}
                        onUpdate={handleUpdate}
                      />
                    ) : undefined;

                  const activityConflicts = conflictsResult
                    ? getActivityConflicts(conflictsResult, activity.id)
                    : [];

                  return (
                    <Fragment key={activity.id}>
                      <SortableActivityC
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
                        activeDragId={activeId}
                        onViewDetails={onViewDetails}
                        tripStartDate={tripStartDate}
                        dayIndex={dayIndex}
                      />
                      {/* Hotel bookend after arrival anchor */}
                      {activity.kind === "place" &&
                        activity.isAnchor &&
                        activity.id.startsWith("anchor-arrival") &&
                        startLocation &&
                        !activeId && (() => {
                          const anchorCoords = activity.coordinates;
                          return (
                            <li className="list-none mt-0 space-y-0">
                              {anchorCoords && startLocation.coordinates && bookendEstimates.start && (
                                <AccommodationTravelSegment
                                  origin={anchorCoords}
                                  destination={startLocation.coordinates}
                                  originName={activity.title}
                                  destinationName={startLocation.name}
                                  estimate={bookendEstimates.start}
                                  timezone={day.timezone}
                                />
                              )}
                              <AccommodationBookendC location={startLocation} variant="start" />
                            </li>
                          );
                        })()}
                    </Fragment>
                  );
                })}
              </ul>
            </SortableContext>

            {/* Day Conflict Summary */}
            {!activeId && conflictsResult && (
              <DayConflictSummaryC
                dayConflicts={getDayConflicts(conflictsResult, day.id)}
                className="mt-3"
              />
            )}

            {/* Day Tips rendered in ItineraryShellC next to Adjust */}

            {/* End bookend */}
            {endLocation && !activeId && (() => {
              const lastPlaceActivity = [...extendedActivities]
                .reverse()
                .find((a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place");
              if (lastPlaceActivity?.isAnchor) return null;

              const lastCoords = lastPlaceActivity ? getActivityCoordinates(lastPlaceActivity) : null;

              return (
                <div className="mt-3 space-y-0">
                  {endLocation.coordinates && lastCoords && bookendEstimates.end && (
                    <AccommodationTravelSegment
                      origin={lastCoords}
                      destination={endLocation.coordinates}
                      originName={lastPlaceActivity?.title ?? "last stop"}
                      destinationName={endLocation.name}
                      estimate={bookendEstimates.end}
                      timezone={day.timezone}
                    />
                  )}
                  <AccommodationBookendC location={endLocation} variant="end" />
                </div>
              );
            })()}
          </>
        ) : (
          <div
            className="mt-4 border-2 border-dashed p-6 text-center"
            style={{
              borderColor: "var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            <p className="text-sm">
              {isReadOnly
                ? "No activities planned for this day."
                : "This day is wide open. Add a note to get started."}
            </p>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleAddNote}
                className="mt-3 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors hover:text-[var(--foreground)]"
                style={{ color: "var(--primary)" }}
              >
                + Add note
              </button>
            )}
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      {!isReadOnly && (
        <DragOverlay
          dropAnimation={{
            duration: 250,
            easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
          }}
        >
          {activeActivity && activeActivity.kind === "place" && (
            <div className="pointer-events-none w-[320px] max-w-[90vw]">
              <div
                className="border-2 p-3"
                style={{
                  borderColor: "var(--primary)",
                  backgroundColor: "var(--card)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center"
                    style={{ backgroundColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
                  >
                    <GripVertical className="h-5 w-5" style={{ color: "var(--primary)" }} />
                  </div>
                  <p className="truncate text-sm font-bold" style={{ color: "var(--foreground)" }}>
                    {activeActivity.title}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      )}
    </DndContext>
  );
};
