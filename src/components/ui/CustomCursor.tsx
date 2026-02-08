"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCursor } from "@/providers/CursorProvider";

const cursorConfig = {
  default: { size: 8, opacity: 1, label: "" },
  link: { size: 40, opacity: 0.5, label: "" },
  view: { size: 80, opacity: 0.9, label: "View" },
  drag: { size: 20, opacity: 0.7, label: "" },
  hidden: { size: 0, opacity: 0, label: "" },
};

export function CustomCursor() {
  const { cursorState, smoothX, smoothY, isEnabled } = useCursor();

  if (!isEnabled) return null;

  const config = cursorConfig[cursorState];

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
        className="flex items-center justify-center rounded-full bg-white"
        animate={{
          width: config.size,
          height: config.size,
          opacity: config.opacity,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <AnimatePresence>
          {config.label && (
            <motion.span
              className="text-[10px] font-medium uppercase tracking-wider text-foreground"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              {config.label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
