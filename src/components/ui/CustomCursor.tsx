"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCursor } from "@/providers/CursorProvider";
import { springCursor, durationMicro } from "@/lib/motion";

type CursorVariant = "dot" | "ring" | "crosshair" | "icon";

const cursorConfig: Record<
  string,
  { size: number; opacity: number; label: string; variant: CursorVariant }
> = {
  default: { size: 8, opacity: 1, label: "", variant: "dot" },
  link: { size: 32, opacity: 0.6, label: "", variant: "ring" },
  view: { size: 40, opacity: 0.9, label: "", variant: "icon" },
  explore: { size: 40, opacity: 0.9, label: "", variant: "crosshair" },
  read: { size: 60, opacity: 0.9, label: "Read", variant: "ring" },
  drag: { size: 20, opacity: 0.7, label: "", variant: "dot" },
  hidden: { size: 0, opacity: 0, label: "", variant: "dot" },
};

const springConfig = springCursor;

function CrosshairIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="2" y1="8" x2="6" y2="8" />
      <line x1="10" y1="8" x2="14" y2="8" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="7" y1="2" x2="7" y2="12" />
      <line x1="2" y1="7" x2="12" y2="7" />
    </svg>
  );
}

export function CustomCursor() {
  const { cursorState, smoothX, smoothY, isEnabled } = useCursor();

  if (!isEnabled) return null;

  const config = cursorConfig[cursorState] ?? cursorConfig.default!;
  const isRing = config.variant === "ring";

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[9999] mix-blend-difference"
      style={{
        x: smoothX,
        y: smoothY,
        translateX: "-50%",
        translateY: "-50%",
      }}
    >
      <motion.div
        className={`flex items-center justify-center rounded-full ${
          isRing ? "border-2 border-white bg-transparent" : "bg-white"
        }`}
        animate={{
          width: config.size,
          height: config.size,
          opacity: config.opacity,
        }}
        transition={{ type: "spring", ...springConfig }}
      >
        <AnimatePresence mode="wait">
          {config.variant === "crosshair" && (
            <motion.span
              key="crosshair"
              className="text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: durationMicro }}
            >
              <CrosshairIcon />
            </motion.span>
          )}
          {config.variant === "icon" && (
            <motion.span
              key="plus"
              className="text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: durationMicro }}
            >
              <PlusIcon />
            </motion.span>
          )}
          {config.label && (
            <motion.span
              key="label"
              className="text-[10px] font-medium uppercase tracking-wider text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: durationMicro }}
            >
              {config.label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
