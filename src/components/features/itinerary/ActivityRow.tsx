"use client";

import { forwardRef, memo } from "react";
import type { Transform } from "@dnd-kit/utilities";
import type { ItineraryActivity } from "@/types/itinerary";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";
import { PlaceActivityRow } from "./PlaceActivityRow";
import { NoteActivityRow } from "./NoteActivityRow";

type ActivityRowProps = {
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
  /** Hide the drag handle (for entry points) */
  hideDragHandle?: boolean;
  isReadOnly?: boolean;
};

export const ActivityRow = memo(forwardRef<HTMLDivElement, ActivityRowProps>(
  (props, ref) => {
    if (props.activity.kind === "note") {
      return <NoteActivityRow ref={ref} {...props} activity={props.activity} isReadOnly={props.isReadOnly} />;
    }
    return (
      <PlaceActivityRow
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
      />
    );
  },
));

ActivityRow.displayName = "ActivityRow";


