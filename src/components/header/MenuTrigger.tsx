"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Magnetic } from "@/components/ui/Magnetic";
import { useCursor } from "@/providers/CursorProvider";

type MenuTriggerProps = {
  isOpen: boolean;
  onToggle: () => void;
  color?: "white" | "charcoal";
};

export function MenuTrigger({ isOpen, onToggle, color = "charcoal" }: MenuTriggerProps) {
  const { setCursorState } = useCursor();
  const prefersReducedMotion = useReducedMotion();

  const lineColor = color === "white" ? "bg-white" : "bg-charcoal";

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 260, damping: 20, duration: 0.3 };

  return (
    <Magnetic strength={0.2}>
      <button
        type="button"
        data-menu-trigger
        onClick={onToggle}
        onMouseEnter={() => setCursorState("link")}
        onMouseLeave={() => setCursorState("default")}
        className="relative flex h-11 w-11 items-center justify-center lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
      >
        <div className="relative flex h-4 w-6 flex-col items-center justify-center">
          <motion.span
            className={`absolute h-[2px] w-6 rounded-full ${lineColor}`}
            animate={
              isOpen
                ? { rotate: 45, y: 0 }
                : { rotate: 0, y: -4 }
            }
            transition={transition}
          />
          <motion.span
            className={`absolute h-[2px] w-6 rounded-full ${lineColor}`}
            animate={
              isOpen
                ? { rotate: -45, y: 0 }
                : { rotate: 0, y: 4 }
            }
            transition={transition}
          />
        </div>
      </button>
    </Magnetic>
  );
}
