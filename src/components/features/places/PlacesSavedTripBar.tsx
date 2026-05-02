"use client";

import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";

import { easeReveal, durationBase } from "@/lib/motion";

const MIN_SAVED_TO_SHOW = 3;

type PlacesSavedTripBarProps = {
  savedCount: number;
};

export function PlacesSavedTripBar({ savedCount }: PlacesSavedTripBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const visible = savedCount >= MIN_SAVED_TO_SHOW;

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          role="status"
          aria-live="polite"
          initial={prefersReducedMotion ? { opacity: 0 } : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { y: 24, opacity: 0 }}
          transition={{ duration: durationBase, ease: easeReveal }}
          className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 px-4 pb-[env(safe-area-inset-bottom)] sm:bottom-6"
        >
          <Link
            href="/trip-builder"
            className="btn-yuku flex items-center gap-3 rounded-full bg-brand-primary px-5 py-3 text-sm font-medium text-white shadow-[var(--shadow-elevated)] transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 font-mono text-xs tabular-nums">
              {savedCount}
            </span>
            <span>
              {savedCount === 1 ? "place saved" : "places saved"} · Build a trip with these
            </span>
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
