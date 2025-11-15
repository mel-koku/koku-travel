import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ItineraryActivity } from "@/types/itinerary";
import { ActivityRow } from "./ActivityRow";
import type { ReactNode } from "react";

type SortableActivityProps = {
  activity: ItineraryActivity;
  allActivities?: ItineraryActivity[];
  dayTimezone?: string;
  onDelete: () => void;
  onUpdate: (patch: Partial<ItineraryActivity>) => void;
  isSelected?: boolean;
  onSelect?: (activityId: string) => void;
  placeNumber?: number;
  travelSegment?: ReactNode;
};

export function SortableActivity({
  activity,
  allActivities,
  dayTimezone,
  onDelete,
  onUpdate,
  isSelected,
  onSelect,
  placeNumber,
  travelSegment,
}: SortableActivityProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const dragStyles =
    transform || transition
      ? {
          transform: transform ? CSS.Transform.toString(transform) : undefined,
          transition: transition ?? undefined,
        }
      : undefined;

  return (
    <li ref={setNodeRef} className="space-y-0" style={dragStyles} {...attributes}>
      {travelSegment && (
        <div className="mb-3">
          {travelSegment}
        </div>
      )}
      <ActivityRow
        activity={activity}
        allActivities={allActivities}
        dayTimezone={dayTimezone}
        onDelete={onDelete}
        onUpdate={onUpdate}
        attributes={attributes as unknown as Record<string, unknown>}
        listeners={listeners as unknown as Record<string, unknown>}
        isDragging={isDragging}
        isSelected={isSelected}
        onSelect={onSelect}
        placeNumber={placeNumber}
      />
    </li>
  );
}

