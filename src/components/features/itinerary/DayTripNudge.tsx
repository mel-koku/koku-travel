"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { easeReveal } from "@/lib/motion";

const DISPLAY_MS = 8000;
const DELAY_MS = 1500;

/**
 * One-time nudge that appears after itinerary generation when day trip
 * suggestions are available. Shows at the bottom of the viewport,
 * auto-dismisses after 8s or on user click.
 */
export function DayTripNudge({
  count,
  onView,
}: {
  count: number;
  onView: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), DELAY_MS);
    const hideTimer = setTimeout(() => setVisible(false), DELAY_MS + DISPLAY_MS);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  function handleClick() {
    setVisible(false);
    onView();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: easeReveal }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <button
            type="button"
            onClick={handleClick}
            className="flex items-center gap-2.5 rounded-full border border-sage/20 bg-white px-4 py-2.5 shadow-[var(--shadow-elevated)] transition hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
          >
            {/* Train icon */}
            <svg className="h-4 w-4 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
            </svg>
            <span className="text-sm font-medium text-foreground">
              {count} day trip {count === 1 ? "idea" : "ideas"} near your route
            </span>
            <span className="rounded-md bg-sage/10 px-2 py-0.5 text-xs font-medium text-sage">
              View
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
