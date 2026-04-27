import { Fragment, memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { buildDayLabel, formatCityName } from "@/lib/itinerary/dayLabel";
import type {
  ItineraryActivity,
  ItineraryDay,
} from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { EntryPoint } from "@/types/trip";
import type { ItineraryConflictsResult } from "@/lib/validation/itineraryConflicts";
import { getActivityConflicts } from "@/lib/validation/itineraryConflicts";
import type { DayGuide } from "@/types/itineraryGuide";
import type { Coordinate } from "@/lib/routing/types";
import { getActivityCoordinates } from "@/lib/itineraryCoordinates";
import { featureFlags } from "@/lib/env/featureFlags";
import { computeMealSlotPositions, type MealSlotEntry } from "@/lib/itinerary/mealSlotPositions";
import { DISMISSED_MEAL_SLOTS_PREFIX } from "@/lib/constants/storage";
import { getLocal, setLocal } from "@/lib/storageHelpers";
import { AddActivityButton } from "./AddActivityButton";
import { AddActivitySheet } from "./AddActivitySheet";
import { GuideSegmentCard } from "./GuideSegmentCard";
import { DayBookingCards } from "./DayBookingCards";
import { SortableActivity } from "./SortableActivity";
import { AccommodationBookend } from "./AccommodationBookend";
import { AccommodationPicker } from "./AccommodationPicker";
import { LateArrivalCard } from "./LateArrivalCard";
import { EarlyArrivalCard } from "./EarlyArrivalCard";
import { AvailabilityAlert } from "./AvailabilityAlert";
import { MealSlot } from "./MealSlot";
import {
  trackCustomLocationAdded,
  trackCustomLocationDeleted,
  trackCustomLocationEdited,
} from "@/lib/analytics/customLocations";
import type { useDayAvailability } from "@/hooks/useDayAvailability";

function countFieldsChanged(
  before: Extract<ItineraryActivity, { kind: "place" }>,
  after: Extract<ItineraryActivity, { kind: "place" }>,
): number {
  const fields: Array<keyof Extract<ItineraryActivity, { kind: "place" }>> = [
    "title", "address", "durationMin", "manualStartTime",
    "phone", "website", "notes", "confirmationNumber",
  ];
  let count = 0;
  for (const k of fields) {
    if ((before[k] ?? null) !== (after[k] ?? null)) count++;
  }
  // tags[0] comparison (category)
  if ((before.tags?.[0] ?? null) !== (after.tags?.[0] ?? null)) count++;
  // costEstimate shallow compare
  const beforeCost = before.costEstimate ? `${before.costEstimate.amount}-${before.costEstimate.currency}` : null;
  const afterCost = after.costEstimate ? `${after.costEstimate.amount}-${after.costEstimate.currency}` : null;
  if (beforeCost !== afterCost) count++;
  // coordinates presence (addressless → addressed is a meaningful change)
  if (Boolean(before.coordinates) !== Boolean(after.coordinates)) count++;
  return count;
}

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

type TimelineActivityListProps = {
  day: ItineraryDay;
  dayIndex: number;
  totalDays: number;
  extendedActivities: ItineraryActivity[];
  activeId: string | null;
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string) => void;
  tripStartDate?: string;
  tripId?: string;
  onDelete: (activityId: string) => void;
  onUpdate: (activityId: string, patch: Partial<ItineraryActivity>) => void;
  onReplace?: (activityId: string) => void;
  /** Called when user adds an activity at a specific index (from the inline + button) */
  onAddAtIndex?: (
    activity: Extract<ItineraryActivity, { kind: "place" }>,
    index: number,
    meta: { addressSource: "mapbox" | "google" | "as-is" | "none" },
  ) => void;
  /** Called when user edits a custom activity */
  onEditActivity?: (
    activity: Extract<ItineraryActivity, { kind: "place" }>,
    updated: Extract<ItineraryActivity, { kind: "place" }>,
    meta: { addressSource: "mapbox" | "google" | "as-is" | "none" },
  ) => void;
  conflictsResult?: ItineraryConflictsResult;
  guide?: DayGuide | null;
  isReadOnly?: boolean;
  startLocation?: EntryPoint;
  endLocation?: EntryPoint;
  bookendEstimates: {
    start: { travelMinutes: number; distanceMeters: number } | null;
    end: { travelMinutes: number; distanceMeters: number } | null;
  };
  availabilityIssues: ReturnType<typeof useDayAvailability>;
  onViewDetails?: (location: Location) => void;
  handleAddNote: () => void;
  TravelSegmentWrapper: React.ComponentType<TravelSegmentWrapperProps>;
  /** Accommodation callbacks for rendering picker after arrival anchor */
  onStartLocationChange?: (location: EntryPoint | undefined) => void;
  onEndLocationChange?: (location: EntryPoint | undefined) => void;
  onCityAccommodationChange?: (location: EntryPoint | undefined) => void;
  /** Insert a konbini-meal note at the given index (no API call). */
  onAddKonbini?: (mealType: "breakfast" | "lunch" | "dinner", index: number) => void;
  /** Used to suppress breakfast + dinner slots when meals are included with the stay. */
  accommodationStyle?: "hotel" | "ryokan" | "hostel" | "mix";
};

function getAddPlaceAriaLabel(args: {
  position: "before" | "after";
  neighbor: ItineraryActivity | null | undefined;
  nextNeighbor: ItineraryActivity | null | undefined;
  dayNumber: number;
}): string {
  const { position, neighbor, nextNeighbor, dayNumber } = args;
  const neighborTitle =
    neighbor && neighbor.kind === "place" && typeof neighbor.title === "string"
      ? neighbor.title
      : null;
  const nextTitle =
    nextNeighbor && nextNeighbor.kind === "place" && typeof nextNeighbor.title === "string"
      ? nextNeighbor.title
      : null;

  if (position === "before") {
    if (neighborTitle && nextTitle) {
      return `Add a place between ${neighborTitle} and ${nextTitle}`;
    }
    if (nextTitle) {
      return `Add a place before ${nextTitle}`;
    }
    return `Add a place to day ${dayNumber}`;
  }
  // position === "after"
  return `Add a place at the end of day ${dayNumber}`;
}

export const TimelineActivityList = memo(function TimelineActivityList({
  day,
  dayIndex,
  totalDays,
  extendedActivities,
  activeId,
  selectedActivityId,
  onSelectActivity,
  tripStartDate,
  tripId,
  onDelete,
  onUpdate,
  onReplace,
  onAddAtIndex,
  onEditActivity,
  conflictsResult,
  guide,
  isReadOnly,
  startLocation,
  endLocation,
  bookendEstimates,
  availabilityIssues,
  onViewDetails,
  handleAddNote,
  TravelSegmentWrapper,
  onStartLocationChange,
  onEndLocationChange,
  onCityAccommodationChange,
  onAddKonbini,
  accommodationStyle,
}: TimelineActivityListProps) {
  const [lateArrivalDismissed, setLateArrivalDismissed] = useState(false);
  const [earlyArrivalDismissed, setEarlyArrivalDismissed] = useState(false);
  const [accommodationExpanded, setAccommodationExpanded] = useState(false);

  const dismissalKey = tripId ? `${DISMISSED_MEAL_SLOTS_PREFIX}${tripId}` : null;
  const [dismissedPromptIds, setDismissedPromptIds] = useState<Set<string>>(() => {
    if (!dismissalKey) return new Set();
    const stored = getLocal<string[]>(dismissalKey);
    return stored ? new Set(stored) : new Set();
  });

  useEffect(() => {
    if (!dismissalKey) return;
    setLocal(dismissalKey, [...dismissedPromptIds]);
  }, [dismissedPromptIds, dismissalKey]);

  const dismissMealSlot = useCallback((promptId: string) => {
    setDismissedPromptIds((prev) => {
      const next = new Set(prev);
      next.add(promptId);
      return next;
    });
  }, []);

  const customEnabled = featureFlags.isCustomActivitiesEnabled;
  const [sheetState, setSheetState] = useState<{ index: number } | null>(null);
  const [editing, setEditing] = useState<{
    activity: Extract<ItineraryActivity, { kind: "place" }>;
  } | null>(null);

  const mealSlotsByIndex = useMemo<Map<number, MealSlotEntry>>(() => {
    if (isReadOnly) return new Map();
    return computeMealSlotPositions({
      day,
      dayIndex,
      extendedActivities,
      accommodationStyle,
      dismissedPromptIds,
    });
  }, [day, dayIndex, accommodationStyle, dismissedPromptIds, extendedActivities, isReadOnly]);

  const renderMealSlot = useCallback(
    (entry: MealSlotEntry) => {
      const handleAddSpot = () => setSheetState({ index: entry.insertAtIndex });
      const handleKonbini = entry.hasKonbini && onAddKonbini
        ? () => onAddKonbini(entry.mealType, entry.insertAtIndex)
        : undefined;
      return (
        <li key={`meal-slot-${entry.promptId}`} className="list-none">
          <MealSlot
            mealType={entry.mealType}
            onAddSpot={handleAddSpot}
            onKonbini={handleKonbini}
            onDismiss={() => dismissMealSlot(entry.promptId)}
          />
        </li>
      );
    },
    [dismissMealSlot, onAddKonbini],
  );

  if (extendedActivities.length === 0) {
    return (
      <>
        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center text-stone">
          <p className="text-sm">{isReadOnly ? "No activities planned for this day." : "This day is wide open."}</p>
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleAddNote}
              className="mt-3 text-sm font-medium text-sage hover:text-sage/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              + Add a note
            </button>
          )}
        </div>
        {customEnabled && !isReadOnly && (
          <div className="mt-2">
            <AddActivityButton
              index={0}
              onClick={(i) => setSheetState({ index: i })}
              ariaLabel={`Add a place to day ${dayIndex + 1}`}
            />
          </div>
        )}
        {sheetState && (
          <AddActivitySheet
            open
            onClose={() => setSheetState(null)}
            dayActivities={extendedActivities}
            onSubmit={(activity, meta) => {
              if (onAddAtIndex) {
                onAddAtIndex(activity, sheetState.index, meta);
              }
              if (activity.isCustom) {
                trackCustomLocationAdded({
                  addressSource: meta.addressSource === "none" ? "as-is" : meta.addressSource,
                  hasStartTime: Boolean(activity.manualStartTime),
                  fieldsFilled: [
                    activity.phone,
                    activity.website,
                    activity.costEstimate,
                    activity.notes,
                    activity.confirmationNumber,
                  ].filter(Boolean).length,
                });
              }
              setSheetState(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <SortableContext
        items={extendedActivities.map((activity) => activity.id)}
        strategy={verticalListSortingStrategy}
      >
        <DayBookingCards
          tripStartDate={tripStartDate}
          dayIndex={dayIndex}
          totalDays={totalDays}
        />

        {/*
         * Visually-hidden h2 establishes a semantic level between the page h1
         * (trip name) and activity card h3s. Without it, screen readers see a
         * heading-jump from h1 to h3. Visual hierarchy is unchanged — DaySelector
         * already shows day context above this list.
         */}
        <h2 className="sr-only">
          {buildDayLabel(dayIndex ?? 0, { tripStartDate, cityId: day.cityId })} itinerary
        </h2>
        <ul className="space-y-3">
          {extendedActivities.map((activity, index) => {
            let placeNumber: number | undefined = undefined;
            if (activity.kind === "place" && !activity.isAnchor) {
              let placeCounter = 1;
              for (let i = 0; i < index; i++) {
                const prev = extendedActivities[i];
                if (prev?.kind === "place" && !prev.isAnchor) {
                  placeCounter++;
                }
              }
              placeNumber = placeCounter;
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

            const displayTravelSegment = travelFromPrevious ?? (shouldShowTravelSegment ? {
              mode: "transit" as const,
              durationMinutes: 0,
              distanceMeters: undefined,
              departureTime: undefined,
              arrivalTime: undefined,
              instructions: undefined,
              path: undefined,
            } : null);

            const travelSegmentIndex = extendedActivities.slice(0, index).filter((a, i) => {
              if (a.kind !== "place") return false;
              for (let j = i - 1; j >= 0; j--) {
                if (extendedActivities[j]?.kind === "place") return true;
              }
              return false;
            }).length;

            const travelSegmentElement =
              shouldShowTravelSegment && displayTravelSegment && previousActivity && previousActivity.kind === "place" ? (
                <TravelSegmentWrapper
                  activity={activity as Extract<ItineraryActivity, { kind: "place" }>}
                  previousActivity={previousActivity}
                  travelFromPrevious={displayTravelSegment}
                  originCoordinates={originCoordinates!}
                  destinationCoordinates={destinationCoordinates!}
                  dayTimezone={day.timezone}
                  onUpdate={onUpdate}
                  segmentIndex={travelSegmentIndex}
                />
              ) : undefined;

            const activityConflicts = conflictsResult
              ? getActivityConflicts(conflictsResult, activity.id)
              : [];

            const guideSegmentsAfter = guide?.segments.filter(
              (seg) => seg.afterActivityId === activity.id,
            ) ?? [];

            const rawSegmentsBefore = guide?.segments.filter(
              (seg) => seg.beforeActivityId === activity.id,
            ) ?? [];
            const isAnchor = activity.kind === "place" && activity.isAnchor;
            const guideSegmentsBefore = isAnchor ? [] : rawSegmentsBefore;
            const guideSegmentsAfterAnchor = isAnchor ? rawSegmentsBefore : [];

            const fragmentKey = activity.id;
            const guideBeforeElement = !activeId && guideSegmentsBefore.length > 0 ? (
              <div className="space-y-1">
                {guideSegmentsBefore.map((seg) => (
                  <GuideSegmentCard key={seg.id} segment={seg} />
                ))}
              </div>
            ) : undefined;

            const isDepartureAnchor = activity.kind === "place" && activity.isAnchor && activity.id.startsWith("anchor-departure");

            // Determine whether to show "+" button before this activity.
            // Suppressed during drag, in read-only mode, when feature flag is off,
            // and immediately before/after anchor activities.
            const prevActivity = index > 0 ? extendedActivities[index - 1] : null;
            const prevIsAnchor = prevActivity?.kind === "place" && prevActivity.isAnchor;
            const showAddBefore =
              customEnabled &&
              !isReadOnly &&
              !activeId &&
              !isAnchor &&
              !prevIsAnchor;

            // Show "+" button after the last activity (appended at end of list)
            const isLastActivity = index === extendedActivities.length - 1;
            const showAddAfter =
              customEnabled &&
              !isReadOnly &&
              !activeId &&
              !isAnchor &&
              isLastActivity;

            const mealSlotBefore = !activeId ? mealSlotsByIndex.get(index) : undefined;
            const mealSlotAtEnd = !activeId && isLastActivity
              ? mealSlotsByIndex.get(extendedActivities.length)
              : undefined;

            return (
              <Fragment key={fragmentKey}>
                {/* End accommodation bookend before departure anchor (leave hotel → airport) */}
                {!activeId && isDepartureAnchor && endLocation && (
                  <li className="list-none">
                    <AccommodationBookend
                      location={endLocation}
                      variant="end"
                      travelMinutes={bookendEstimates.end?.travelMinutes}
                      distanceMeters={bookendEstimates.end?.distanceMeters}
                    />
                  </li>
                )}
                {mealSlotBefore && renderMealSlot(mealSlotBefore)}
                {/* Inline "+" button before this activity */}
                {showAddBefore && (
                  <li className="list-none">
                    <AddActivityButton
                      index={index}
                      onClick={(i) => setSheetState({ index: i })}
                      ariaLabel={getAddPlaceAriaLabel({
                        position: "before",
                        neighbor: prevActivity,
                        nextNeighbor: activity,
                        dayNumber: dayIndex + 1,
                      })}
                    />
                  </li>
                )}
                <SortableActivity
                  activity={activity}
                  allActivities={extendedActivities}
                  dayTimezone={day.timezone}
                  onDelete={isReadOnly ? () => {} : () => {
                    if (activity.kind === "place" && activity.isCustom) {
                      trackCustomLocationDeleted({ hadAddress: Boolean(activity.address) });
                    }
                    onDelete(activity.id);
                  }}
                  onUpdate={isReadOnly ? () => {} : (patch) => onUpdate(activity.id, patch)}
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
                  onEditCustom={
                    !isReadOnly
                      ? (act) => setEditing({ activity: act })
                      : undefined
                  }
                />
                {!activeId && guideSegmentsAfter.map((seg) => (
                  <li key={seg.id} className="list-none">
                    <GuideSegmentCard segment={seg} />
                  </li>
                ))}
                {mealSlotAtEnd && renderMealSlot(mealSlotAtEnd)}
                {/* Inline "+" button after the last non-anchor activity */}
                {showAddAfter && (
                  <li className="list-none">
                    <AddActivityButton
                      index={index + 1}
                      onClick={(i) => setSheetState({ index: i })}
                      ariaLabel={getAddPlaceAriaLabel({
                        position: "after",
                        neighbor: activity,
                        nextNeighbor: null,
                        dayNumber: dayIndex + 1,
                      })}
                    />
                  </li>
                )}
                {!activeId && activity.kind === "place" && activity.isAnchor && activity.id.startsWith("anchor-arrival") && (
                  startLocation ? (
                    <li className="list-none">
                      <AccommodationBookend
                        location={startLocation}
                        variant="start"
                        travelMinutes={bookendEstimates.start?.travelMinutes}
                        distanceMeters={bookendEstimates.start?.distanceMeters}
                      />
                    </li>
                  ) : onStartLocationChange && !isReadOnly ? (
                    <li className="list-none">
                      {!accommodationExpanded ? (
                        <button
                          type="button"
                          onClick={() => setAccommodationExpanded(true)}
                          className="flex items-center gap-1.5 text-xs text-stone transition-colors hover:text-foreground"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Add your accommodation to route from
                        </button>
                      ) : (
                        <AccommodationPicker
                          startLocation={startLocation}
                          endLocation={endLocation}
                          cityId={day.cityId}
                          onStartChange={onStartLocationChange}
                          onEndChange={onEndLocationChange ?? (() => {})}
                          onSetCityAccommodation={onCityAccommodationChange}
                          isReadOnly={false}
                        />
                      )}
                    </li>
                  ) : null
                )}
                {!activeId && activity.kind === "place" && activity.isAnchor && activity.id.startsWith("anchor-arrival") && day.isLateArrival && !lateArrivalDismissed && (
                  <li className="list-none mt-3">
                    <LateArrivalCard
                      city={day.cityId ? formatCityName(day.cityId) : "your destination"}
                      onDismiss={() => setLateArrivalDismissed(true)}
                    />
                  </li>
                )}
                {!activeId && activity.kind === "place" && activity.isAnchor && activity.id.startsWith("anchor-arrival") && day.isEarlyArrival && !day.isLateArrival && !earlyArrivalDismissed && (
                  <li className="list-none mt-3">
                    <EarlyArrivalCard
                      city={day.cityId ? formatCityName(day.cityId) : "your destination"}
                      onDismiss={() => setEarlyArrivalDismissed(true)}
                    />
                  </li>
                )}
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

      {/* Add-activity sheet (inline "+" flow) */}
      {sheetState && (
        <AddActivitySheet
          open
          onClose={() => setSheetState(null)}
          dayActivities={extendedActivities}
          onSubmit={(activity, meta) => {
            if (onAddAtIndex) {
              onAddAtIndex(activity, sheetState.index, meta);
            }
            if (activity.isCustom) {
              trackCustomLocationAdded({
                addressSource: meta.addressSource === "none" ? "as-is" : meta.addressSource,
                hasStartTime: Boolean(activity.manualStartTime),
                fieldsFilled: [
                  activity.phone,
                  activity.website,
                  activity.costEstimate,
                  activity.notes,
                  activity.confirmationNumber,
                ].filter(Boolean).length,
              });
            }
            setSheetState(null);
          }}
        />
      )}

      {/* Edit-activity sheet */}
      {editing && (
        <AddActivitySheet
          open
          onClose={() => setEditing(null)}
          dayActivities={extendedActivities}
          initial={editing.activity}
          onSubmit={(updated, meta) => {
            if (onEditActivity) {
              onEditActivity(editing.activity, updated, meta);
            }
            trackCustomLocationEdited({
              addressSource: meta.addressSource === "none" ? "as-is" : meta.addressSource,
              fieldsChanged: countFieldsChanged(editing.activity, updated),
            });
            setEditing(null);
          }}
        />
      )}
    </>
  );
});
