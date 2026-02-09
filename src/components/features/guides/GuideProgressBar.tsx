"use client";

import { type RefObject } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

type GuideProgressBarProps = {
  contentRef: RefObject<HTMLDivElement | null>;
};

export function GuideProgressBar({ contentRef }: GuideProgressBarProps) {
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: contentRef,
    offset: ["start start", "end end"],
  });

  // Only show when article body is in viewport
  const opacity = useTransform(scrollYProgress, (v) =>
    v > 0 && v < 1 ? 1 : 0
  );

  if (prefersReducedMotion) return null;

  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-60 h-[2px] origin-left bg-brand-primary"
      style={{ scaleX: scrollYProgress, opacity }}
    />
  );
}
