"use client";

import { useCallback, useMemo, useState } from "react";
import { useTripBuilder } from "@/context/TripBuilderContext";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const STEP_COUNT = 6;

type UseTripBuilderNavigationOptions = {
  onComplete?: () => void;
  sanityConfig?: TripBuilderConfig;
};

export function useTripBuilderNavigation({
  onComplete,
  sanityConfig,
}: UseTripBuilderNavigationOptions) {
  const { data, reset } = useTripBuilder();
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [direction, setDirection] = useState(1);

  // Step validity states
  const [datesValid, setDatesValid] = useState(false);
  const [vibesValid, setVibesValid] = useState(false);
  const [regionsValid, setRegionsValid] = useState(false);
  const [reviewValid, setReviewValid] = useState(true);

  // Track completed steps
  const completedSteps = useMemo(() => {
    const set = new Set<number>();
    if (currentStep > 0) set.add(0);
    if (datesValid) set.add(1);
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
    [currentStep],
  );

  const handleNext = useCallback(() => {
    if (currentStep === 0) goToStep(1);
    else if (currentStep === 1 && datesValid) goToStep(2);
    else if (currentStep === 2) goToStep(3);
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
        sanityConfig?.navStartOverConfirmation ?? "Start over? Everything you\u2019ve entered will be cleared.",
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
    [currentStep, completedSteps, goToStep],
  );

  const handleGoToStep = useCallback(
    (step: number) => {
      goToStep(step as Step);
    },
    [goToStep],
  );

  const isNextDisabled = (() => {
    if (currentStep === 1) return !datesValid;
    if (currentStep === 3) return !vibesValid;
    if (currentStep === 4) return !regionsValid;
    if (currentStep === 5) return !reviewValid;
    return false;
  })();

  const getNextLabel = () => {
    if (currentStep === 0) return sanityConfig?.navStartPlanningLabel ?? "Start Planning";
    if (currentStep === 2) return data.entryPoint ? (sanityConfig?.navContinueLabel ?? "Continue") : (sanityConfig?.navSkipLabel ?? "Skip");
    if (currentStep === 5) return sanityConfig?.navGenerateLabel ?? "Build My Itinerary";
    return sanityConfig?.navContinueLabel ?? "Continue";
  };

  return {
    currentStep,
    direction,
    completedSteps,
    stepCount: STEP_COUNT,
    // Validity setters
    setDatesValid,
    setVibesValid,
    setRegionsValid,
    setReviewValid,
    // Navigation
    goToStep,
    handleNext,
    handleBack,
    handleStartOver,
    handleStepClick,
    handleGoToStep,
    isNextDisabled,
    getNextLabel,
  };
}
