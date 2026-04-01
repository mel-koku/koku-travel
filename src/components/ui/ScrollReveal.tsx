"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, useMemo, type ReactNode } from "react";
import { easeReveal, durationSlow } from "@/lib/motion";

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
  /** Stagger offset — use with grid children (each card adds stagger * index) */
  stagger?: number;
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
  distance = 20,
  duration = durationSlow,
  delay = 0,
  once = true,
  margin = "-80px",
  scale,
  stagger = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isInView = useInView(ref, { once, margin: margin as `${number}px` });

  const variants = useMemo(() => {
    const dir = directionMap[direction];
    const initialScale = scale ?? 1;
    return {
      hidden: {
        opacity: 0,
        x: dir.x * distance,
        y: dir.y * distance,
        scale: initialScale,
      },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
      },
    };
  }, [direction, distance, scale]);

  const transition = useMemo(() => ({
    duration,
    delay: delay + stagger,
    ease: easeReveal,
  }), [duration, delay, stagger]);

  if (prefersReducedMotion) {
    return <div ref={ref} className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={variants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
