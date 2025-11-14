import {
  Children,
  ReactElement,
  ReactNode,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/cn";

type TooltipProps = {
  content: ReactNode;
  children: ReactElement;
  delay?: number;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
};

export function Tooltip({ content, children, delay = 150, side = "top", className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const showTimeoutRef = useRef<number | undefined>(undefined);
  const hideTimeoutRef = useRef<number | undefined>(undefined);
  const id = useId();

  const clearTimers = () => {
    if (showTimeoutRef.current) {
      window.clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = undefined;
    }
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = undefined;
    }
  };

  const scheduleShow = () => {
    clearTimers();
    showTimeoutRef.current = window.setTimeout(() => {
      setOpen(true);
      showTimeoutRef.current = undefined;
    }, delay);
  };

  const scheduleHide = () => {
    clearTimers();
    hideTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
      hideTimeoutRef.current = undefined;
    }, 60);
  };

  useEffect(() => () => clearTimers(), []);

  if (!isValidElement(children) || Children.count(children) !== 1) {
    throw new Error("Tooltip expects a single React element as its child.");
  }

  const trigger = cloneElement(children, {
    "aria-describedby": open ? id : undefined,
  } as any);

  const sideClasses: Record<"top" | "bottom" | "left" | "right", string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 -translate-y-2",
    bottom: "top-full left-1/2 -translate-x-1/2 translate-y-2",
    left: "right-full top-1/2 -translate-y-1/2 -translate-x-2",
    right: "left-full top-1/2 -translate-y-1/2 translate-x-2",
  };

  const handleMouseEnter = () => {
    scheduleShow();
  };

  const handleMouseLeave = () => {
    scheduleHide();
  };

  const handleFocus = () => {
    scheduleShow();
  };

  const handleBlur = () => {
    scheduleHide();
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {trigger}
      <span
        id={id}
        role="tooltip"
        aria-hidden={!open}
        className={cn(
          "pointer-events-none absolute z-20 max-w-xs rounded-lg bg-gray-900 px-3 py-2 text-sm text-gray-100 opacity-0 shadow-lg ring-1 ring-black/5 transition-opacity duration-150",
          open && "opacity-100",
          sideClasses[side],
          className,
        )}
      >
        {content}
        <span
          className={cn(
            "absolute h-2 w-2 rotate-45 bg-gray-900",
            side === "top" && "left-1/2 top-full -translate-x-1/2",
            side === "bottom" && "left-1/2 bottom-full -translate-x-1/2",
            side === "left" && "left-full top-1/2 -translate-y-1/2",
            side === "right" && "right-full top-1/2 -translate-y-1/2",
          )}
          aria-hidden="true"
        />
      </span>
    </span>
  );
}

Tooltip.displayName = "Tooltip";


