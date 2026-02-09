"use client";

import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const STEP_LABELS = [
  "Intro",
  "Dates",
  "Entry",
  "Vibes",
  "Regions",
  "Review",
];

type StepProgressTrackProps = {
  currentStep: number;
  totalSteps: number;
  onStepClick: (step: number) => void;
  onStartOver: () => void;
  completedSteps: Set<number>;
};

export function StepProgressTrack({
  currentStep,
  totalSteps,
  onStepClick,
  onStartOver,
  completedSteps,
}: StepProgressTrackProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <>
      {/* Desktop — Vertical tick track, fixed right edge */}
      <div className="fixed right-8 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-0 lg:flex">
        {/* Vertical line */}
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/50" />

        <div className="relative flex flex-col items-center gap-6">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const isActive = i === currentStep;
            const isCompleted = completedSteps.has(i);
            const canClick = isCompleted || i === currentStep || i < currentStep;

            return (
              <div key={i} className="group relative">
                <button
                  type="button"
                  onClick={() => canClick && onStepClick(i)}
                  disabled={!canClick}
                  className={cn(
                    "relative z-10 rounded-full transition-all duration-300",
                    isActive &&
                      "h-2.5 w-2.5 bg-brand-primary shadow-[0_0_12px_rgba(196,80,79,0.4)]",
                    isCompleted &&
                      !isActive &&
                      "h-1.5 w-1.5 bg-sage cursor-pointer hover:bg-sage/80",
                    !isActive &&
                      !isCompleted &&
                      "h-1 w-1 bg-border",
                    canClick && !isActive && "cursor-pointer"
                  )}
                  aria-label={`Go to ${STEP_LABELS[i]}`}
                />

                {/* Tooltip — shows on hover for active/completed dots */}
                {canClick && (
                  <div className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="rounded-md bg-surface px-2 py-1 text-xs text-foreground-secondary shadow-md">
                      {STEP_LABELS[i]}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Start Over X at bottom */}
        {currentStep > 0 && (
          <button
            type="button"
            onClick={onStartOver}
            className="mt-6 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-stone transition-colors hover:bg-surface hover:text-error"
            aria-label="Start over"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Mobile — Top capsule */}
      {currentStep > 0 && (
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed left-1/2 top-24 z-30 -translate-x-1/2 lg:hidden"
        >
          <div className="flex flex-col items-center gap-1.5 rounded-full bg-surface/80 px-4 py-1.5 shadow-lg backdrop-blur-xl">
            <span className="font-mono text-xs text-foreground-secondary">
              {currentStep} / {totalSteps - 1}
            </span>
            {/* Thin progress bar */}
            <div className="h-0.5 w-12 overflow-hidden rounded-full bg-border">
              <motion.div
                className="h-full bg-brand-primary"
                initial={false}
                animate={{
                  width: `${(currentStep / (totalSteps - 1)) * 100}%`,
                }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
