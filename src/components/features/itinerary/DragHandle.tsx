import type {
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  TouchEvent,
} from "react";

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

  return (
    <button
      type="button"
      aria-label={label}
      data-dragging={isDragging}
      className={
        isPlace
          ? "font-mono text-[10px] uppercase tracking-[0.08em] whitespace-nowrap rounded-full bg-white/85 px-3 py-1.5 text-charcoal/80 shadow-sm backdrop-blur-md transition-all cursor-grab hover:bg-white/95 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary data-[dragging=true]:cursor-grabbing data-[dragging=true]:scale-[0.98] active:scale-[0.98]"
          : "font-mono text-[10px] uppercase tracking-[0.08em] whitespace-nowrap rounded-xl px-2 py-1 text-sage transition-all cursor-grab hover:bg-sage/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary data-[dragging=true]:cursor-grabbing data-[dragging=true]:scale-[0.98] active:scale-[0.98]"
      }
      {...dragAttributeProps}
      {...dragHandleListeners}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      Drag to reorder
    </button>
  );
}

