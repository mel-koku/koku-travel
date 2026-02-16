"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";

import { IntroStep } from "./IntroStep";
import { DateStep } from "./DateStep";
import { EntryPointStep } from "./EntryPointStep";
import { VibeStep } from "./VibeStep";
import { RegionStep } from "./RegionStep";
import { ReviewStep } from "./ReviewStep";
import { StepProgressTrack } from "./StepProgressTrack";
import { ArrowLineCTA } from "./ArrowLineCTA";
import { useTripBuilderNavigation } from "@/hooks/useTripBuilderNavigation";
import { easePageTransition, durationSlow } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { ChevronLeft } from "lucide-react";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

export type TripBuilderV2Props = {
  onComplete?: () => void;
  sanityConfig?: TripBuilderConfig;
};

const stepVariants: Variants = {
  enter: (dir: number) => ({
    clipPath: dir > 0 ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)",
  }),
  center: {
    clipPath: "inset(0 0 0 0)",
    transition: { duration: durationSlow, ease: [...easePageTransition] },
  },
  exit: (dir: number) => ({
    clipPath: dir > 0 ? "inset(0 0 100% 0)" : "inset(100% 0 0 0)",
    transition: { duration: 0.5, ease: [...easePageTransition] },
  }),
};

const reducedMotionVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export function TripBuilderV2({ onComplete, sanityConfig }: TripBuilderV2Props) {
  const prefersReducedMotion = useReducedMotion();

  const {
    currentStep,
    direction,
    completedSteps,
    stepCount,
    setDatesValid,
    setVibesValid,
    setRegionsValid,
    setReviewValid,
    goToStep,
    handleNext,
    handleBack,
    handleStartOver,
    handleStepClick,
    handleGoToStep,
    isNextDisabled,
    getNextLabel,
  } = useTripBuilderNavigation({ onComplete, sanityConfig });

  const variants = prefersReducedMotion ? reducedMotionVariants : stepVariants;

  return (
    <div className="relative bg-background">
      {/* Progress Track — hidden on Step 0 */}
      {currentStep > 0 && (
        <StepProgressTrack
          currentStep={currentStep}
          totalSteps={stepCount}
          onStepClick={handleStepClick}
          onStartOver={handleStartOver}
          completedSteps={completedSteps}
          hideDesktopTrack={currentStep === 4}
        />
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={`step-${currentStep}`}
          custom={direction}
          variants={variants}
          initial={currentStep === 0 ? false : "enter"}
          animate="center"
          exit="exit"
          className="min-h-[calc(100dvh-5rem)]"
        >
          {currentStep === 0 && <IntroStep onStart={() => goToStep(1)} sanityConfig={sanityConfig} />}

          {currentStep === 1 && (
            <StepShell
              eyebrow="STEP 01"
              onBack={handleBack}
              onNext={handleNext}
              nextLabel={getNextLabel()}
              backLabel={sanityConfig?.navBackLabel}
              nextDisabled={isNextDisabled}
            >
              <DateStep onValidityChange={setDatesValid} sanityConfig={sanityConfig} />
            </StepShell>
          )}

          {currentStep === 2 && (
            <StepShell
              eyebrow="STEP 02"
              onBack={handleBack}
              onNext={handleNext}
              nextLabel={getNextLabel()}
              backLabel={sanityConfig?.navBackLabel}
              nextDisabled={false}
            >
              <EntryPointStep sanityConfig={sanityConfig} />
            </StepShell>
          )}

          {currentStep === 3 && (
            <StepShell
              eyebrow="STEP 03"
              onBack={handleBack}
              onNext={handleNext}
              nextLabel={getNextLabel()}
              backLabel={sanityConfig?.navBackLabel}
              nextDisabled={isNextDisabled}
              fullBleed
            >
              <VibeStep onValidityChange={setVibesValid} sanityConfig={sanityConfig} />
            </StepShell>
          )}

          {currentStep === 4 && (
            <StepShell
              eyebrow="STEP 04"
              onBack={handleBack}
              onNext={handleNext}
              nextLabel={getNextLabel()}
              backLabel={sanityConfig?.navBackLabel}
              nextDisabled={isNextDisabled}
              fullBleed
            >
              <RegionStep onValidityChange={setRegionsValid} sanityConfig={sanityConfig} />
            </StepShell>
          )}

          {currentStep === 5 && (
            <StepShell
              eyebrow="STEP 05"
              onBack={handleBack}
              onNext={handleNext}
              nextLabel={getNextLabel()}
              backLabel={sanityConfig?.navBackLabel}
              nextDisabled={isNextDisabled}
            >
              <ReviewStep
                onValidityChange={setReviewValid}
                onGoToStep={handleGoToStep}
                sanityConfig={sanityConfig}
              />
            </StepShell>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * StepShell wraps each step with consistent desktop/mobile navigation.
 * Desktop: ArrowLineCTA at bottom-right, back link at bottom-left.
 * Mobile: Fixed bottom bar with back + forward buttons.
 */
type StepShellProps = {
  eyebrow: string;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  backLabel?: string;
  nextDisabled?: boolean;
  fullBleed?: boolean;
};

function StepShell({
  children,
  onBack,
  onNext,
  nextLabel,
  backLabel,
  nextDisabled = false,
  fullBleed = false,
}: StepShellProps) {
  const resolvedBackLabel = backLabel ?? "Back";

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col pb-20">
      {/* Content area — grows to fill, page scrolls naturally */}
      <div
        className={cn(
          "flex flex-1 flex-col",
          !fullBleed && "mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 lg:px-8 lg:pr-24"
        )}
      >
        {children}
      </div>

      {/* Navigation — fixed to viewport bottom, always on top */}
      <div className="fixed inset-x-0 bottom-0 z-50 hidden border-t border-border/10 bg-background lg:block">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8 lg:pr-24">
          <button
            type="button"
            onClick={onBack}
            className="flex cursor-pointer items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-foreground-secondary transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {resolvedBackLabel}
          </button>

          <ArrowLineCTA
            label={nextLabel}
            onClick={onNext}
            disabled={nextDisabled}
          />
        </div>
      </div>

      {/* Mobile Bottom Bar — fixed to viewport bottom, always on top */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/20 bg-background p-4 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-foreground-secondary transition-colors hover:bg-surface"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className={cn(
              "h-12 flex-1 rounded-xl text-sm font-medium uppercase tracking-wider transition",
              nextDisabled
                ? "cursor-not-allowed bg-surface text-stone"
                : "cursor-pointer bg-brand-primary text-white hover:bg-brand-primary/90 active:scale-[0.98]"
            )}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
