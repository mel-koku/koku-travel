"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { easeReveal, durationFast } from "@/lib/motion";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

const DEFAULT_STATUS_MESSAGES = [
  "Looking at what you picked...",
  "Working out the routes...",
  "Filling in the days...",
  "Almost done...",
];

const MESSAGE_INTERVAL = 2500;
const SUCCESS_DISPLAY_MS = 2500;

type GeneratingOverlayProps = {
  sanityConfig?: TripBuilderConfig;
  successData?: { tripName: string } | null;
  onSuccessComplete?: () => void;
};

export function GeneratingOverlay({ sanityConfig, successData, onSuccessComplete }: GeneratingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = sanityConfig?.generatingMessages?.length
    ? sanityConfig.generatingMessages
    : DEFAULT_STATUS_MESSAGES;

  const isSuccess = Boolean(successData);

  useEffect(() => {
    if (isSuccess) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, MESSAGE_INTERVAL);
    return () => clearInterval(interval);
  }, [messages.length, isSuccess]);

  // Auto-navigate after success display
  useEffect(() => {
    if (!isSuccess || !onSuccessComplete) return;
    const timer = setTimeout(onSuccessComplete, SUCCESS_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [isSuccess, onSuccessComplete]);

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
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: easeReveal }}
              className="flex flex-col items-center gap-6"
            >
              {/* Checkmark */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1, ease: easeReveal }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/15"
              >
                <svg className="h-8 w-8 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  />
                </svg>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: easeReveal }}
                className="font-serif text-3xl text-foreground sm:text-4xl"
              >
                Your trip is ready
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="max-w-xs text-sm text-foreground-secondary"
              >
                {successData?.tripName}
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="generating"
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-8"
            >
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: easeReveal, delay: 0.1 }}
                className="font-serif text-3xl text-foreground sm:text-4xl"
              >
                {sanityConfig?.generatingHeading ?? "Building your itinerary"}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
