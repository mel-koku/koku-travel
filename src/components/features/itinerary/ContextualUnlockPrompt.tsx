"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography-system";
import { easeEditorial, durationBase } from "@/lib/motion";
import { getTierPriceDollars } from "@/lib/billing/access";
import type { UnlockTier } from "@/lib/billing/types";

type ContextualUnlockPromptProps = {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: () => void;
  tier: UnlockTier;
  context: "locked_day" | "refinement" | "day_trip" | "share" | "pdf";
};

const CONTEXT_COPY: Record<ContextualUnlockPromptProps["context"], { heading: string; body: string }> = {
  locked_day: {
    heading: "Your trip has more to show you",
    body: "Unlock to see every day, with routes, transit, and tips.",
  },
  refinement: {
    heading: "Keep refining your trip",
    body: "Your first day has more to show you. Unlock your full trip to keep refining.",
  },
  day_trip: {
    heading: "Day trips await",
    body: "Unlock to discover day trip suggestions from your base cities.",
  },
  share: {
    heading: "Share your full journey",
    body: "Free shares include Day 1 only. Unlock to share every day.",
  },
  pdf: {
    heading: "Take it with you",
    body: "Unlock your trip to export the full itinerary as a PDF.",
  },
};

export function ContextualUnlockPrompt({
  isOpen,
  onClose,
  onUnlock,
  tier,
  context,
}: ContextualUnlockPromptProps) {
  const copy = CONTEXT_COPY[context];
  const price = getTierPriceDollars(tier);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-charcoal/40"
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: durationBase, ease: [...easeEditorial] as [number, number, number, number] }}
            className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-lg bg-surface p-6 shadow-[var(--shadow-elevated)] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <h3 className={cn(typography({ intent: "editorial-h3" }), "mb-2")}>
              {copy.heading}
            </h3>
            <p className={cn(typography({ intent: "utility-body-muted" }), "mb-6")}>
              {copy.body}
            </p>

            <div className="flex gap-3">
              <button
                onClick={onUnlock}
                className="btn-koku flex-1 rounded-lg bg-brand-primary px-6 py-3 text-sm font-medium text-white active:scale-[0.98]"
              >
                Unlock for ${price}
              </button>
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-3 text-sm text-foreground-secondary hover:bg-canvas"
              >
                Not now
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
