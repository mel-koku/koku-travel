"use client";

import { motion, useReducedMotion } from "framer-motion";

type MenuTriggerProps = {
  isOpen: boolean;
  onToggle: () => void;
  color?: "white" | "charcoal" | "foreground";
};

export function MenuTrigger({ isOpen, onToggle, color = "charcoal" }: MenuTriggerProps) {
  const prefersReducedMotion = useReducedMotion();

  const lineColor =
    color === "foreground"
      ? "bg-foreground"
      : color === "white"
        ? "bg-white"
        : "bg-charcoal";

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 260, damping: 20, duration: 0.3 };

  return (
    <button
      type="button"
      data-menu-trigger
      onClick={onToggle}
      className="relative flex h-11 w-11 items-center justify-center lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-xl"
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
  );
}
