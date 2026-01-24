"use client";

import { useCallback, useState } from "react";

import { PlanStep } from "./PlanStep";
import { ReviewStep } from "./ReviewStep";
import { LivePreview } from "./LivePreview";
import { MobileBottomSheet, PreviewToggleButton } from "./MobileBottomSheet";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { cn } from "@/lib/cn";

export type TripBuilderV2Props = {
  onComplete?: () => void;
};

type Step = 1 | 2;

export function TripBuilderV2({ onComplete }: TripBuilderV2Props) {
  const { reset } = useTripBuilder();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [step1Valid, setStep1Valid] = useState(false);
  const [step2Valid, setStep2Valid] = useState(true);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const handleStep1ValidityChange = useCallback((isValid: boolean) => {
    // PlanStep already handles the combined validation (essentials + cities)
    setStep1Valid(isValid);
  }, []);

  const handleStep2ValidityChange = useCallback((isValid: boolean) => {
    setStep2Valid(isValid);
  }, []);

  const goToStep = useCallback((step: Step) => {
    setCurrentStep(step);
    // Scroll to top on step change
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep === 1 && step1Valid) {
      goToStep(2);
    } else if (currentStep === 2 && step2Valid) {
      onComplete?.();
    }
  }, [currentStep, step1Valid, step2Valid, goToStep, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep === 2) {
      goToStep(1);
    }
  }, [currentStep, goToStep]);

  const handleStartOver = useCallback(() => {
    if (window.confirm("Are you sure you want to start over? All your progress will be lost.")) {
      reset();
      goToStep(1);
    }
  }, [reset, goToStep]);

  const isNextDisabled = currentStep === 1 ? !step1Valid : !step2Valid;

  return (
    <div className="flex h-full min-h-screen flex-col bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-lg font-bold text-charcoal sm:text-xl">
              Plan Your Trip
            </h1>
            <p className="text-xs text-stone sm:text-sm">
              Step {currentStep} of 2:{" "}
              {currentStep === 1 ? "Trip Details & Cities" : "Review & Preferences"}
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
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row">
          {/* Left Panel - Form */}
          <div className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 lg:max-w-2xl lg:pb-6">
            {currentStep === 1 ? (
              <PlanStep onValidityChange={handleStep1ValidityChange} />
            ) : (
              <ReviewStep
                onBack={handleBack}
                onValidityChange={handleStep2ValidityChange}
              />
            )}
          </div>

          {/* Right Panel - Preview (Desktop) */}
          <div className="hidden w-96 shrink-0 border-l border-border bg-background lg:flex lg:flex-col xl:w-[420px]">
            <LivePreview className="h-full" />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background p-4 lg:hidden">
        <div className="flex items-center gap-3">
          {currentStep === 2 && (
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
            {currentStep === 1 ? "Continue to Review" : "Generate Itinerary"}
          </button>
        </div>
      </div>

      {/* Desktop Bottom Navigation */}
      <div className="sticky bottom-0 hidden border-t border-border bg-background lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            {currentStep === 2 && (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-warm-gray hover:bg-sand"
              >
                Back to Step 1
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
            {currentStep === 1 ? "Continue to Review" : "Generate Itinerary"}
          </button>
        </div>
      </div>

      {/* Mobile Preview Bottom Sheet */}
      <MobileBottomSheet
        isOpen={mobilePreviewOpen}
        onToggle={setMobilePreviewOpen}
      >
        <LivePreview showMap={false} />
      </MobileBottomSheet>

      {/* Mobile Preview Toggle Button */}
      <PreviewToggleButton
        onClick={() => setMobilePreviewOpen(true)}
        isOpen={mobilePreviewOpen}
      />
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
