"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { IntroStepC } from "./IntroStepC";
import { DateStepC } from "./DateStepC";
import { EntryPointStepC } from "./EntryPointStepC";
import { VibeStepC } from "./VibeStepC";
import { RegionStepC } from "./RegionStepC";
import { ReviewStepC } from "./ReviewStepC";
import { StepShellC, StepNavBarC } from "./StepShellC";
import { useTripBuilderNavigation } from "@/hooks/useTripBuilderNavigation";
import { cEase } from "@c/ui/motionC";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

const stepVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? 16 : -8,
  }),
  center: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: cEase },
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? -8 : 16,
    transition: { duration: 0.35, ease: cEase },
  }),
};

const reducedMotionVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export type TripBuilderCProps = {
  onComplete?: () => void;
  sanityConfig?: TripBuilderConfig;
};

export function TripBuilderC({ onComplete, sanityConfig }: TripBuilderCProps) {
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
    quickStart,
    handleNext,
    handleBack,
    handleStepClick,
    handleGoToStep,
    isNextDisabled,
    getNextLabel,
  } = useTripBuilderNavigation({
    onComplete,
    sanityConfig,
    basePath: "/c/trip-builder",
  });

  const variants = prefersReducedMotion ? reducedMotionVariants : stepVariants;

  return (
    <div className="relative bg-[var(--background)]">
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
          {currentStep === 0 && (
            <IntroStepC
              onStart={() => goToStep(1)}
              onQuickStart={quickStart}
              sanityConfig={sanityConfig}
            />
          )}

          {currentStep === 1 && (
            <StepShellC>
              <DateStepC
                onValidityChange={setDatesValid}
                sanityConfig={sanityConfig}
              />
            </StepShellC>
          )}

          {currentStep === 2 && (
            <StepShellC>
              <EntryPointStepC sanityConfig={sanityConfig} />
            </StepShellC>
          )}

          {currentStep === 3 && (
            <StepShellC fullBleed>
              <VibeStepC
                onValidityChange={setVibesValid}
                sanityConfig={sanityConfig}
              />
            </StepShellC>
          )}

          {currentStep === 4 && (
            <StepShellC fullBleed>
              <RegionStepC
                onValidityChange={setRegionsValid}
                sanityConfig={sanityConfig}
              />
            </StepShellC>
          )}

          {currentStep === 5 && (
            <StepShellC>
              <ReviewStepC
                onValidityChange={setReviewValid}
                onGoToStep={handleGoToStep}
                sanityConfig={sanityConfig}
              />
            </StepShellC>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Persistent nav bar on steps 1-5 */}
      {currentStep > 0 && (
        <StepNavBarC
          onBack={handleBack}
          onNext={handleNext}
          nextLabel={getNextLabel()}
          nextDisabled={isNextDisabled}
          disabledHint={
            currentStep === 3
              ? "Select at least one vibe to continue"
              : currentStep === 4
                ? "Pick at least one region to continue"
                : undefined
          }
          currentStep={currentStep}
          totalSteps={stepCount}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />
      )}
    </div>
  );
}
