"use client";

import { motion } from "framer-motion";
import { useCursor } from "@/providers/CursorProvider";

const cursorConfig: Record<
  "default" | "link",
  { size: number; opacity: number; isRing: boolean }
> = {
  default: { size: 8, opacity: 1, isRing: false },
  link: { size: 32, opacity: 1, isRing: false },
};

export function CustomCursor() {
  const { cursorState, cursorX, cursorY, isEnabled } = useCursor();

  if (!isEnabled) return null;

  const config = cursorConfig[cursorState] ?? cursorConfig.default;

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[9999] mix-blend-difference"
      style={{
        x: cursorX,
        y: cursorY,
        translateX: "-50%",
        translateY: "-50%",
      }}
    >
      <motion.div
        className={`rounded-full ${
          config.isRing ? "border-2 border-white bg-transparent" : "bg-white"
        }`}
        animate={{
          width: config.size,
          height: config.size,
          opacity: config.opacity,
        }}
        transition={{ duration: 0.15 }}
      />
    </motion.div>
  );
}
