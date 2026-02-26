"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const DEFAULT_STATUS_MESSAGES = [
  "Looking at what you picked...",
  "Working out the routes...",
  "Filling in the days...",
  "Almost done...",
];

const MESSAGE_INTERVAL = 2500;

type GeneratingOverlayBProps = {
  sanityConfig?: TripBuilderConfig;
};

export function GeneratingOverlayB({ sanityConfig }: GeneratingOverlayBProps) {
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-lg"
    >
      <div className="flex flex-col items-center gap-8 px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.1 }}
          className="text-2xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl"
        >
          {sanityConfig?.generatingHeading ?? "Building your itinerary"}
        </motion.h2>

        {/* Progress bar */}
        <div className="h-1 w-64 overflow-hidden rounded-full bg-[var(--border)]">
          <motion.div
            className="h-full rounded-full bg-[var(--primary)]"
            initial={{ width: "0%" }}
            animate={{ width: "90%" }}
            transition={{ duration: 8, ease: bEase }}
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
              transition={{ duration: 0.3, ease: bEase }}
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
