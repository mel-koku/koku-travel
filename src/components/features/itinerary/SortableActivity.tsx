import { useSortable } from "@dnd-kit/sortable";
import type { ItineraryActivity } from "@/types/itinerary";
import { ActivityRow } from "./ActivityRow";

type SortableActivityProps = {
  activity: ItineraryActivity;
  onDelete: () => void;
  onUpdate: (patch: Partial<ItineraryActivity>) => void;
  isSelected?: boolean;
  onSelect?: (activityId: string) => void;
};

export function SortableActivity({
  activity,
  onDelete,
  onUpdate,
  isSelected,
  onSelect,
}: SortableActivityProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  return (
    <ActivityRow
      ref={setNodeRef}
      activity={activity}
      onDelete={onDelete}
      onUpdate={onUpdate}
      attributes={attributes as unknown as Record<string, unknown>}
      listeners={listeners as unknown as Record<string, unknown>}
      isDragging={isDragging}
      transform={transform}
      transition={transition}
      isSelected={isSelected}
      onSelect={onSelect}
      onHover={onSelect}
    />
  );
}

