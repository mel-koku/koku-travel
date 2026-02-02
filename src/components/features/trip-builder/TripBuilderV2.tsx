"use client";

import { useCallback, useRef, useState } from "react";

import { IntroStep } from "./IntroStep";
import { PlanStep } from "./PlanStep";
import { RegionStep } from "./RegionStep";
import { ReviewStep } from "./ReviewStep";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { cn } from "@/lib/cn";

export type TripBuilderV2Props = {
  onComplete?: () => void;
};

type Step = 0 | 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  0: "Welcome",
  1: "Trip Details",
  2: "Region Selection",
  3: "Preferences",
};

export function TripBuilderV2({ onComplete }: TripBuilderV2Props) {
  const { reset } = useTripBuilder();
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [step1Valid, setStep1Valid] = useState(false);
  const [step2Valid, setStep2Valid] = useState(false);
  const [step3Valid, setStep3Valid] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleStep1ValidityChange = useCallback((isValid: boolean) => {
    setStep1Valid(isValid);
  }, []);

  const handleStep2ValidityChange = useCallback((isValid: boolean) => {
    setStep2Valid(isValid);
  }, []);

  const handleStep3ValidityChange = useCallback((isValid: boolean) => {
    setStep3Valid(isValid);
  }, []);

  const goToStep = useCallback((step: Step) => {
    setCurrentStep(step);
    // Wait for React to render and paint the new content, then scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep === 0) {
      goToStep(1);
    } else if (currentStep === 1 && step1Valid) {
      goToStep(2);
    } else if (currentStep === 2 && step2Valid) {
      goToStep(3);
    } else if (currentStep === 3 && step3Valid) {
      onComplete?.();
    }
  }, [currentStep, step1Valid, step2Valid, step3Valid, goToStep, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep === 1) {
      goToStep(0);
    } else if (currentStep === 2) {
      goToStep(1);
    } else if (currentStep === 3) {
      goToStep(2);
    }
  }, [currentStep, goToStep]);

  const handleStartOver = useCallback(() => {
    if (window.confirm("Are you sure you want to start over? All your progress will be lost.")) {
      reset();
      goToStep(0);
    }
  }, [reset, goToStep]);

  const isNextDisabled =
    (currentStep === 1 && !step1Valid) ||
    (currentStep === 2 && !step2Valid) ||
    (currentStep === 3 && !step3Valid);

  const getNextButtonLabel = () => {
    switch (currentStep) {
      case 1:
        return "Continue to Regions";
      case 2:
        return "Continue to Preferences";
      case 3:
        return "Generate Itinerary";
    }
  };

  const getBackButtonLabel = () => {
    switch (currentStep) {
      case 1:
        return "Back to Welcome";
      case 2:
        return "Back to Details";
      case 3:
        return "Back to Regions";
      default:
        return "Back";
    }
  };

  // Step 0 renders a clean welcome experience without wizard chrome
  if (currentStep === 0) {
    return <IntroStep onStart={() => goToStep(1)} />;
  }

  return (
    <div className="flex h-full min-h-screen flex-col bg-surface">
      {/* Header */}
      <header className="sticky top-20 z-20 border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-lg font-bold text-charcoal sm:text-xl">
              Plan Your Trip
            </h1>
            <p className="text-xs text-stone sm:text-sm">
              Step {currentStep} of 3: {STEP_LABELS[currentStep]}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Step indicators */}
            <div className="hidden items-center gap-2 sm:flex">
              <StepIndicator step={1} currentStep={currentStep} onClick={() => goToStep(1)} />
              <div className="h-px w-6 bg-border" />
              <StepIndicator
                step={2}
                currentStep={currentStep}
                onClick={() => step1Valid ? goToStep(2) : undefined}
                disabled={!step1Valid}
              />
              <div className="h-px w-6 bg-border" />
              <StepIndicator
                step={3}
                currentStep={currentStep}
                onClick={() => step1Valid && step2Valid ? goToStep(3) : undefined}
                disabled={!step1Valid || !step2Valid}
              />
            </div>

            <button
              type="button"
              onClick={handleStartOver}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground-secondary hover:bg-sand"
            >
              Start Over
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center">
          {/* Form Panel */}
          <div
            ref={scrollContainerRef}
            className={cn(
            "w-full flex-1 overflow-y-auto p-4 pb-24 sm:p-6 lg:pb-6",
            currentStep === 1 && "max-w-3xl",
            currentStep === 3 && "max-w-5xl"
          )}>
            {currentStep === 1 && (
              <PlanStep onValidityChange={handleStep1ValidityChange} />
            )}
            {currentStep === 2 && (
              <RegionStep onValidityChange={handleStep2ValidityChange} />
            )}
            {currentStep === 3 && (
              <ReviewStep onValidityChange={handleStep3ValidityChange} />
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background p-4 lg:hidden">
        <div className="flex items-center gap-3">
          {currentStep >= 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-warm-gray hover:bg-sand"
            >
              Back
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={isNextDisabled}
            className={cn(
              "flex-1 rounded-full px-6 py-2.5 text-sm font-semibold transition",
              isNextDisabled
                ? "bg-surface text-stone cursor-not-allowed"
                : "bg-brand-primary text-white hover:bg-brand-primary/90"
            )}
          >
            {getNextButtonLabel()}
          </button>
        </div>
      </div>

      {/* Desktop Bottom Navigation */}
      <div className="sticky bottom-0 hidden border-t border-border bg-background lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            {currentStep >= 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-warm-gray hover:bg-sand"
              >
                {getBackButtonLabel()}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={isNextDisabled}
            className={cn(
              "rounded-full px-6 py-2.5 text-sm font-semibold transition",
              isNextDisabled
                ? "bg-surface text-stone cursor-not-allowed"
                : "bg-brand-primary text-white hover:bg-brand-primary/90"
            )}
          >
            {getNextButtonLabel()}
          </button>
        </div>
      </div>

    </div>
  );
}

type StepIndicatorProps = {
  step: Step;
  currentStep: Step;
  onClick?: () => void;
  disabled?: boolean;
};

function StepIndicator({ step, currentStep, onClick, disabled }: StepIndicatorProps) {
  const isActive = step === currentStep;
  const isCompleted = step < currentStep;
  const isClickable = onClick && !disabled;

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition",
        isActive && "bg-brand-primary text-white",
        isCompleted && "bg-sage/10 text-sage",
        !isActive && !isCompleted && "bg-surface text-stone",
        isClickable && "cursor-pointer hover:opacity-80",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      {isCompleted ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        step
      )}
    </button>
  );
}
