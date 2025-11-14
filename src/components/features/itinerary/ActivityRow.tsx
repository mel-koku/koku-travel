"use client";

import { forwardRef } from "react";
import type { Transform } from "@dnd-kit/utilities";
import type { ItineraryActivity } from "@/types/itinerary";
import { PlaceActivityRow } from "./PlaceActivityRow";
import { NoteActivityRow } from "./NoteActivityRow";

type ActivityRowProps = {
  activity: ItineraryActivity;
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
};

export const ActivityRow = forwardRef<HTMLLIElement, ActivityRowProps>(
  (props, ref) => {
    if (props.activity.kind === "note") {
      return <NoteActivityRow ref={ref} {...props} activity={props.activity} />;
    }
    return <PlaceActivityRow ref={ref} {...props} activity={props.activity} />;
  },
);

ActivityRow.displayName = "ActivityRow";


