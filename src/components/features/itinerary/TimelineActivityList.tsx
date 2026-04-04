import { Fragment, memo, useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
import { GuideSegmentCard } from "./GuideSegmentCard";
import { DayBookingCards } from "./DayBookingCards";
import { SortableActivity } from "./SortableActivity";
import { AccommodationBookend } from "./AccommodationBookend";
import { AccommodationPicker } from "./AccommodationPicker";
import { LateArrivalCard } from "./LateArrivalCard";
import { AvailabilityAlert } from "./AvailabilityAlert";
import type { useDayAvailability } from "@/hooks/useDayAvailability";

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
};

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
}: TimelineActivityListProps) {
  const [lateArrivalDismissed, setLateArrivalDismissed] = useState(false);
  const [accommodationExpanded, setAccommodationExpanded] = useState(false);

  if (extendedActivities.length === 0) {
    return (
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

            return (
              <Fragment key={fragmentKey}>
                <SortableActivity
                  activity={activity}
                  allActivities={extendedActivities}
                  dayTimezone={day.timezone}
                  onDelete={isReadOnly ? () => {} : () => onDelete(activity.id)}
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
                />
                {!activeId && guideSegmentsAfter.map((seg) => (
                  <li key={seg.id} className="list-none">
                    <GuideSegmentCard segment={seg} />
                  </li>
                ))}
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
                      city={day.cityId ?? "your destination"}
                      onDismiss={() => setLateArrivalDismissed(true)}
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
    </>
  );
});
