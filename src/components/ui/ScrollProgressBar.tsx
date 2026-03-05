"use client";

import { motion, useScroll, useReducedMotion } from "framer-motion";

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-60 h-[2px] origin-left bg-brand-primary"
      style={{ scaleX: prefersReducedMotion ? 0 : scrollYProgress }}
    />
  );
}
