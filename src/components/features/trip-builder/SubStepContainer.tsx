"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

export type SubStep = {
  id: string;
  title: string;
  subtitle?: string;
  isComplete: boolean;
  content: React.ReactNode;
};

export type SubStepContainerProps = {
  subSteps: SubStep[];
  currentSubStep: number;
  onSubStepChange: (index: number) => void;
  className?: string;
};

/**
 * SubStepContainer handles expand/collapse (desktop) or slide animation (mobile)
 * for sub-steps within a wizard step.
 *
 * - Desktop (>=1024px): All sub-steps visible as collapsible sections
 * - Mobile (<1024px): Animate between sub-steps one at a time
 */
export function SubStepContainer({
  subSteps,
  currentSubStep,
  onSubStepChange,
  className,
}: SubStepContainerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward
  const prevSubStepRef = useRef(currentSubStep);

  // Track direction of navigation
  useEffect(() => {
    setDirection(currentSubStep > prevSubStepRef.current ? 1 : -1);
    prevSubStepRef.current = currentSubStep;
  }, [currentSubStep]);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Scroll current sub-step into view on mobile
  useEffect(() => {
    if (isMobile && containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentSubStep, isMobile]);

  if (isMobile) {
    return (
      <MobileSubStepContainer
        subSteps={subSteps}
        currentSubStep={currentSubStep}
        onSubStepChange={onSubStepChange}
        containerRef={containerRef}
        direction={direction}
        className={className}
      />
    );
  }

  return (
    <DesktopSubStepContainer
      subSteps={subSteps}
      currentSubStep={currentSubStep}
      onSubStepChange={onSubStepChange}
      className={className}
    />
  );
}

type MobileSubStepContainerProps = {
  subSteps: SubStep[];
  currentSubStep: number;
  onSubStepChange: (index: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  direction: number;
  className?: string;
};

// Animation variants for mobile slide transitions
const mobileVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -50 : 50,
    opacity: 0,
  }),
};

function MobileSubStepContainer({
  subSteps,
  currentSubStep,
  containerRef,
  direction,
  className,
}: MobileSubStepContainerProps) {
  const current = subSteps[currentSubStep];

  return (
    <div ref={containerRef} className={cn("flex flex-col", className)}>
      {/* Progress dots */}
      <div className="mb-4 flex items-center justify-center gap-2">
        {subSteps.map((subStep, index) => (
          <motion.div
            key={subStep.id}
            className={cn(
              "h-2 rounded-full",
              index === currentSubStep
                ? "bg-brand-primary"
                : index < currentSubStep || subStep.isComplete
                  ? "bg-sage"
                  : "bg-border"
            )}
            initial={false}
            animate={{
              width: index === currentSubStep ? 24 : 8,
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        ))}
      </div>

      {/* Current sub-step content with slide animation */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {current && (
            <motion.div
              key={current.id}
              custom={direction}
              variants={mobileVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.25,
                ease: "easeOut",
              }}
            >
              <div className="rounded-xl border border-border bg-background p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-charcoal">
                    {current.title}
                  </h3>
                  {current.subtitle && (
                    <p className="mt-1 text-sm text-foreground-secondary">
                      {current.subtitle}
                    </p>
                  )}
                </div>
                {current.content}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

type DesktopSubStepContainerProps = {
  subSteps: SubStep[];
  currentSubStep: number;
  onSubStepChange: (index: number) => void;
  className?: string;
};

function DesktopSubStepContainer({
  subSteps,
  currentSubStep,
  onSubStepChange,
  className,
}: DesktopSubStepContainerProps) {
  // Track the highest sub-step ever reached (persists even when sections are collapsed)
  const [highestReached, setHighestReached] = useState(Math.max(currentSubStep, 0));

  // Update highest reached when current step increases
  useEffect(() => {
    if (currentSubStep > highestReached) {
      setHighestReached(currentSubStep);
    }
  }, [currentSubStep, highestReached]);

  const handleToggle = useCallback(
    (index: number) => {
      // If clicking on the currently expanded section, collapse it
      if (index === currentSubStep) {
        onSubStepChange(-1); // -1 means no section is expanded
        return;
      }
      // Can click to expand any section up to the highest ever reached, or any completed section
      const canExpand = index <= highestReached || subSteps[index]?.isComplete;
      if (canExpand) {
        onSubStepChange(index);
      }
    },
    [currentSubStep, highestReached, subSteps, onSubStepChange]
  );

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {subSteps.map((subStep, index) => {
        const isExpanded = index === currentSubStep;
        const isCompleted = subStep.isComplete;
        // Can expand if within highest reached step or completed
        const canExpand = index <= highestReached || isCompleted;
        const isPending = index > highestReached && !isCompleted;

        return (
          <motion.div
            key={subStep.id}
            layout
            className={cn(
              "rounded-xl border bg-background",
              isExpanded
                ? "border-brand-primary/30 shadow-sm"
                : isCompleted
                  ? "border-sage/30"
                  : "border-border",
              isPending && "opacity-60"
            )}
            initial={false}
            animate={{
              opacity: isPending ? 0.6 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            {/* Section Header */}
            <button
              type="button"
              onClick={() => handleToggle(index)}
              disabled={!canExpand}
              className={cn(
                "flex w-full items-center justify-between p-5 text-left transition-colors",
                canExpand && "cursor-pointer hover:bg-sand/50",
                !canExpand && "cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                    isExpanded
                      ? "bg-brand-primary text-white"
                      : isCompleted
                        ? "bg-sage/20 text-sage"
                        : "bg-surface text-stone"
                  )}
                  layout
                >
                  {isCompleted && !isExpanded ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </motion.div>
                <div>
                  <h3
                    className={cn(
                      "text-base font-semibold",
                      isExpanded || isCompleted ? "text-charcoal" : "text-stone"
                    )}
                  >
                    {subStep.title}
                  </h3>
                  <AnimatePresence mode="wait">
                    {subStep.subtitle && !isExpanded && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="mt-0.5 text-sm text-stone"
                      >
                        {subStep.subtitle}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {canExpand && (
                <motion.div
                  className="text-stone"
                  initial={false}
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-5 w-5" />
                </motion.div>
              )}
            </button>

            {/* Section Content with CSS grid height transition */}
            <div
              className="grid transition-[grid-template-rows] duration-[250ms] ease-out"
              style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div
                  className="border-t border-border px-5 pb-5 pt-4 transition-opacity duration-200 ease-out"
                  style={{ opacity: isExpanded ? 1 : 0 }}
                >
                  {subStep.content}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
