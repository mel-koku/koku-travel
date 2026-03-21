"use client";

import { memo } from "react";
import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";
import { PlaceActivityRowC } from "./PlaceActivityRowC";
import { NoteActivityRowC } from "./NoteActivityRowC";

type SortableActivityCProps = {
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
  activeDragId?: string | null;
  onViewDetails?: (location: Location) => void;
  tripStartDate?: string;
  dayIndex?: number;
};

export const SortableActivityC = memo(function SortableActivityC({
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
  activeDragId,
  onViewDetails,
  tripStartDate,
  dayIndex: _dayIndex,
}: SortableActivityCProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    active,
  } = useSortable({ id: activity.id, disabled: isReadOnly || (activity.kind === "place" && activity.isAnchor) });

  const showDropIndicator = isOver && active?.id !== activity.id;

  const dragStyles =
    transform || transition
      ? {
          transform: transform ? CSS.Transform.toString(transform) : undefined,
          transition: transition ?? undefined,
        }
      : undefined;

  return (
    <li
      ref={setNodeRef}
      className="group/sortable relative list-none space-y-0"
      style={dragStyles}
      {...attributes}
    >
      {/* Drop indicator */}
      {showDropIndicator && (
        <div className="absolute -top-1 left-0 right-0 z-10 flex items-center gap-2">
          <div className="h-[2px] flex-1" style={{ backgroundColor: "var(--primary)" }} />
        </div>
      )}

      {/* Travel segment above */}
      {travelSegment && !isDragging && !activeDragId && (
        <div>{travelSegment}</div>
      )}

      {/* Guide segments before */}
      {guideSegmentsBefore && !isDragging && !activeDragId && (
        <div className="mb-0">{guideSegmentsBefore}</div>
      )}

      {/* Drag placeholder or activity card */}
      {isDragging ? (
        <div
          className="border-2 border-dashed p-4 transition-all"
          style={{
            borderColor: "var(--primary)",
            backgroundColor: "color-mix(in srgb, var(--primary) 5%, transparent)",
          }}
        >
          <div
            className="flex items-center gap-2"
            style={{ color: "var(--primary)", opacity: 0.6 }}
          >
            <GripVertical className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.1em]">Drop here to reorder</span>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Drag handle */}
          {!isReadOnly && !(activity.kind === "place" && activity.isAnchor) && (
            <div
              className="absolute -left-7 top-1/2 z-10 -translate-y-1/2"
              {...(listeners as Record<string, unknown>)}
            >
              <button
                type="button"
                className="flex h-8 w-6 cursor-grab items-center justify-center transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] active:cursor-grabbing"
                aria-label={`Drag to reorder ${activity.kind === "place" ? activity.title : "note"}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <GripVertical
                  className="h-4 w-4"
                  style={{ color: "var(--muted-foreground)" }}
                />
              </button>
            </div>
          )}

          {/* Render the appropriate activity card */}
          {activity.kind === "place" ? (
            <PlaceActivityRowC
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
              activeDragId={activeDragId}
              onViewDetails={onViewDetails}
              tripStartDate={tripStartDate}
            />
          ) : (
            <NoteActivityRowC
              activity={activity}
              onUpdate={onUpdate}
              onDelete={onDelete}
              isReadOnly={isReadOnly}
            />
          )}
        </div>
      )}
    </li>
  );
});
