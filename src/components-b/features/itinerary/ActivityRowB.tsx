"use client";

import { forwardRef, memo } from "react";
import type { Transform } from "@dnd-kit/utilities";
import type { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";
import { PlaceActivityRowB } from "./PlaceActivityRowB";
import { NoteActivityRow } from "@/components/features/itinerary/NoteActivityRow";

type ActivityRowBProps = {
  activity: ItineraryActivity;
  allActivities?: ItineraryActivity[];
  dayTimezone?: string;
  onDelete: () => void;
  onUpdate: (patch: Partial<ItineraryActivity>) => void;
  attributes?: Record<string, unknown>;
  listeners?: Record<string, unknown>;
  isDragging?: boolean;
  transform?: Transform | null;
  transition?: string | null;
  isSelected?: boolean;
  onSelect?: (activityId: string) => void;
  onHover?: (activityId: string) => void;
  placeNumber?: number;
  tripId?: string;
  dayId?: string;
  onReplace?: () => void;
  conflicts?: ItineraryConflict[];
  hideDragHandle?: boolean;
  isReadOnly?: boolean;
  activeDragId?: string | null;
  onViewDetails?: (location: Location) => void;
};

export const ActivityRowB = memo(
  forwardRef<HTMLDivElement, ActivityRowBProps>((props, ref) => {
    if (props.activity.kind === "note") {
      return (
        <NoteActivityRow
          ref={ref}
          {...props}
          activity={props.activity}
          isReadOnly={props.isReadOnly}
          activeDragId={props.activeDragId}
        />
      );
    }
    return (
      <PlaceActivityRowB
        ref={ref}
        {...props}
        activity={props.activity}
        allActivities={props.allActivities}
        dayTimezone={props.dayTimezone}
        placeNumber={props.placeNumber}
        tripId={props.tripId}
        dayId={props.dayId}
        onReplace={props.onReplace}
        conflicts={props.conflicts}
        hideDragHandle={props.hideDragHandle}
        isReadOnly={props.isReadOnly}
        activeDragId={props.activeDragId}
        onViewDetails={props.onViewDetails}
      />
    );
  }),
);

ActivityRowB.displayName = "ActivityRowB";
