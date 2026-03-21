"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cEase } from "@c/ui/motionC";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

const DEFAULT_STATUS_MESSAGES = [
  "Looking at what you picked...",
  "Working out the routes...",
  "Filling in the days...",
  "Almost done...",
];

const MESSAGE_INTERVAL = 2500;

type GeneratingOverlayCProps = {
  sanityConfig?: TripBuilderConfig;
};

export function GeneratingOverlayC({ sanityConfig }: GeneratingOverlayCProps) {
  const prefersReducedMotion = useReducedMotion();
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = sanityConfig?.generatingMessages?.length
    ? sanityConfig.generatingMessages
    : DEFAULT_STATUS_MESSAGES;

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, MESSAGE_INTERVAL);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--background)]"
    >
      <div className="flex flex-col items-center gap-8 px-6 text-center">
        <motion.h2
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: cEase, delay: 0.1 }}
          className="text-2xl font-bold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl"
          style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
        >
          {sanityConfig?.generatingHeading ?? "Building your itinerary"}
        </motion.h2>

        {/* Progress bar -- zero radius */}
        <div className="h-1 w-64 overflow-hidden bg-[var(--border)]">
          <motion.div
            className="h-full bg-[var(--primary)]"
            initial={{ width: "0%" }}
            animate={{ width: "90%" }}
            transition={{ duration: 8, ease: cEase }}
          />
        </div>

        {/* Rotating status messages */}
        <div className="h-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: cEase }}
              className="text-sm text-[var(--muted-foreground)]"
            >
              {messages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
