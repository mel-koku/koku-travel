"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { easeCinematic } from "@/lib/motion";

type RegionSummaryPillProps = {
  selectedCount: number;
  totalCities: number;
};

export function RegionSummaryPill({
  selectedCount,
  totalCities,
}: RegionSummaryPillProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div>
      <AnimatePresence mode="wait">
        {selectedCount > 0 ? (
          <motion.div
            key="summary"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            transition={{
              duration: 0.4,
              ease: [...easeCinematic] as [number, number, number, number],
            }}
            className="whitespace-nowrap rounded-full border border-border bg-foreground/10 px-6 py-3 text-sm backdrop-blur-xl"
          >
            <span className="font-medium text-foreground">
              {selectedCount} {selectedCount === 1 ? "region" : "regions"}
            </span>
            <span className="mx-2 text-stone">|</span>
            <span className="text-foreground-secondary">
              {totalCities} {totalCities === 1 ? "city" : "cities"}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="warning"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            transition={{
              duration: 0.4,
              ease: [...easeCinematic] as [number, number, number, number],
            }}
            className="whitespace-nowrap rounded-full border border-warning/30 bg-warning/10 px-6 py-3 text-sm text-warning backdrop-blur-xl"
          >
            Select at least one region
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
