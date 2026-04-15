import type {
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  TouchEvent,
} from "react";
import type { ActivityColorScheme } from "@/lib/itinerary/activityColors";

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
  /** Stop number/label to display (place variant only) */
  displayLabel?: string | number;
  /** Color scheme for the stop number */
  colorScheme?: ActivityColorScheme;
  /** Whether this activity is selected */
  isSelected?: boolean;
};

export function DragHandle({
  variant,
  label,
  isDragging,
  attributes,
  listeners,
  displayLabel,
  colorScheme: _colorScheme,
  isSelected: _isSelected,
}: DragHandleProps) {
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

  const isPlace = variant === "place";

  // Place variant with stop number: number rendered separately, this is just the grip icon
  if (isPlace && displayLabel !== undefined) {
    return (
      <button
        type="button"
        aria-label={label}
        aria-roledescription="sortable"
        data-dragging={isDragging}
        className="mt-0.5 flex items-center justify-center rounded-md py-1 px-0.5 text-stone/30 transition-all cursor-grab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary data-[dragging=true]:cursor-grabbing data-[dragging=true]:scale-[0.95] active:scale-[0.97]"
        {...dragAttributeProps}
        {...dragHandleListeners}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <svg
          className="h-7 w-7"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <circle cx="5.5" cy="4" r="1.3" />
          <circle cx="10.5" cy="4" r="1.3" />
          <circle cx="5.5" cy="8.5" r="1.3" />
          <circle cx="10.5" cy="8.5" r="1.3" />
          <circle cx="5.5" cy="13" r="1.3" />
          <circle cx="10.5" cy="13" r="1.3" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-roledescription="sortable"
      data-dragging={isDragging}
      className={
        isPlace
          ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-stone/60 transition-all cursor-grab hover:bg-sand/50 hover:text-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary data-[dragging=true]:cursor-grabbing data-[dragging=true]:scale-[0.98] active:scale-[0.98]"
          : "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-sage/60 transition-all cursor-grab hover:bg-sage/15 hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary data-[dragging=true]:cursor-grabbing data-[dragging=true]:scale-[0.98] active:scale-[0.98]"
      }
      {...dragAttributeProps}
      {...dragHandleListeners}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="5.5" cy="3.5" r="1.5" />
        <circle cx="10.5" cy="3.5" r="1.5" />
        <circle cx="5.5" cy="8" r="1.5" />
        <circle cx="10.5" cy="8" r="1.5" />
        <circle cx="5.5" cy="12.5" r="1.5" />
        <circle cx="10.5" cy="12.5" r="1.5" />
      </svg>
    </button>
  );
}
