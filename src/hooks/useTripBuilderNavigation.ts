"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTripBuilder } from "@/context/TripBuilderContext";
import type { TripBuilderData } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const STEP_COUNT = 6;

type UseTripBuilderNavigationOptions = {
  onComplete?: () => void;
  sanityConfig?: TripBuilderConfig;
  /** Base path for URL operations — defaults to "/trip-builder" (A variant). Pass "/b/trip-builder" for B. */
  basePath?: string;
};

export function useTripBuilderNavigation({
  onComplete,
  sanityConfig,
  basePath,
}: UseTripBuilderNavigationOptions) {
  const { data, setData, reset } = useTripBuilder();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Check for ?step=5 deep link (from Ask Koku chat)
  const initialStep = searchParams.get("step");
  const didDeepLink = useRef(false);

  const [currentStep, setCurrentStep] = useState<Step>(() => {
    if (initialStep === "5") return 5;
    return 0;
  });
  const [direction, setDirection] = useState(1);

  // Detect when trip builder data is cleared externally (e.g. "Clear local data")
  // by tracking whether we've ever seen non-empty data in this session.
  const hadData = useRef(false);

  const dataIsEmpty =
    !data.dates?.start &&
    (!data.vibes || data.vibes.length === 0) &&
    (!data.cities || data.cities.length === 0) &&
    !data.entryPoint;

  useEffect(() => {
    if (!dataIsEmpty) {
      hadData.current = true;
    }
    // Data went from non-empty → empty while past intro: external clear
    if (dataIsEmpty && hadData.current && currentStep > 0) {
      hadData.current = false;
      setCurrentStep(0);
      setDirection(-1);
    }
  }, [dataIsEmpty, currentStep]);

  // Handle ?step=5 deep link — set validity and clean URL
  const [datesValid, setDatesValid] = useState(initialStep === "5");
  const [vibesValid, setVibesValid] = useState(initialStep === "5");
  const [regionsValid, setRegionsValid] = useState(initialStep === "5");
  const [reviewValid, setReviewValid] = useState(true);

  useEffect(() => {
    if (initialStep === "5" && !didDeepLink.current) {
      didDeepLink.current = true;
      router.replace(basePath ?? "/trip-builder", { scroll: false });
    }
  }, [initialStep, router]);

  // Listen for Ask Koku trip plan updates when already on /trip-builder
  useEffect(() => {
    const handleChatPlan = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setData(detail);
        setDatesValid(true);
        setVibesValid(true);
        setRegionsValid(true);
        setDirection(1);
        setCurrentStep(5);
      }
    };
    window.addEventListener("koku:trip-plan-from-chat", handleChatPlan);
    return () => window.removeEventListener("koku:trip-plan-from-chat", handleChatPlan);
  }, [setData]);

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

  const quickStart = useCallback(
    (partialData: Partial<TripBuilderData>) => {
      setData((prev) => ({ ...prev, ...partialData }));
      setDatesValid(true);
      setVibesValid(true);
      setRegionsValid(true);
      setDirection(1);
      setCurrentStep(5);
    },
    [setData],
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
    quickStart,
    handleNext,
    handleBack,
    handleStartOver,
    handleStepClick,
    handleGoToStep,
    isNextDisabled,
    getNextLabel,
  };
}
