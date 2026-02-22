import { memo } from "react";
import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ItineraryActivity } from "@/types/itinerary";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";
import { ActivityRow } from "./ActivityRow";

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
  guideSegmentsBefore?: ReactNode;
  tripId?: string;
  dayId?: string;
  onReplace?: () => void;
  conflicts?: ItineraryConflict[];
  isReadOnly?: boolean;
};

export const SortableActivity = memo(function SortableActivity({
  activity,
  allActivities,
  dayTimezone,
  onDelete,
  onUpdate,
  isSelected,
  onSelect,
  placeNumber,
  travelSegment,
  guideSegmentsBefore,
  tripId,
  dayId,
  onReplace,
  conflicts,
  isReadOnly,
}: SortableActivityProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    active,
  } = useSortable({ id: activity.id, disabled: isReadOnly });

  // Show drop indicator when something else is being dragged over this item
  const showDropIndicator = isOver && active?.id !== activity.id;

  const dragStyles =
    transform || transition
      ? {
          transform: transform ? CSS.Transform.toString(transform) : undefined,
          transition: transition ?? undefined,
        }
      : undefined;

  return (
    <li ref={setNodeRef} className="relative space-y-0" style={dragStyles} {...attributes}>
      {/* Drop indicator line */}
      {showDropIndicator && (
        <div className="absolute -top-1.5 left-0 right-0 z-10 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-brand-primary" />
          <div className="h-0.5 flex-1 rounded-full bg-brand-primary" />
          <div className="h-1 w-1 rounded-full bg-brand-primary" />
        </div>
      )}
      {travelSegment && !isDragging && (
        <div className="mb-3">
          {travelSegment}
        </div>
      )}
      {guideSegmentsBefore && !isDragging && (
        <div className="mb-3">
          {guideSegmentsBefore}
        </div>
      )}
      {/* Show ghost placeholder when dragging */}
      {isDragging ? (
        <div className="rounded-2xl border-2 border-dashed border-sage/40 bg-sage/5 p-4 transition-all">
          <div className="flex items-center gap-2 text-sage/60">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span className="text-sm font-medium">Drop here to reorder</span>
          </div>
        </div>
      ) : (
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
          tripId={tripId}
          dayId={dayId}
          onReplace={onReplace}
          conflicts={conflicts}
          isReadOnly={isReadOnly}
        />
      )}
    </li>
  );
});
