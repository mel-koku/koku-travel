"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";

import { IntroStep } from "./IntroStep";
import { DateStep } from "./DateStep";
import { EntryPointStep } from "./EntryPointStep";
import { VibeStep } from "./VibeStep";
import { RegionStep } from "./RegionStep";
import { ReviewStep } from "./ReviewStep";
import { StepProgressTrack } from "./StepProgressTrack";
import { ArrowLineCTA } from "./ArrowLineCTA";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { easePageTransition, durationSlow } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { ChevronLeft } from "lucide-react";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

export type TripBuilderV2Props = {
  onComplete?: () => void;
  sanityConfig?: TripBuilderConfig;
};

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const STEP_COUNT = 6;

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
  const { data, reset } = useTripBuilder();
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [direction, setDirection] = useState(1);
  const prefersReducedMotion = useReducedMotion();

  // Step validity
  const [datesValid, setDatesValid] = useState(false);
  const [vibesValid, setVibesValid] = useState(false);
  const [regionsValid, setRegionsValid] = useState(false);
  const [reviewValid, setReviewValid] = useState(true);

  // Track completed steps
  const completedSteps = useMemo(() => {
    const set = new Set<number>();
    // Step 0 (intro) is always completed once you move past it
    if (currentStep > 0) set.add(0);
    if (datesValid) set.add(1);
    // Entry point is optional, mark complete if user has been there
    if (currentStep > 2 || data.entryPoint) set.add(2);
    if (vibesValid) set.add(3);
    if (regionsValid) set.add(4);
    if (reviewValid && currentStep === 5) set.add(5);
    return set;
  }, [currentStep, datesValid, data.entryPoint, vibesValid, regionsValid, reviewValid]);

  const goToStep = useCallback(
    (step: Step) => {
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    },
    [currentStep]
  );

  const handleNext = useCallback(() => {
    if (currentStep === 0) goToStep(1);
    else if (currentStep === 1 && datesValid) goToStep(2);
    else if (currentStep === 2) goToStep(3); // Entry point is optional
    else if (currentStep === 3 && vibesValid) goToStep(4);
    else if (currentStep === 4 && regionsValid) goToStep(5);
    else if (currentStep === 5 && reviewValid) onComplete?.();
  }, [currentStep, datesValid, vibesValid, regionsValid, reviewValid, goToStep, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      goToStep((currentStep - 1) as Step);
    }
  }, [currentStep, goToStep]);

  const handleStartOver = useCallback(() => {
    if (
      window.confirm(
        sanityConfig?.navStartOverConfirmation ?? "Start over? Your current selections will be cleared."
      )
    ) {
      reset();
      goToStep(0);
    }
  }, [reset, goToStep, sanityConfig?.navStartOverConfirmation]);

  const handleStepClick = useCallback(
    (step: number) => {
      if (step < currentStep || completedSteps.has(step)) {
        goToStep(step as Step);
      }
    },
    [currentStep, completedSteps, goToStep]
  );

  // Determine if next is disabled
  const isNextDisabled = (() => {
    if (currentStep === 1) return !datesValid;
    if (currentStep === 3) return !vibesValid;
    if (currentStep === 4) return !regionsValid;
    if (currentStep === 5) return !reviewValid;
    return false;
  })();

  // Get next button label
  const getNextLabel = () => {
    if (currentStep === 0) return sanityConfig?.navStartPlanningLabel ?? "Start Planning";
    if (currentStep === 2) return data.entryPoint ? (sanityConfig?.navContinueLabel ?? "Continue") : (sanityConfig?.navSkipLabel ?? "Skip");
    if (currentStep === 5) return sanityConfig?.navGenerateLabel ?? "Generate Itinerary";
    return sanityConfig?.navContinueLabel ?? "Continue";
  };

  // Navigation handlers for ReviewStep to go to specific steps
  const handleGoToStep = useCallback(
    (step: number) => {
      goToStep(step as Step);
    },
    [goToStep]
  );

  const variants = prefersReducedMotion ? reducedMotionVariants : stepVariants;

  return (
    <div className="relative bg-background">
      {/* Progress Track — hidden on Step 0 */}
      {currentStep > 0 && (
        <StepProgressTrack
          currentStep={currentStep}
          totalSteps={STEP_COUNT}
          onStepClick={handleStepClick}
          onStartOver={handleStartOver}
          completedSteps={completedSteps}
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
  backLabel = "Back",
  nextDisabled = false,
  fullBleed = false,
}: StepShellProps) {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col">
      {/* Content area — grows to fill, page scrolls naturally */}
      <div
        className={cn(
          "flex flex-1 flex-col",
          !fullBleed && "mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 lg:px-8 lg:pr-24"
        )}
      >
        {children}
      </div>

      {/* Navigation — sticky to viewport bottom, detaches at section end */}
      <div className="sticky bottom-0 z-30 hidden border-t border-border/10 bg-background lg:block">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8 lg:pr-24">
          <button
            type="button"
            onClick={onBack}
            className="link-reveal cursor-pointer text-xs font-medium uppercase tracking-wide text-stone transition-colors hover:text-foreground-secondary"
          >
            {backLabel}
          </button>

          <ArrowLineCTA
            label={nextLabel}
            onClick={onNext}
            disabled={nextDisabled}
          />
        </div>
      </div>

      {/* Mobile Bottom Bar — sticky */}
      <div className="sticky bottom-0 z-30 border-t border-border/20 bg-background p-4 lg:hidden">
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
                : "cursor-pointer bg-brand-primary text-white hover:bg-brand-primary/90"
            )}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
