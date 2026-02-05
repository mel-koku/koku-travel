"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SubStepContainer, type SubStep } from "./SubStepContainer";
import { DateStep } from "./DateStep";
import { EntryPointStep } from "./EntryPointStep";
import { VibeStep } from "./VibeStep";
import { useTripBuilder } from "@/context/TripBuilderContext";

export type PlanStepProps = {
  onValidityChange?: (isValid: boolean) => void;
  currentSubStep?: number;
  onSubStepChange?: (subStep: number) => void;
};

export function PlanStep({
  onValidityChange,
  currentSubStep: controlledSubStep,
  onSubStepChange,
}: PlanStepProps) {
  const { data } = useTripBuilder();

  // Track validity of each sub-step
  const [datesValid, setDatesValid] = useState(false);
  const [vibesValid, setVibesValid] = useState(false);

  // Track which sub-steps have been visited (user has moved past them)
  const [visitedSubSteps, setVisitedSubSteps] = useState<Set<number>>(new Set());

  // Internal sub-step state (used when not controlled)
  const [internalSubStep, setInternalSubStep] = useState(0);

  // Use controlled or internal state
  const currentSubStep = controlledSubStep ?? internalSubStep;
  const setCurrentSubStep = onSubStepChange ?? setInternalSubStep;

  // Track the highest sub-step reached to mark previous ones as visited
  const highestSubStepRef = useRef(currentSubStep);

  // Update visited sub-steps when current sub-step changes
  useEffect(() => {
    if (currentSubStep > highestSubStepRef.current) {
      highestSubStepRef.current = currentSubStep;
      // Mark all previous sub-steps as visited
      setVisitedSubSteps((prev) => {
        const next = new Set(prev);
        for (let i = 0; i < currentSubStep; i++) {
          next.add(i);
        }
        return next;
      });
    }
  }, [currentSubStep]);

  // Check if we have dates
  const hasDates = Boolean(data.dates.start && data.dates.end);

  // Format date for display (e.g., "Feb 06, 2026")
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Check if vibes are selected
  const hasSelectedVibes = (data.vibes?.length ?? 0) > 0;

  // Handle validity changes from sub-steps
  const handleDatesValidityChange = useCallback((isValid: boolean) => {
    setDatesValid(isValid);
  }, []);

  const handleVibesValidityChange = useCallback((isValid: boolean) => {
    setVibesValid(isValid);
  }, []);

  // Overall step validity (dates required, entry point optional, vibes required)
  useEffect(() => {
    const isValid = datesValid && hasSelectedVibes;
    onValidityChange?.(isValid);
  }, [datesValid, hasSelectedVibes, onValidityChange]);

  // Auto-advance to next sub-step when dates are completed (only on first completion)
  useEffect(() => {
    // Only auto-advance if we haven't reached step 1 before
    if (currentSubStep === 0 && datesValid && highestSubStepRef.current < 1) {
      // Dates complete, move to entry point
      setCurrentSubStep(1);
    }
  }, [currentSubStep, datesValid, setCurrentSubStep]);

  // Auto-advance to vibes when airport is selected (only on first selection)
  useEffect(() => {
    // Only auto-advance if we haven't reached step 2 before
    if (currentSubStep === 1 && data.entryPoint && highestSubStepRef.current < 2) {
      // Airport selected, move to vibes
      setCurrentSubStep(2);
    }
  }, [currentSubStep, data.entryPoint, setCurrentSubStep]);

  // Determine if entry point sub-step is complete
  // Complete if: user selected an airport OR user has moved past this step
  const isEntryPointComplete =
    Boolean(data.entryPoint) || visitedSubSteps.has(1) || currentSubStep > 1;

  // Build sub-steps configuration
  const subSteps = useMemo<SubStep[]>(
    () => [
      {
        id: "dates",
        title: "When are you traveling?",
        subtitle: hasDates
          ? `${formatDate(data.dates.start!)} to ${formatDate(data.dates.end!)}`
          : "Select your trip dates",
        isComplete: datesValid,
        content: <DateStep onValidityChange={handleDatesValidityChange} />,
      },
      {
        id: "entry-point",
        title: "Where will you arrive?",
        subtitle: data.entryPoint
          ? data.entryPoint.name
          : "Select your arrival airport (optional)",
        isComplete: isEntryPointComplete,
        content: <EntryPointStep />,
      },
      {
        id: "vibes",
        title: "What's your travel style?",
        subtitle: hasSelectedVibes
          ? `${data.vibes?.length} style${(data.vibes?.length ?? 0) > 1 ? "s" : ""} selected`
          : "Select up to 3 travel styles",
        isComplete: vibesValid,
        content: <VibeStep onValidityChange={handleVibesValidityChange} />,
      },
    ],
    [
      data.dates.start,
      data.dates.end,
      data.entryPoint,
      data.vibes,
      hasDates,
      hasSelectedVibes,
      datesValid,
      isEntryPointComplete,
      vibesValid,
      handleDatesValidityChange,
      handleVibesValidityChange,
    ]
  );

  return (
    <SubStepContainer
      subSteps={subSteps}
      currentSubStep={currentSubStep}
      onSubStepChange={setCurrentSubStep}
    />
  );
}
