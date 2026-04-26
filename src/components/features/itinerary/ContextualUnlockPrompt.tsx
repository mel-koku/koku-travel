"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography-system";
import { easeEditorial, durationBase } from "@/lib/motion";
import { getTierPriceDollars } from "@/lib/billing/access";
import type { UnlockTier } from "@/lib/billing/types";

export type UnlockPromptContext =
  | "locked_day"
  | "refinement"
  | "day_trip"
  | "share"
  | "pdf"
  | "overview"
  | "near_me";

type ContextualUnlockPromptProps = {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: () => void;
  tier: UnlockTier;
  context: UnlockPromptContext;
  /** When true, render a login CTA instead of the priced unlock CTA. Used
   *  during the free launch promo for guests who must sign in to claim. */
  loginRequired?: boolean;
};

const CONTEXT_COPY: Record<UnlockPromptContext, { heading: string; body: string }> = {
  locked_day: {
    heading: "Your trip has more to show you",
    body: "Unlock to see every day, with routes, transit, and tips.",
  },
  refinement: {
    heading: "Keep refining your trip",
    body: "Refinements run across every day. Unlock to keep iterating.",
  },
  day_trip: {
    heading: "Day trips await",
    body: "Unlock to discover day trip suggestions from your base cities.",
  },
  share: {
    heading: "Share your full journey",
    body: "Unlock your trip to share it with anyone.",
  },
  pdf: {
    heading: "Take it with you",
    body: "Unlock your trip to export the full itinerary as a PDF.",
  },
  overview: {
    heading: "See the whole picture",
    body: "See the whole trip at once. Pacing, day trips, and a routed overview map.",
  },
  near_me: {
    heading: "For when you're on the ground",
    body: "Unlock to find places near your location as you move through Japan.",
  },
};

export function ContextualUnlockPrompt({
  isOpen,
  onClose,
  onUnlock,
  tier,
  context,
  loginRequired,
}: ContextualUnlockPromptProps) {
  const copy = CONTEXT_COPY[context];
  const price = getTierPriceDollars(tier);
  const ctaLabel = loginRequired ? "Log in to see full itinerary" : `Unlock for $${price}`;

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
              <Button
                onClick={onUnlock}
                variant="primary"
                size="lg"
                fullWidth
              >
                {ctaLabel}
              </Button>
              <Button onClick={onClose} variant="outline" size="lg">
                Not now
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
