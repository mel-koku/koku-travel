"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { easeCinematicMut } from "@/lib/motion";
import type { LocationWarning } from "@/lib/tripBuilder/locationCapacity";

type RegionSummaryPillProps = {
  selectedCityCount: number;
  derivedRegionNames: string[];
  warning?: LocationWarning | null;
};

export function RegionSummaryPill({
  selectedCityCount,
  derivedRegionNames,
  warning,
}: RegionSummaryPillProps) {
  const prefersReducedMotion = useReducedMotion();

  const regionLabel =
    derivedRegionNames.length > 2
      ? `${derivedRegionNames.slice(0, 2).join(", ")} & more`
      : derivedRegionNames.join(", ");

  return (
    <div className="flex flex-col items-center gap-2">
      <AnimatePresence mode="wait">
        {selectedCityCount > 0 ? (
          <motion.div
            key="summary"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            transition={{
              duration: 0.4,
              ease: easeCinematicMut,
            }}
            className="whitespace-nowrap rounded-full border border-border bg-background/90 px-6 py-3 text-sm shadow-lg backdrop-blur-xl"
          >
            <span className="font-medium text-foreground">
              {selectedCityCount} {selectedCityCount === 1 ? "city" : "cities"}
            </span>
            {regionLabel && (
              <>
                <span className="mx-2 text-stone">|</span>
                <span className="text-foreground-secondary">{regionLabel}</span>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="warning"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            transition={{
              duration: 0.4,
              ease: easeCinematicMut,
            }}
            className="whitespace-nowrap rounded-full border border-warning/30 bg-warning/10 px-6 py-3 text-sm text-warning backdrop-blur-xl"
          >
            Select at least one city
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location capacity warning */}
      <AnimatePresence>
        {warning && selectedCityCount > 0 && (
          <motion.div
            key="capacity-warning"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            transition={{
              duration: 0.3,
              ease: easeCinematicMut,
            }}
            className="flex items-start gap-2 rounded-xl border border-brand-secondary/20 bg-background/90 px-4 py-2.5 text-xs shadow-lg backdrop-blur-xl"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-secondary" />
            <div>
              <span className="text-brand-secondary">{warning.message}</span>
              <span className="ml-1 text-foreground-secondary">
                {warning.suggestion}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
