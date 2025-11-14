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
    "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm transition cursor-grab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 data-[dragging=true]:cursor-grabbing";
  const placeClasses =
    "border-indigo-200 bg-white/95 text-indigo-600 hover:bg-indigo-50";
  const noteClasses =
    "border-indigo-200 bg-indigo-100 text-indigo-700 hover:bg-indigo-200";

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
      <span>Drag</span>
    </button>
  );
}

