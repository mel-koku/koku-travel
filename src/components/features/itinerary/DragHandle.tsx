import type {
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  TouchEvent,
} from "react";
import { GripIcon } from "./activityIcons";

type DragHandleListeners = {
  onKeyDown?: (event: React.KeyboardEvent<Element>) => void;
  onPointerDown?: (event: React.PointerEvent<Element>) => void;
  onPointerUp?: (event: React.PointerEvent<Element>) => void;
  onMouseDown?: (event: React.MouseEvent<Element>) => void;
  onMouseUp?: (event: React.MouseEvent<Element>) => void;
  onTouchStart?: (event: React.TouchEvent<Element>) => void;
  onTouchEnd?: (event: React.TouchEvent<Element>) => void;
};

type DragHandleProps = {
  variant: "place" | "note";
  label: string;
  isDragging?: boolean;
  attributes?: Record<string, unknown>;
  listeners?: Record<string, unknown>;
};

export function DragHandle({
  variant,
  label,
  isDragging,
  attributes,
  listeners,
}: DragHandleProps) {
  const baseClasses =
    "group/handle flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium shadow-sm transition-all cursor-grab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary data-[dragging=true]:cursor-grabbing data-[dragging=true]:scale-95 data-[dragging=true]:shadow-none hover:shadow-md active:scale-95";
  const placeClasses =
    "border-border bg-background text-stone hover:border-sage/50 hover:bg-sage/5 hover:text-sage";
  const noteClasses =
    "border-sage/30 bg-sage/10 text-sage hover:bg-sage/20";

  const dragAttributeProps = (attributes ?? {}) as Record<string, unknown>;
  const dragHandleListeners = (() => {
    const typed = (listeners ?? {}) as DragHandleListeners;
    return {
      onKeyDown: typed.onKeyDown
        ? (event: KeyboardEvent<HTMLButtonElement>) => {
            typed.onKeyDown?.(event);
          }
        : undefined,
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        typed.onPointerDown?.(event);
      },
      onPointerUp: typed.onPointerUp
        ? (event: PointerEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            typed.onPointerUp?.(event);
          }
        : undefined,
      onMouseDown: typed.onMouseDown
        ? (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            typed.onMouseDown?.(event);
          }
        : undefined,
      onMouseUp: typed.onMouseUp
        ? (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            typed.onMouseUp?.(event);
          }
        : undefined,
      onTouchStart: typed.onTouchStart
        ? (event: TouchEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            typed.onTouchStart?.(event);
          }
        : undefined,
      onTouchEnd: typed.onTouchEnd
        ? (event: TouchEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            typed.onTouchEnd?.(event);
          }
        : undefined,
    };
  })();

  return (
    <button
      type="button"
      aria-label={label}
      data-dragging={isDragging}
      className={`${baseClasses} ${variant === "place" ? placeClasses : noteClasses}`}
      {...dragAttributeProps}
      {...dragHandleListeners}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <GripIcon />
      <span className="hidden sm:inline group-hover/handle:inline">Reorder</span>
    </button>
  );
}

