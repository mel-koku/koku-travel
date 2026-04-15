"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography-system";
import { easeEditorial, easeReveal, durationBase } from "@/lib/motion";
import { UNLOCK_CEREMONY_MIN_MS } from "@/lib/billing/access";

type UnlockCeremonyProps = {
  cities: string[];
  topActivityName?: string;
  onComplete: () => void;
  generationPromise: Promise<unknown> | null;
  retryable?: boolean;
  onRetry?: () => void;
};

const CEREMONY_STEPS = [
  (cities: string[]) => `Routing from ${cities[0] ?? "your first city"} to ${cities[1] ?? "your next stop"}`,
  () => "Optimizing your rail passes",
  (_cities: string[], topActivity?: string) =>
    topActivity ? `Finding the morning light at ${topActivity}` : "Scheduling your mornings",
  () => "Writing your daily briefings",
];

export function UnlockCeremony({
  cities,
  topActivityName,
  onComplete,
  generationPromise,
  retryable,
  onRetry,
}: UnlockCeremonyProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [generationDone, setGenerationDone] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    if (!generationPromise) {
      setGenerationDone(false);
      return;
    }
    let cancelled = false;
    generationPromise
      .then(() => {
        if (!cancelled) setGenerationDone(true);
      })
      .catch(() => {
        if (!cancelled) setGenerationDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [generationPromise]);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), UNLOCK_CEREMONY_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, CEREMONY_STEPS.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (generationDone && minTimePassed && !retryable) {
      const exitTimer = setTimeout(onComplete, 500);
      return () => clearTimeout(exitTimer);
    }
  }, [generationDone, minTimePassed, onComplete, retryable]);

  const stepText = CEREMONY_STEPS[stepIndex]?.(cities, topActivityName) ?? "Finishing up";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-lg"
    >
      <motion.h2
        className={cn(typography({ intent: "editorial-h2" }), "mb-8 text-center")}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: durationBase, ease: [...easeReveal] as [number, number, number, number] }}
      >
        Unlocking the rest of your journey.
      </motion.h2>

      <AnimatePresence mode="wait">
        <motion.p
          key={stepIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 0.7, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: [...easeEditorial] as [number, number, number, number] }}
          className={cn(typography({ intent: "utility-body-muted" }), "text-center italic")}
        >
          {stepText}...
        </motion.p>
      </AnimatePresence>

      <div className="mt-10 h-0.5 w-48 overflow-hidden rounded-full bg-sand">
        <motion.div
          className="h-full bg-brand-primary"
          initial={{ width: "0%" }}
          animate={{ width: generationDone && minTimePassed ? "100%" : "85%" }}
          transition={{ duration: generationDone ? 0.5 : UNLOCK_CEREMONY_MIN_MS / 1000, ease: "linear" }}
        />
      </div>

      {retryable && onRetry && (
        <div className="mt-8 text-center">
          <p className={cn(typography({ intent: "utility-body" }), "text-foreground-secondary")}>
            Your trip is unlocked. We&apos;re still assembling your written guide.
          </p>
          <button
            type="button"
            className="mt-4 btn-yuku"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}
    </motion.div>
  );
}
