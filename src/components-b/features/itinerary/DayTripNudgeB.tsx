"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Train } from "lucide-react";
import { bEase } from "@/lib/variant-b-motion";

const DISPLAY_MS = 8000;
const DELAY_MS = 1500;

/**
 * One-time floating toast after itinerary generation when day trip
 * suggestions are available. Auto-dismisses after 8s or on click.
 */
export function DayTripNudgeB({
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
          transition={{ duration: 0.35, ease: bEase }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <button
            type="button"
            onClick={handleClick}
            className="flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 transition-colors duration-200 active:scale-[0.98]"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "color-mix(in srgb, var(--success) 20%, transparent)",
              boxShadow: "var(--shadow-elevated)",
            }}
          >
            <Train
              className="h-4 w-4"
              style={{ color: "var(--success)" }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {count} day trip {count === 1 ? "idea" : "ideas"} near your route
            </span>
            <span
              className="rounded-lg px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--success) 10%, transparent)",
                color: "var(--success)",
              }}
            >
              View
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
