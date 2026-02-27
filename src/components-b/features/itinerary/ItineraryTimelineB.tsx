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
import { ChevronDown, GripVertical, Lightbulb } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
import { GuideSegmentCardB, DayGuideCard } from "./GuideSegmentCardB";
import { SmartPromptCardB } from "./SmartPromptCardB";
import { TravelSegmentB } from "./TravelSegmentB";
import { AccommodationBookendB } from "./AccommodationBookendB";
import { SortableActivityB } from "./SortableActivityB";
import { DayHeaderB } from "./DayHeaderB";
import { DayTipsB } from "./DayTipsB";
import { DayConflictSummaryB } from "./ConflictBadgeB";
import { WhatsNextCardB } from "./WhatsNextCardB";
import { TodayIndicatorB } from "./TodayIndicatorB";
import { DayRefinementButtonsB } from "./DayRefinementButtonsB";
import { AccommodationPickerB } from "./AccommodationPickerB";
import { AvailabilityAlertB } from "./AvailabilityAlertB";
import { useDayAvailability } from "@/hooks/useDayAvailability";
import { getActivityCoordinates } from "@/lib/itineraryCoordinates";
import { estimateHeuristicRoute } from "@/lib/routing/heuristic";
import { REGIONS } from "@/data/regions";
import { useToast } from "@/context/ToastContext";
import type { RoutingRequest, Coordinate } from "@/lib/routing/types";

function formatCityName(cityId: string): string {
  for (const region of REGIONS) {
    const city = region.cities.find((c) => c.id === cityId);
    if (city) return city.name;
  }
  return cityId.charAt(0).toUpperCase() + cityId.slice(1);
}

/* ── Suggestions accordion ── */
function SuggestionsAccordion({
  suggestions,
  onAccept,
  onSkip,
  loadingSuggestionId,
}: {
  suggestions: DetectedGap[];
  onAccept: (gap: DetectedGap) => void;
  onSkip: (gap: DetectedGap) => void;
  loadingSuggestionId?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="mb-3 overflow-hidden rounded-2xl"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[var(--surface)]"
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <Lightbulb
            className="h-3.5 w-3.5"
            style={{ color: "var(--primary)" }}
          />
        </div>
        <span
          className="flex-1 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Suggestions
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "var(--primary)",
          }}
        >
          {suggestions.length}
        </span>
        <ChevronDown
          className="h-4 w-4 transition-transform duration-200"
          style={{
            color: "var(--muted-foreground)",
            transform: open ? "rotate(180deg)" : undefined,
          }}
        />
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div>
              {suggestions.map((gap) => (
                <SmartPromptCardB
                  key={gap.id}
                  gap={gap}
                  onAccept={onAccept}
                  onSkip={onSkip}
                  isLoading={loadingSuggestionId === gap.id}
                  flat
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type ItineraryTimelineBProps = {
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
  onCityAccommodationChange?: (location: EntryPoint | undefined) => void;
  onViewDetails?: (location: Location) => void;
};

export const ItineraryTimelineB = ({
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
  conflicts: _conflicts,
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
}: ItineraryTimelineBProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const { showToast: _showToast } = useToast();
  const availabilityIssues = useDayAvailability(day, dayIndex, tripStartDate);

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

  // Activities
  const extendedActivities = useMemo(() => {
    return day.activities ?? [];
  }, [day.activities]);

  // ── Handlers ──

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
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
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

  const handleRefineDay = useCallback(
    (refinedDay: ItineraryDay) => {
      setModel((current) => ({
        ...current,
        days: current.days.map((d, i) => (i === dayIndex ? refinedDay : d)),
      }));
    },
    [dayIndex, setModel],
  );

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

  const handleDelayRemaining = useCallback(
    (delayMinutes: number) => {
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
          .filter(
            (x): x is { a: Extract<ItineraryActivity, { kind: "place" }>; i: number } =>
              x.a.kind === "place",
          );

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
          if (j === placeActs.length - 1) startIdx = 0;
        }

        let shifted = 0;
        const nextActivities = [...activities];

        for (let j = startIdx; j < placeActs.length; j++) {
          const { a: act, i: actIndex } = placeActs[j]!;
          const baseTime = act.manualStartTime ?? act.schedule?.arrivalTime;
          if (!baseTime) continue;
          const parsed = parseTime(baseTime);
          if (parsed === null) continue;

          const newStart = formatTime(parsed + delayMinutes);
          let newDep = act.schedule?.departureTime;
          if (newDep) {
            const depParsed = parseTime(newDep);
            if (depParsed !== null) newDep = formatTime(depParsed + delayMinutes);
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
    },
    [dayIndex, setModel],
  );

  // ── Travel recalculation ──

  const recalculateTravelSegment = useCallback(
    async (
      fromActivity: Extract<ItineraryActivity, { kind: "place" }>,
      toActivity: Extract<ItineraryActivity, { kind: "place" }>,
      currentTravelSegment: NonNullable<
        Extract<ItineraryActivity, { kind: "place" }>["travelFromPrevious"]
      >,
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
          durationMinutes:
            routeData.durationMinutes ??
            currentTravelSegment.durationMinutes,
          distanceMeters:
            routeData.distanceMeters ??
            currentTravelSegment.distanceMeters,
          path: routeData.path ?? currentTravelSegment.path,
          instructions:
            routeData.instructions ?? currentTravelSegment.instructions,
          arrivalTime:
            routeData.arrivalTime ?? currentTravelSegment.arrivalTime,
        };
      } catch {
        return null;
      }
    },
    [],
  );

  // ── DnD handlers ──

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
      let movedActivity: ItineraryActivity | null =
        null as ItineraryActivity | null;
      let activityIdsForReorder: string[] | null = null;
      let reorderedItinerary: Itinerary | null = null;

      flushSync(() => {
        setModel((current) => {
          let hasChanged = false;
          const nextDays = current.days.map((entry, index) => {
            if (index !== dayIndex) return entry;
            const currentActivities = [...(entry.activities ?? [])];
            const activeIndex = currentActivities.findIndex(
              (a) => a.id === dragActiveId,
            );
            if (activeIndex === -1) return entry;

            const movingActivity = currentActivities[activeIndex];
            if (!movingActivity) return entry;

            movedActivity = movingActivity;
            oldIndex = activeIndex;

            const updatedList = [...currentActivities];
            updatedList.splice(activeIndex, 1);

            const overIndex = updatedList.findIndex(
              (a) => a.id === overId,
            );
            const destinationIndex =
              overIndex >= 0 ? overIndex : updatedList.length;
            newIndex = Math.min(destinationIndex, updatedList.length);

            updatedList.splice(newIndex, 0, movingActivity);
            hasChanged = true;

            if (hasChanged && tripId && day.id && onReorder) {
              activityIdsForReorder = updatedList.map((a) => a.id);
            }
            return { ...entry, activities: updatedList };
          });

          const result = hasChanged
            ? { ...current, days: nextDays }
            : current;
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

      // Recalculate affected travel segments
      if (
        movedActivity &&
        movedActivity.kind === "place" &&
        oldIndex !== -1 &&
        newIndex !== -1
      ) {
        const capturedActivity = movedActivity as Extract<
          ItineraryActivity,
          { kind: "place" }
        >;

        const activitiesToUpdate: Array<{
          activityId: string;
          previousActivity: Extract<ItineraryActivity, { kind: "place" }>;
          currentActivity: Extract<ItineraryActivity, { kind: "place" }>;
          currentTravelSegment: NonNullable<
            Extract<
              ItineraryActivity,
              { kind: "place" }
            >["travelFromPrevious"]
          >;
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
          const movedIndex = activities.findIndex(
            (a) => a.id === capturedActivity.id,
          );
          if (movedIndex === -1) return current;

          // Travel TO the moved activity
          if (movedIndex > 0) {
            for (let i = movedIndex - 1; i >= 0; i--) {
              const prev = activities[i];
              const moved = activities[movedIndex];
              if (
                prev &&
                prev.kind === "place" &&
                moved &&
                moved.kind === "place"
              ) {
                activitiesToUpdate.push({
                  activityId: capturedActivity.id,
                  previousActivity: prev,
                  currentActivity: moved,
                  currentTravelSegment:
                    moved.travelFromPrevious ?? defaultSegment,
                });
                break;
              }
            }
          }

          // Travel FROM the moved activity
          if (movedIndex < activities.length - 1) {
            for (let i = movedIndex + 1; i < activities.length; i++) {
              const next = activities[i];
              if (next && next.kind === "place") {
                activitiesToUpdate.push({
                  activityId: next.id,
                  previousActivity: capturedActivity,
                  currentActivity: next,
                  currentTravelSegment:
                    next.travelFromPrevious ?? defaultSegment,
                });
                break;
              }
            }
          }

          // Travel for activity that was previously after moved
          if (
            oldIndex < activities.length - 1 &&
            oldIndex !== movedIndex
          ) {
            const activityAfterOld = activities[oldIndex];
            if (activityAfterOld && activityAfterOld.kind === "place") {
              for (let j = oldIndex - 1; j >= 0; j--) {
                const prev = activities[j];
                if (prev && prev.kind === "place") {
                  activitiesToUpdate.push({
                    activityId: activityAfterOld.id,
                    previousActivity: prev,
                    currentActivity: activityAfterOld,
                    currentTravelSegment:
                      activityAfterOld.travelFromPrevious ?? defaultSegment,
                  });
                  break;
                }
              }
            }
          }

          return current;
        });

        if (activitiesToUpdate.length > 0) {
          Promise.all(
            activitiesToUpdate.map(
              async ({
                activityId,
                previousActivity,
                currentActivity,
                currentTravelSegment,
              }) => {
                const updatedSegment = await recalculateTravelSegment(
                  previousActivity,
                  currentActivity,
                  currentTravelSegment,
                  dayTimezone,
                );
                return updatedSegment
                  ? { activityId, segment: updatedSegment }
                  : null;
              },
            ),
          )
            .then((results) => {
              if (!isMountedRef.current) return;
              const updates = results.filter(
                (
                  r,
                ): r is {
                  activityId: string;
                  segment: NonNullable<typeof r> extends { segment: infer S }
                    ? S
                    : never;
                } => r !== null,
              );
              if (updates.length === 0) return;

              setModel((prev) => {
                const updatedDays = prev.days.map((d, idx) => {
                  if (idx !== dayIndex) return d;
                  return {
                    ...d,
                    activities: d.activities.map((a) => {
                      const update = updates.find(
                        (u) => u.activityId === a.id,
                      );
                      if (update && a.kind === "place") {
                        return {
                          ...a,
                          travelFromPrevious: update.segment,
                        };
                      }
                      return a;
                    }),
                  };
                });
                return { ...prev, days: updatedDays };
              });
            })
            .catch((error) => {
              // eslint-disable-next-line no-console
              console.warn(
                "[ItineraryTimelineB] Failed to recalculate travel segments:",
                error,
              );
            });
        }
      }
    },
    [
      dayIndex,
      setModel,
      recalculateTravelSegment,
      tripId,
      onReorder,
      day,
      onBeforeDragReorder,
      onAfterDragReorder,
    ],
  );

  // ── Accommodation bookend travel estimates ──
  const bookendEstimates = useMemo(() => {
    const placeActivities = extendedActivities.filter(
      (a): a is Extract<ItineraryActivity, { kind: "place" }> =>
        a.kind === "place",
    );
    if (placeActivities.length === 0) return { start: null, end: null };

    let startEstimate: {
      travelMinutes: number;
      distanceMeters: number;
    } | null = null;
    let endEstimate: {
      travelMinutes: number;
      distanceMeters: number;
    } | null = null;

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
          travelMinutes: Math.max(
            1,
            Math.round(heuristic.durationSeconds / 60),
          ),
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
          travelMinutes: Math.max(
            1,
            Math.round(heuristic.durationSeconds / 60),
          ),
          distanceMeters: heuristic.distanceMeters,
        };
      }
    }

    return { start: startEstimate, end: endEstimate };
  }, [extendedActivities, startLocation, endLocation]);

  // Active drag activity for DragOverlay
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
      <div ref={timelineRef} className="space-y-5">
        {/* Day Header */}
        <DayHeaderB
          day={day}
          dayIndex={dayIndex}
          tripStartDate={tripStartDate}
          onDayStartTimeChange={isReadOnly ? undefined : handleDayStartTimeChange}
          refinementSlot={
            !isReadOnly && !activeId && tripId ? (
              <DayRefinementButtonsB
                dayIndex={dayIndex}
                tripId={tripId}
                builderData={tripBuilderData}
                itinerary={model}
                onRefine={handleRefineDay}
              />
            ) : undefined
          }
          preAccommodationSlot={
            !activeId && extendedActivities.length > 0 ? (
              <>
                <DayTipsB
                  day={day}
                  tripStartDate={tripStartDate}
                  dayIndex={dayIndex}
                />
                {suggestions &&
                  suggestions.length > 0 &&
                  onAcceptSuggestion &&
                  onSkipSuggestion && (
                    <SuggestionsAccordion
                      suggestions={suggestions}
                      onAccept={onAcceptSuggestion}
                      onSkip={onSkipSuggestion}
                      loadingSuggestionId={loadingSuggestionId}
                    />
                  )}
              </>
            ) : undefined
          }
          accommodationSlot={
            !activeId && (onStartLocationChange || startLocation || endLocation) ? (
              <AccommodationPickerB
                startLocation={startLocation}
                endLocation={endLocation}
                cityId={day.cityId}
                onStartChange={onStartLocationChange ?? (() => {})}
                onEndChange={onEndLocationChange ?? (() => {})}
                onSetCityAccommodation={onCityAccommodationChange}
                isReadOnly={!onStartLocationChange}
              />
            ) : undefined
          }
        />

        {/* City Transition */}
        {day.cityTransition && (
          <div
            className="rounded-2xl border-2 border-dashed p-4"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
              backgroundColor:
                "color-mix(in srgb, var(--primary) 5%, transparent)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--primary) 10%, transparent)",
                }}
              >
                <svg
                  className="h-4 w-4"
                  style={{ color: "var(--primary)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4
                  className="text-sm font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  Traveling from{" "}
                  {formatCityName(day.cityTransition.fromCityId)} to{" "}
                  {formatCityName(day.cityTransition.toCityId)}
                </h4>
                <div
                  className="mt-1 space-y-1 text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Mode:</span>
                    <span className="capitalize">
                      {day.cityTransition.mode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Duration:</span>
                    <span>
                      {day.cityTransition.durationMinutes} minute
                      {day.cityTransition.durationMinutes !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {day.cityTransition.departureTime &&
                    day.cityTransition.arrivalTime && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Time:</span>
                        <span>
                          {day.cityTransition.departureTime} &rarr;{" "}
                          {day.cityTransition.arrivalTime}
                        </span>
                      </div>
                    )}
                  {day.cityTransition.notes && (
                    <p className="text-xs" style={{ color: "var(--primary)" }}>
                      {day.cityTransition.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity list */}
        {extendedActivities.length > 0 ? (
          <>
            {/* What's Next card (only shows for today) */}
            {tripStartDate && !activeId && (
              <WhatsNextCardB
                day={day}
                tripStartDate={tripStartDate}
                dayIndex={dayIndex}
                onActivityClick={onSelectActivity}
                onDelayRemaining={isReadOnly ? undefined : handleDelayRemaining}
                className="mb-3"
              />
            )}

            {/* Today indicator (only shows for today) */}
            {tripStartDate && !activeId && (
              <TodayIndicatorB
                tripStartDate={tripStartDate}
                dayIndex={dayIndex}
                className="mb-2"
              />
            )}

            <SortableContext
              items={extendedActivities.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              {/* Guide: Combined day intro + pre-first-activity segments */}
              {guide && !activeId && (() => {
                const firstActivityId = extendedActivities[0]?.id;
                const preSegments = firstActivityId
                  ? guide.segments.filter((seg) => seg.beforeActivityId === firstActivityId)
                  : [];
                const allPreSegments = [
                  ...(guide.intro ? [guide.intro] : []),
                  ...preSegments,
                ];
                if (allPreSegments.length === 0) return null;
                return (
                  <DayGuideCard segments={allPreSegments} className="mb-3" />
                );
              })()}

              {/* Accommodation: Start bookend + travel to first activity */}
              {startLocation && !activeId && (() => {
                const firstPlaceActivity = extendedActivities.find(
                  (a): a is Extract<ItineraryActivity, { kind: "place" }> =>
                    a.kind === "place",
                );
                const firstCoords = firstPlaceActivity
                  ? getActivityCoordinates(firstPlaceActivity)
                  : null;

                return (
                  <div className="mb-3 space-y-1 pl-8">
                    <AccommodationBookendB
                      location={startLocation}
                      variant="start"
                    />
                    {startLocation.coordinates &&
                      firstCoords &&
                      bookendEstimates.start && (
                        <AccommodationTravelSegment
                          origin={startLocation.coordinates}
                          destination={firstCoords}
                          originName={startLocation.name}
                          destinationName={
                            firstPlaceActivity?.title ?? "first stop"
                          }
                          estimate={bookendEstimates.start}
                          timezone={day.timezone}
                        />
                      )}
                  </div>
                );
              })()}

              <ul className="space-y-3 pl-8">
                {extendedActivities.map((activity, index) => {
                  const isFirstActivity = index === 0;
                  // Calculate place number
                  let placeNumber: number | undefined = undefined;
                  if (activity.kind === "place") {
                    let counter = 1;
                    for (let i = 0; i < index; i++) {
                      if (extendedActivities[i]?.kind === "place") counter++;
                    }
                    placeNumber = counter;
                  }

                  // Get previous place for travel segment
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
                    activity.kind === "place"
                      ? getActivityCoordinates(activity)
                      : null;
                  const travelFromPrevious =
                    activity.kind === "place"
                      ? activity.travelFromPrevious
                      : null;

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
                    shouldShowTravelSegment &&
                    displayTravelSegment &&
                    previousActivity &&
                    previousActivity.kind === "place" ? (
                      <TravelSegmentWrapper
                        activity={
                          activity as Extract<
                            ItineraryActivity,
                            { kind: "place" }
                          >
                        }
                        previousActivity={previousActivity}
                        travelFromPrevious={displayTravelSegment}
                        originCoordinates={originCoordinates!}
                        destinationCoordinates={destinationCoordinates!}
                        dayTimezone={day.timezone}
                        onUpdate={handleUpdate}
                      />
                    ) : undefined;

                  // Conflicts
                  const activityConflicts = conflictsResult
                    ? getActivityConflicts(conflictsResult, activity.id)
                    : [];

                  // Guide segments
                  const guideSegmentsAfter =
                    guide?.segments.filter(
                      (seg) => seg.afterActivityId === activity.id,
                    ) ?? [];
                  const guideSegmentsBefore =
                    guide?.segments.filter(
                      (seg) => seg.beforeActivityId === activity.id,
                    ) ?? [];

                  // Skip before-segments for the first activity (already in combined DayGuideCard)
                  const guideBeforeElement =
                    !activeId && !isFirstActivity && guideSegmentsBefore.length > 0 ? (
                      <div className="space-y-2">
                        {guideSegmentsBefore.map((seg) => (
                          <GuideSegmentCardB key={seg.id} segment={seg} />
                        ))}
                      </div>
                    ) : undefined;

                  return (
                    <Fragment key={activity.id}>
                      <SortableActivityB
                        activity={activity}
                        allActivities={extendedActivities}
                        dayTimezone={day.timezone}
                        onDelete={
                          isReadOnly
                            ? () => {}
                            : () => handleDelete(activity.id)
                        }
                        onUpdate={
                          isReadOnly
                            ? () => {}
                            : (patch) =>
                                handleUpdate(activity.id, patch)
                        }
                        isSelected={activity.id === selectedActivityId}
                        onSelect={onSelectActivity}
                        placeNumber={placeNumber}
                        travelSegment={travelSegmentElement}
                        guideSegmentsBefore={guideBeforeElement}
                        tripId={tripId}
                        dayId={day.id}
                        onReplace={
                          !isReadOnly && onReplace
                            ? () => onReplace(activity.id)
                            : undefined
                        }
                        conflicts={activityConflicts}
                        isReadOnly={isReadOnly}
                        activeDragId={activeId}
                        onViewDetails={onViewDetails}
                      />
                      {/* Guide segments after */}
                      {!activeId &&
                        guideSegmentsAfter.map((seg) => (
                          <li key={seg.id} className="list-none">
                            <GuideSegmentCardB segment={seg} />
                          </li>
                        ))}
                    </Fragment>
                  );
                })}
              </ul>


              {/* Guide: Day Summary */}
              {guide?.summary && !activeId && (
                <GuideSegmentCardB
                  segment={guide.summary}
                  className="mt-3"
                />
              )}
            </SortableContext>

            {/* Day Conflict Summary */}
            {!activeId && conflictsResult && (
              <DayConflictSummaryB
                dayConflicts={getDayConflicts(conflictsResult, day.id)}
                className="mt-3"
              />
            )}

            {/* Availability Alert */}
            {!activeId && availabilityIssues && availabilityIssues.summary.total > 0 && (
              <AvailabilityAlertB
                issues={availabilityIssues}
                onFindAlternative={
                  !isReadOnly && onReplace
                    ? (activityId) => onReplace(activityId)
                    : undefined
                }
                className="mt-3"
              />
            )}

            {/* Accommodation: End bookend with travel from last activity */}
            {endLocation && !activeId && (() => {
              const lastPlaceActivity = [...extendedActivities]
                .reverse()
                .find(
                  (a): a is Extract<ItineraryActivity, { kind: "place" }> =>
                    a.kind === "place",
                );
              const lastCoords = lastPlaceActivity
                ? getActivityCoordinates(lastPlaceActivity)
                : null;

              return (
                <div className="mt-3 space-y-1 pl-8">
                  {endLocation.coordinates &&
                    lastCoords &&
                    bookendEstimates.end && (
                      <AccommodationTravelSegment
                        origin={lastCoords}
                        destination={endLocation.coordinates}
                        originName={
                          lastPlaceActivity?.title ?? "last stop"
                        }
                        destinationName={endLocation.name}
                        estimate={bookendEstimates.end}
                        timezone={day.timezone}
                      />
                    )}
                  <AccommodationBookendB
                    location={endLocation}
                    variant="end"
                  />
                </div>
              );
            })()}
          </>
        ) : (
          <div
            className="rounded-2xl border-2 border-dashed p-6 text-center"
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
                className="mt-3 text-sm font-medium transition-colors hover:opacity-80"
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
                className="rounded-2xl border-2 p-3"
                style={{
                  borderColor: "var(--primary)",
                  backgroundColor: "var(--card)",
                  boxShadow: "var(--shadow-elevated)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--primary) 10%, transparent)",
                    }}
                  >
                    <GripVertical
                      className="h-5 w-5"
                      style={{ color: "var(--primary)" }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {activeActivity.title}
                    </p>
                    <div className="flex items-center gap-2">
                      {activeActivity.schedule?.arrivalTime && (
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--primary)" }}
                        >
                          {activeActivity.schedule.arrivalTime}
                        </span>
                      )}
                      {activeActivity.neighborhood && (
                        <span
                          className="truncate text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {activeActivity.neighborhood}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--primary) 10%, transparent)",
                      color: "var(--primary)",
                    }}
                  >
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
};

// ── TravelSegmentWrapper ──

import { memo } from "react";

type TravelSegmentWrapperProps = {
  activity: Extract<ItineraryActivity, { kind: "place" }>;
  previousActivity: Extract<ItineraryActivity, { kind: "place" }>;
  travelFromPrevious: NonNullable<
    Extract<ItineraryActivity, { kind: "place" }>["travelFromPrevious"]
  >;
  originCoordinates: Coordinate;
  destinationCoordinates: Coordinate;
  dayTimezone?: string;
  onUpdate: (
    activityId: string,
    patch: Partial<ItineraryActivity>,
  ) => void;
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

  const handleModeChange = useCallback(
    async (newMode: ItineraryTravelMode) => {
      if (!originCoordinates || !destinationCoordinates) return;

      const validModes: ItineraryTravelMode[] = [
        "walk",
        "car",
        "taxi",
        "bus",
        "train",
        "subway",
        "transit",
        "bicycle",
      ];
      if (!validModes.includes(newMode)) return;

      setIsRecalculatingRoute(true);
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
            durationMinutes:
              routeData.durationMinutes ??
              travelFromPrevious.durationMinutes,
            distanceMeters:
              routeData.distanceMeters ??
              travelFromPrevious.distanceMeters,
            path: routeData.path ?? travelFromPrevious.path,
            instructions:
              routeData.instructions ?? travelFromPrevious.instructions,
            arrivalTime:
              routeData.arrivalTime ?? travelFromPrevious.arrivalTime,
            isEstimated: routeData.isEstimated ?? false,
          },
        });
      } catch {
        onUpdate(activity.id, {
          travelFromPrevious: {
            ...travelFromPrevious,
            mode: newMode,
          },
        });
      } finally {
        setIsRecalculatingRoute(false);
      }
    },
    [
      activity.id,
      originCoordinates,
      destinationCoordinates,
      travelFromPrevious,
      dayTimezone,
      onUpdate,
    ],
  );

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
        // eslint-disable-next-line no-console
        console.warn(
          "[TravelSegmentWrapper] Failed to auto-fetch route:",
          error,
        );
      });
    }
  }, [
    hasAutoFetched,
    isRecalculatingRoute,
    travelFromPrevious.durationMinutes,
    travelFromPrevious.mode,
    originCoordinates,
    destinationCoordinates,
    handleModeChange,
  ]);

  return (
    <TravelSegmentB
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

// ── AccommodationTravelSegment ──

type AccommodationTravelSegmentProps = {
  origin: Coordinate;
  destination: Coordinate;
  originName: string;
  destinationName: string;
  estimate: { travelMinutes: number; distanceMeters: number };
  timezone?: string;
};

const AccommodationTravelSegment = memo(
  function AccommodationTravelSegment({
    origin,
    destination,
    originName,
    destinationName,
    estimate,
    timezone,
  }: AccommodationTravelSegmentProps) {
    const initialMode =
      (estimate.travelMinutes <= 10 ? "walk" : "transit") as ItineraryTravelMode;

    const [segment, setSegment] = useState<{
      mode: ItineraryTravelMode;
      durationMinutes: number;
      distanceMeters: number | undefined;
      departureTime: string | undefined;
      arrivalTime: string | undefined;
      instructions: string[] | undefined;
      path: Array<{ lat: number; lng: number }> | undefined;
      isEstimated: boolean;
    }>({
      mode: initialMode,
      durationMinutes: estimate.travelMinutes,
      distanceMeters: estimate.distanceMeters,
      departureTime: undefined as string | undefined,
      arrivalTime: undefined as string | undefined,
      instructions: undefined as string[] | undefined,
      path: undefined as Array<{ lat: number; lng: number }> | undefined,
      isEstimated: true,
    });
    const [isRecalculating, setIsRecalculating] = useState(false);

    const handleModeChange = useCallback(
      async (newMode: ItineraryTravelMode) => {
        setIsRecalculating(true);
        try {
          const request: RoutingRequest = {
            origin,
            destination,
            mode: newMode,
            timezone,
          };
          const response = await fetch("/api/routing/route", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const routeData = await response.json();
          setSegment((prev) => ({
            ...prev,
            mode: newMode,
            durationMinutes:
              routeData.durationMinutes ?? prev.durationMinutes,
            distanceMeters:
              routeData.distanceMeters ?? prev.distanceMeters,
            path: routeData.path ?? prev.path,
            instructions:
              routeData.instructions ?? prev.instructions,
            arrivalTime:
              routeData.arrivalTime ?? prev.arrivalTime,
            isEstimated: routeData.isEstimated ?? false,
          }));
        } catch {
          setSegment((prev) => ({ ...prev, mode: newMode }));
        } finally {
          setIsRecalculating(false);
        }
      },
      [origin, destination, timezone],
    );

    return (
      <TravelSegmentB
        segment={segment}
        origin={origin}
        destination={destination}
        originName={originName}
        destinationName={destinationName}
        timezone={timezone}
        onModeChange={handleModeChange}
        isRecalculating={isRecalculating}
      />
    );
  },
);
