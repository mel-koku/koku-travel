"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Container } from "@/components/layouts/Container";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const STEP_LABELS = ["Basic Info", "Regions", "Interests", "Preferences", "Review"];
export const STEP_STORAGE_KEY = "koku_trip_step";

export type WizardProps = {
  step: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onStepSelect: (step: number) => void;
  children: ReactNode;
  /**
   * Optional custom footer content rendered inside the action bar.
   * When provided, replaces the default Back/Next buttons.
   */
  footerContent?: ReactNode;
  /**
   * When true, hides the footer entirely. Useful for read-only steps with custom actions.
   */
  hideFooter?: boolean;
  /**
   * Invoked when the wizard restores a previously saved step from storage.
   */
  onStepHydrated?: (step: number) => void;
  /**
   * When true, disables the Next button and marks it visually inactive.
   */
  isNextDisabled?: boolean;
  /**
   * Associates the Next button with a form element. When provided, the button will submit the form.
   */
  activeFormId?: string;
};

type WizardSidebarProps = {
  steps: string[];
  currentStep: number;
  maxVisitedStep: number;
  onStepClick: (step: number) => void;
};

function WizardSidebar({ steps, currentStep, maxVisitedStep, onStepClick }: WizardSidebarProps) {
  return (
    <nav aria-label="Trip Builder Steps">
      <ol className="flex flex-col gap-4">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isClickable = stepNumber <= maxVisitedStep;

          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => isClickable && onStepClick(stepNumber)}
                disabled={!isClickable}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-4 rounded-xl border border-transparent px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                  isActive
                    ? "border-indigo-200 bg-indigo-50 font-semibold text-indigo-700"
                    : "text-gray-600",
                  isClickable ? "hover:bg-gray-50 cursor-pointer" : "opacity-50 cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
                    isActive
                      ? "border-indigo-500 bg-white text-indigo-700"
                      : "border-gray-300 bg-gray-100 text-gray-500",
                  )}
                  aria-hidden="true"
                >
                  {stepNumber}
                </span>
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Wizard({
  step,
  totalSteps,
  onNext,
  onBack,
  onStepSelect,
  children,
  footerContent,
  hideFooter = false,
  onStepHydrated,
  isNextDisabled = false,
  activeFormId,
}: WizardProps) {
  const stepsToRender = useMemo(() => STEP_LABELS.slice(0, totalSteps), [totalSteps]);
  const backDisabled = step <= 1;
  const hasHydratedStepRef = useRef(false);
  const skipNextPersistRef = useRef(true);
  const [maxVisitedStep, setMaxVisitedStep] = useState(step);

  useEffect(() => {
    if (hasHydratedStepRef.current) {
      return;
    }
    hasHydratedStepRef.current = true;
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(STEP_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = Number.parseInt(raw, 10);
      if (Number.isNaN(parsed)) {
        return;
      }
      if (parsed < 1 || parsed > totalSteps) {
        return;
      }
      if (parsed !== step) {
        onStepHydrated?.(parsed);
      }
    } catch {
      // Swallow storage errors so the wizard can continue rendering.
    }
  }, [step, totalSteps, onStepHydrated]);

  useEffect(() => {
    if (step <= maxVisitedStep) {
      return;
    }
    queueMicrotask(() => {
      setMaxVisitedStep(step);
    });
  }, [step, maxVisitedStep]);

  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(STEP_STORAGE_KEY, String(step));
    } catch {
      // Ignore storage failures silently.
    }
  }, [step]);

  const handleNext = useCallback(() => {
    if (activeFormId) {
      const form = document.getElementById(activeFormId) as HTMLFormElement | null;
      if (form) {
        form.requestSubmit();
        return;
      }
    }
    onNext();
  }, [activeFormId, onNext]);

  const handleStepClick = useCallback(
    (targetStep: number) => {
      if (targetStep < 1 || targetStep > totalSteps) {
        return;
      }
      if (targetStep > maxVisitedStep) {
        return;
      }

      onStepSelect(targetStep);

      if (typeof window === "undefined") {
        return;
      }
      try {
        window.localStorage.setItem(STEP_STORAGE_KEY, String(targetStep));
      } catch {
        // Ignore storage failures silently.
      }
    },
    [maxVisitedStep, onStepSelect, totalSteps],
  );

  return (
    <Container className="py-16">
      <div className="flex flex-col gap-12 lg:flex-row">
        <aside className="lg:w-72">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-[90px]">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                Trip Builder
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                Step {step} of {totalSteps}
              </p>
            </div>
            <WizardSidebar
              steps={stepsToRender}
              currentStep={step}
              maxVisitedStep={maxVisitedStep}
              onStepClick={handleStepClick}
            />
          </div>
        </aside>
        <div className="flex-1">
          <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex-1 p-8">{children}</div>
            {!hideFooter ? (
              <div className="flex flex-col gap-4 border-t border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                {footerContent ?? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onBack}
                      disabled={backDisabled}
                    >
                      Back
                    </Button>
                    <Button
                      type={activeFormId ? "button" : "submit"}
                      variant="primary"
                      onClick={handleNext}
                      disabled={isNextDisabled}
                      aria-disabled={isNextDisabled}
                    >
                      Next
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Container>
  );
}


