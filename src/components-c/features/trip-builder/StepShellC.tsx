"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronLeft } from "lucide-react";

const STEP_LABELS = [
  "Intro",
  "Dates",
  "Entry Point",
  "Vibes",
  "Regions",
  "Review",
];

type StepShellCProps = {
  children: React.ReactNode;
  fullBleed?: boolean;
};

export function StepShellC({
  children,
  fullBleed = false,
}: StepShellCProps) {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col pb-20">
      <div
        className={
          fullBleed
            ? "flex flex-1 flex-col"
            : "mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-6 pt-16 sm:pt-24 lg:px-10"
        }
      >
        {children}
      </div>
    </div>
  );
}

/* ── Segmented progress bar ── */

function SegmentedProgress({
  currentStep,
  totalSteps,
  completedSteps,
  onStepClick,
}: {
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="mx-auto flex max-w-md items-center gap-1">
      {Array.from({ length: totalSteps - 1 }).map((_, idx) => {
        const step = idx + 1;
        const isActive = step === currentStep;
        const isCompleted = completedSteps.has(step);
        const canClick = isCompleted || step <= currentStep;

        return (
          <button
            key={step}
            type="button"
            onClick={() => canClick && onStepClick(step)}
            disabled={!canClick}
            className="group relative h-1 flex-1 overflow-hidden"
            aria-label={`Go to ${STEP_LABELS[step]}`}
          >
            <div className="absolute inset-0 bg-[var(--border)]" />
            {(isActive || isCompleted) && (
              <div
                className="absolute inset-0 bg-[var(--primary)] transition-all duration-500"
                style={{
                  width: isActive && !isCompleted ? "60%" : "100%",
                }}
              />
            )}
            {canClick && !isActive && (
              <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-[var(--primary)]/20" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Persistent nav bar ── */

export type StepNavBarCProps = {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  disabledHint?: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
};

export function StepNavBarC({
  onBack,
  onNext,
  nextLabel,
  nextDisabled = false,
  disabledHint,
  currentStep,
  totalSteps,
  completedSteps,
  onStepClick,
}: StepNavBarCProps) {
  const [showHint, setShowHint] = useState(false);

  const handleDisabledClick = useCallback(() => {
    if (nextDisabled && disabledHint) {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 3000);
    }
  }, [nextDisabled, disabledHint]);

  useEffect(() => {
    if (!nextDisabled) setShowHint(false);
  }, [nextDisabled]);

  return (
    <>
      {/* Desktop Navigation */}
      <div className="fixed inset-x-0 bottom-0 z-50 hidden border-t border-[var(--border)] bg-[var(--background)] lg:block">
        <div className="mx-auto w-full max-w-[1400px] px-6 py-3 lg:px-10">
          <div className="mb-3">
            <SegmentedProgress
              currentStep={currentStep}
              totalSteps={totalSteps}
              completedSteps={completedSteps}
              onStepClick={onStepClick}
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex flex-col items-end gap-1">
              {showHint && disabledHint && (
                <p className="text-xs text-[var(--error)] animate-in fade-in duration-200" role="alert">
                  {disabledHint}
                </p>
              )}
              <div onClick={handleDisabledClick}>
                <button
                  type="button"
                  onClick={nextDisabled ? undefined : onNext}
                  className={`inline-flex h-11 items-center justify-center px-7 text-[11px] font-bold uppercase tracking-[0.15em] transition-all active:scale-[0.98] ${
                    nextDisabled
                      ? "cursor-not-allowed bg-[var(--surface)] text-[var(--muted-foreground)]"
                      : "cursor-pointer bg-[var(--primary)] text-white hover:brightness-110"
                  }`}
                >
                  {nextLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--background)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="mb-2">
          <SegmentedProgress
            currentStep={currentStep}
            totalSteps={totalSteps}
            completedSteps={completedSteps}
            onStepClick={onStepClick}
          />
        </div>
        {showHint && disabledHint && (
          <p className="mb-1.5 text-center text-xs text-[var(--error)] animate-in fade-in duration-200" role="alert">
            {disabledHint}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)]"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={nextDisabled ? handleDisabledClick : onNext}
            className={`h-12 flex-1 text-[11px] font-bold uppercase tracking-[0.15em] transition-all active:scale-[0.98] ${
              nextDisabled
                ? "bg-[var(--surface)] text-[var(--muted-foreground)]"
                : "cursor-pointer bg-[var(--primary)] text-white hover:brightness-110"
            }`}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </>
  );
}
