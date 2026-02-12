"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { easeReveal, durationFast } from "@/lib/motion";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

const DEFAULT_STATUS_MESSAGES = [
  "Reading your travel style...",
  "Mapping the best routes...",
  "Fitting the pieces together...",
  "Adding the finishing touches...",
];

const MESSAGE_INTERVAL = 2500;

type GeneratingOverlayProps = {
  sanityConfig?: TripBuilderConfig;
};

export function GeneratingOverlay({ sanityConfig }: GeneratingOverlayProps) {
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-lg"
    >
      {/* Film grain */}
      <div className="texture-grain pointer-events-none absolute inset-0" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeReveal, delay: 0.1 }}
          className="font-serif text-3xl italic text-foreground sm:text-4xl"
        >
          {sanityConfig?.generatingHeading ?? "Crafting your journey"}
        </motion.h2>

        {/* Progress bar */}
        <div className="h-0.5 w-64 overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full bg-brand-primary"
            initial={{ width: "0%" }}
            animate={{ width: "90%" }}
            transition={{ duration: 8, ease: easeReveal }}
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
              transition={{ duration: durationFast, ease: easeReveal }}
              className="text-sm text-foreground-secondary"
            >
              {messages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
