"use client";

import { ChevronLeft } from "lucide-react";

const STEP_LABELS = [
  "Intro",
  "Dates",
  "Entry Point",
  "Vibes",
  "Regions",
  "Review",
];

type StepShellBProps = {
  children: React.ReactNode;
  fullBleed?: boolean;
};

export function StepShellB({
  children,
  fullBleed = false,
}: StepShellBProps) {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col pb-20">
      {/* Content area */}
      <div
        className={
          fullBleed
            ? "flex flex-1 flex-col"
            : "mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-16 sm:px-6 sm:pt-24 lg:px-8"
        }
      >
        {children}
      </div>
    </div>
  );
}

/* ── Persistent nav bar — rendered outside AnimatePresence in TripBuilderB ── */

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
    <div className="mx-auto flex max-w-md items-center gap-1.5">
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
            className="group relative h-1.5 flex-1 overflow-hidden rounded-full"
            aria-label={`Go to ${STEP_LABELS[step]}`}
          >
            <div className="absolute inset-0 rounded-full bg-[var(--border)]" />
            {(isActive || isCompleted) && (
              <div
                className="absolute inset-0 rounded-full bg-[var(--primary)] transition-all duration-500"
                style={{
                  width: isActive && !isCompleted ? "60%" : "100%",
                }}
              />
            )}
            {canClick && !isActive && (
              <div className="absolute inset-0 rounded-full opacity-0 transition-opacity group-hover:opacity-100 bg-[var(--primary)]/20" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export type StepNavBarBProps = {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
};

export function StepNavBarB({
  onBack,
  onNext,
  nextLabel,
  nextDisabled = false,
  currentStep,
  totalSteps,
  completedSteps,
  onStepClick,
}: StepNavBarBProps) {
  return (
    <>
      {/* Desktop Navigation */}
      <div className="fixed inset-x-0 bottom-0 z-50 hidden border-t border-[var(--border)] bg-white lg:block">
        <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
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

            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className={`inline-flex h-11 items-center justify-center rounded-xl px-8 text-sm font-medium transition-all active:scale-[0.98] ${
                nextDisabled
                  ? "cursor-not-allowed bg-[var(--surface)] text-[var(--muted-foreground)]"
                  : "cursor-pointer bg-[var(--primary)] text-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-elevated)] hover:brightness-110"
              }`}
            >
              {nextLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="mb-2">
          <SegmentedProgress
            currentStep={currentStep}
            totalSteps={totalSteps}
            completedSteps={completedSteps}
            onStepClick={onStepClick}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)]"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className={`h-12 flex-1 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
              nextDisabled
                ? "cursor-not-allowed bg-[var(--surface)] text-[var(--muted-foreground)]"
                : "cursor-pointer bg-[var(--primary)] text-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-elevated)] hover:brightness-110"
            }`}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </>
  );
}
