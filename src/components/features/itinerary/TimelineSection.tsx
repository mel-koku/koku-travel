import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import React, { useState, type ReactNode } from "react";
import type { ItineraryActivity } from "@/types/itinerary";
import type { TimeOfDay } from "./timelineUtils";
import { SECTION_LABELS } from "./timelineUtils";
import { TravelSegment } from "./TravelSegment";
import { getActivityCoordinates } from "@/lib/itineraryCoordinates";
import type { ItineraryTravelMode } from "@/types/itinerary";
import type { RoutingRequest } from "@/lib/routing/types";
import type { Coordinate } from "@/lib/routing/types";

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

  const handleModeChange = async (newMode: ItineraryTravelMode) => {
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
  };

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

type TimelineSectionProps = {
  sectionKey: TimeOfDay;
  activities: ItineraryActivity[];
  allActivities?: ItineraryActivity[];
  dayTimezone?: string;
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string) => void;
  onDelete: (activityId: string) => void;
  onUpdate: (activityId: string, patch: Partial<ItineraryActivity>) => void;
  onAddNote: (timeOfDay: TimeOfDay) => void;
  children: ReactNode;
};

export function TimelineSection({
  sectionKey,
  activities,
  allActivities = [],
  dayTimezone,
  selectedActivityId: _selectedActivityId,
  onSelectActivity: _onSelectActivity,
  onDelete: _onDelete,
  onUpdate,
  onAddNote,
  children,
}: TimelineSectionProps) {
  const { setNodeRef } = useDroppable({ id: sectionKey });
  const meta = SECTION_LABELS[sectionKey];
  const headingId = `${sectionKey}-activities`;
  const hasActivities = activities.length > 0;
  const addNoteLabel = `Add note to ${meta.title}`;

  return (
    <section
      key={sectionKey}
      aria-labelledby={headingId}
      className="space-y-4"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 id={headingId} className="text-lg font-semibold text-foreground">
            {meta.title}
          </h2>
          <p className="text-sm text-stone">{meta.description}</p>
        </div>
        {hasActivities ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-label={addNoteLabel}
              onClick={() => onAddNote(sectionKey)}
              className="text-sage hover:text-sage/80 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              + Add note
            </button>
          </div>
        ) : null}
      </header>
      {activities.length > 0 ? (
        <SortableContext
          id={sectionKey}
          items={activities.map((activity) => activity.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul ref={setNodeRef} className="space-y-3">
            {React.Children.map(children, (child, index) => {
              const activity = activities[index];
              if (!activity) return child;

              // Check if this activity has travelFromPrevious
              const travelFromPrevious =
                activity.kind === "place" ? activity.travelFromPrevious : null;

              // Get previous activity for coordinates (check all activities, not just this section)
              const currentActivityIndex = allActivities.findIndex((a) => a.id === activity.id);
              let previousActivity: ItineraryActivity | null = null;
              if (currentActivityIndex > 0) {
                for (let i = currentActivityIndex - 1; i >= 0; i--) {
                  const prev = allActivities[i];
                  if (prev && prev.kind === "place") {
                    previousActivity = prev;
                    break;
                  }
                }
              }

              const originCoordinates =
                previousActivity && previousActivity.kind === "place"
                  ? getActivityCoordinates(previousActivity)
                  : null;

              const destinationCoordinates =
                activity.kind === "place" ? getActivityCoordinates(activity) : null;

              return (
                <li key={activity.id} className="space-y-0">
                  {/* Travel segment before this activity */}
                  {travelFromPrevious &&
                    originCoordinates &&
                    destinationCoordinates &&
                    activity.kind === "place" &&
                    previousActivity &&
                    previousActivity.kind === "place" && (
                      <div className="mb-3">
                        <TravelSegmentWrapper
                          activity={activity}
                          previousActivity={previousActivity}
                          travelFromPrevious={travelFromPrevious}
                          originCoordinates={originCoordinates}
                          destinationCoordinates={destinationCoordinates}
                          dayTimezone={dayTimezone}
                          onUpdate={onUpdate}
                        />
                      </div>
                    )}
                  {/* Activity card */}
                  {child}
                </li>
              );
            })}
          </ul>
        </SortableContext>
      ) : (
        <SortableContext
          id={sectionKey}
          items={[]}
          strategy={verticalListSortingStrategy}
        >
          <ul ref={setNodeRef} className="space-y-3">
            <li className="rounded-xl border-2 border-dashed border-border p-6 text-stone">
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm">
                  No activities yet for this part of the day.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    aria-label={addNoteLabel}
                    onClick={() => onAddNote(sectionKey)}
                    className="text-sage hover:text-sage/80 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    + Add note
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </SortableContext>
      )}
    </section>
  );
}

