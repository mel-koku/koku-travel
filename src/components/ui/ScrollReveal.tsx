"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  duration?: number;
  delay?: number;
  once?: boolean;
  margin?: string;
  scale?: number;
};

const directionMap = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  none: { x: 0, y: 0 },
};

export function ScrollReveal({
  children,
  className = "",
  direction = "up",
  distance = 40,
  duration = 0.7,
  delay = 0,
  once = true,
  margin = "-10%",
  scale,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isInView = useInView(ref, { once, margin: margin as `${number}px` });

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const dir = directionMap[direction];
  const initialScale = scale ?? 1;

  const hidden = {
    opacity: 0,
    x: dir.x * distance,
    y: dir.y * distance,
    scale: initialScale,
  };

  const visible = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={hidden}
      animate={isInView ? visible : hidden}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
