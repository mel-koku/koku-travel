"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Beat, type BeatProps } from "./Beat";
import { cn } from "@/lib/cn";

export type SortableBeatProps = BeatProps & {
  beatId: string;
  disabled?: boolean;
};

export function SortableBeat({ beatId, disabled, ...beatProps }: SortableBeatProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: beatId, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {!disabled && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label="Reorder place"
          className={cn(
            "absolute left-[-44px] top-[6px] w-5 h-5 text-foreground-secondary",
            "opacity-0 group-hover:opacity-100 touch-visible",
            "cursor-grab active:cursor-grabbing transition-opacity",
          )}
        >
          ⋮⋮
        </button>
      )}
      <Beat {...beatProps} />
    </div>
  );
}
