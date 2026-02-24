"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { IntroStepB } from "./IntroStepB";
import { DateStepB } from "./DateStepB";
import { EntryPointStepB } from "./EntryPointStepB";
import { VibeStepB } from "./VibeStepB";
import { RegionStepB } from "./RegionStepB";
import { ReviewStepB } from "./ReviewStepB";
import { StepShellB } from "./StepShellB";
import { useTripBuilderNavigation } from "@/hooks/useTripBuilderNavigation";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const stepVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? 20 : -10,
  }),
  center: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: bEase },
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? -10 : 20,
    transition: { duration: 0.35, ease: bEase },
  }),
};

const reducedMotionVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export type TripBuilderBProps = {
  onComplete?: () => void;
  sanityConfig?: TripBuilderConfig;
};

export function TripBuilderB({ onComplete, sanityConfig }: TripBuilderBProps) {
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
    basePath: "/b/trip-builder",
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
            <IntroStepB
              onStart={() => goToStep(1)}
              onQuickStart={quickStart}
              sanityConfig={sanityConfig}
            />
          )}

          {currentStep === 1 && (
            <StepShellB
              stepNumber={1}
              onBack={handleBack}
              onNext={handleNext}
              nextLabel={getNextLabel()}
              nextDisabled={isNextDisabled}
              currentStep={currentStep}
              totalSteps={stepCount}
              completedSteps={completedSteps}
              onStepClick={handleStepClick}
            >
              <DateStepB
                onValidityChange={setDatesValid}
                sanityConfig={sanityConfig}
              />
            </StepShellB>
          )}

          {currentStep === 2 && (
            <StepShellB
              stepNumber={2}
              onBack={handleBack}
              onNext={handleNext}
              nextLabel={getNextLabel()}
              nextDisabled={false}
              currentStep={currentStep}
              totalSteps={stepCount}
              completedSteps={completedSteps}
              onStepClick={handleStepClick}
            >
              <EntryPointStepB sanityConfig={sanityConfig} />
            </StepShellB>
          )}

          {currentStep === 3 && (
            <StepShellB
              stepNumber={3}
              fullBleed
              onBack={handleBack}
              onNext={handleNext}
              nextLabel={getNextLabel()}
              nextDisabled={isNextDisabled}
              currentStep={currentStep}
              totalSteps={stepCount}
              completedSteps={completedSteps}
              onStepClick={handleStepClick}
            >
              <VibeStepB
                onValidityChange={setVibesValid}
                sanityConfig={sanityConfig}
              />
            </StepShellB>
          )}

          {currentStep === 4 && (
            <StepShellB
              stepNumber={4}
              fullBleed
              onBack={handleBack}
              onNext={handleNext}
              nextLabel={getNextLabel()}
              nextDisabled={isNextDisabled}
              currentStep={currentStep}
              totalSteps={stepCount}
              completedSteps={completedSteps}
              onStepClick={handleStepClick}
            >
              <RegionStepB
                onValidityChange={setRegionsValid}
                sanityConfig={sanityConfig}
              />
            </StepShellB>
          )}

          {currentStep === 5 && (
            <StepShellB
              stepNumber={5}
              onBack={handleBack}
              onNext={handleNext}
              nextLabel={getNextLabel()}
              nextDisabled={isNextDisabled}
              currentStep={currentStep}
              totalSteps={stepCount}
              completedSteps={completedSteps}
              onStepClick={handleStepClick}
            >
              <ReviewStepB
                onValidityChange={setReviewValid}
                onGoToStep={handleGoToStep}
                sanityConfig={sanityConfig}
              />
            </StepShellB>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
