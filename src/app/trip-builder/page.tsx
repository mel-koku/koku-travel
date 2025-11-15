"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { Container } from "@/components/layouts/Container";
import { Wizard } from "@/components/features/trip-builder/Wizard";
import { TripBuilderProvider } from "@/context/TripBuilderContext";
import { logger } from "@/lib/logger";

// Error fallback component
const ErrorFallback = ({ message }: { message: string }) => (
  <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center">
    <p className="text-sm font-medium text-red-800">{message}</p>
    <p className="mt-2 text-xs text-red-600">Please refresh the page to try again.</p>
  </div>
);

// Dynamically import step components for code splitting
// These components are only loaded when their respective step is active
const Step1BasicInfo = dynamic(
  () =>
    import("@/components/features/trip-builder/Step1BasicInfo")
      .then((mod) => ({ default: mod.Step1BasicInfo }))
      .catch((error) => {
        logger.error("Failed to load Step1BasicInfo", error);
        return { default: () => <ErrorFallback message="Failed to load form. Please refresh the page." /> };
      }),
  {
    loading: () => <div className="flex h-64 items-center justify-center text-gray-500">Loading...</div>,
  }
);

const Step2Regions = dynamic(
  () =>
    import("@/components/features/trip-builder/Step2Regions")
      .then((mod) => ({ default: mod.Step2Regions }))
      .catch((error) => {
        logger.error("Failed to load Step2Regions", error);
        return { default: () => <ErrorFallback message="Failed to load regions step. Please refresh the page." /> };
      }),
  {
    loading: () => <div className="flex h-64 items-center justify-center text-gray-500">Loading...</div>,
  }
);

const Step3Interests = dynamic(
  () =>
    import("@/components/features/trip-builder/Step3Interests")
      .then((mod) => ({ default: mod.Step3Interests }))
      .catch((error) => {
        logger.error("Failed to load Step3Interests", error);
        return { default: () => <ErrorFallback message="Failed to load interests step. Please refresh the page." /> };
      }),
  {
    loading: () => <div className="flex h-64 items-center justify-center text-gray-500">Loading...</div>,
  }
);

const Step4Preferences = dynamic(
  () =>
    import("@/components/features/trip-builder/Step4Preferences")
      .then((mod) => ({ default: mod.Step4Preferences }))
      .catch((error) => {
        logger.error("Failed to load Step4Preferences", error);
        return { default: () => <ErrorFallback message="Failed to load preferences step. Please refresh the page." /> };
      }),
  {
    loading: () => <div className="flex h-64 items-center justify-center text-gray-500">Loading...</div>,
  }
);

const Step5Review = dynamic(
  () =>
    import("@/components/features/trip-builder/Step5Review")
      .then((mod) => ({ default: mod.Step5Review }))
      .catch((error) => {
        logger.error("Failed to load Step5Review", error);
        return { default: () => <ErrorFallback message="Failed to load review step. Please refresh the page." /> };
      }),
  {
    loading: () => <div className="flex h-64 items-center justify-center text-gray-500">Loading...</div>,
  }
);

const TOTAL_STEPS = 5;
const STEP1_FORM_ID = "trip-builder-step1-form";
const STEP2_FORM_ID = "trip-builder-step2-form";
const STEP3_FORM_ID = "trip-builder-step3-form";
const STEP4_FORM_ID = "trip-builder-step4-form";

export default function TripBuilderPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Valid, setStep1Valid] = useState(false);
  const [step2Valid, setStep2Valid] = useState(false);
  const [step3Valid, setStep3Valid] = useState(false);

  const goToStep = useCallback((step: number) => {
    setCurrentStep((prev) => {
      const next = Math.min(Math.max(step, 1), TOTAL_STEPS);
      return next === prev ? prev : next;
    });
  }, []);

  const handleNext = useCallback(() => {
    goToStep(currentStep + 1);
  }, [currentStep, goToStep]);

  const handleBack = useCallback(() => {
    goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const isNextDisabled = useMemo(() => {
    if (currentStep === 1) {
      return !step1Valid;
    }
    if (currentStep === 2) {
      return !step2Valid;
    }
    if (currentStep === 3) {
      return !step3Valid;
    }
    if (currentStep === 4) {
      return false;
    }
    return true;
  }, [currentStep, step1Valid, step2Valid, step3Valid]);

  const activeFormId =
    currentStep === 1
      ? STEP1_FORM_ID
      : currentStep === 2
        ? STEP2_FORM_ID
        : currentStep === 3
          ? STEP3_FORM_ID
          : currentStep === 4
            ? STEP4_FORM_ID
            : undefined;

  const content = useMemo(() => {
    if (currentStep === 1) {
      return (
        <Step1BasicInfo
          formId={STEP1_FORM_ID}
          onNext={() => goToStep(2)}
          onValidityChange={setStep1Valid}
        />
      );
    }
    if (currentStep === 2) {
      return (
        <Step2Regions
          formId={STEP2_FORM_ID}
          onNext={() => goToStep(3)}
          onValidityChange={setStep2Valid}
        />
      );
    }
    if (currentStep === 3) {
      return (
        <Step3Interests
          formId={STEP3_FORM_ID}
          onNext={() => goToStep(4)}
          onValidityChange={setStep3Valid}
        />
      );
    }

    if (currentStep === 4) {
      return <Step4Preferences formId={STEP4_FORM_ID} onNext={() => goToStep(5)} />;
    }

    if (currentStep === 5) {
      return <Step5Review onEditStep={goToStep} />;
    }

    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
        Future steps are on the way. Stay tuned!
      </div>
    );
  }, [currentStep, goToStep]);

  return (
    <TripBuilderProvider>
      <div className="bg-gray-50 min-h-screen">
        <Container className="pb-6 pt-8 sm:pb-8 sm:pt-12 md:pb-10 md:pt-16">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">Create Your Trip</h1>
            <p className="mt-3 text-base text-gray-600 sm:mt-4 sm:text-lg">
              Begin crafting your Japan adventure with a few key details. We&apos;ll save your
              progress automatically as you go.
            </p>
          </div>
        </Container>
        <Wizard
          step={currentStep}
          totalSteps={TOTAL_STEPS}
          onNext={handleNext}
          onBack={handleBack}
          onStepSelect={goToStep}
          onStepHydrated={goToStep}
          isNextDisabled={isNextDisabled}
          activeFormId={activeFormId}
          hideFooter={currentStep === TOTAL_STEPS}
        >
          {content}
        </Wizard>
      </div>
    </TripBuilderProvider>
  );
}


