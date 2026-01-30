"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { SmartPromptCard } from "./SmartPromptCard";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";

export type SmartPromptsDrawerProps = {
  gaps: DetectedGap[];
  onAccept: (gap: DetectedGap) => void;
  onSkip: (gap: DetectedGap) => void;
  onDismissAll: () => void;
  loadingGapId?: string | null;
  className?: string;
};

export function SmartPromptsDrawer({
  gaps,
  onAccept,
  onSkip,
  onDismissAll,
  loadingGapId,
  className,
}: SmartPromptsDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(gaps.length > 0);

  // Auto-show when gaps change
  useEffect(() => {
    if (gaps.length > 0) {
      setIsVisible(true);
    }
  }, [gaps.length]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismissAll();
  }, [onDismissAll]);

  if (!isVisible || gaps.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile: Bottom Sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 lg:hidden",
          "transform transition-transform duration-300 ease-out",
          isExpanded ? "translate-y-0" : "translate-y-[calc(100%-56px)]",
          className
        )}
      >
        <div className="rounded-t-2xl border-t border-x border-border bg-background shadow-lg">
          {/* Handle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-brand-primary" />
              <span className="text-sm font-semibold text-charcoal">
                {gaps.length} suggestion{gaps.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss();
                }}
                className="rounded-full p-1 text-stone hover:bg-sand"
              >
                <X className="h-4 w-4" />
              </button>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-stone" />
              ) : (
                <ChevronUp className="h-5 w-5 text-stone" />
              )}
            </div>
          </button>

          {/* Content */}
          {isExpanded && (
            <div className="max-h-[60vh] overflow-y-auto px-4 pb-4">
              <div className="flex flex-col gap-3">
                {gaps.map((gap) => (
                  <SmartPromptCard
                    key={gap.id}
                    gap={gap}
                    onAccept={onAccept}
                    onSkip={onSkip}
                    isLoading={loadingGapId === gap.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: Side Panel */}
      <div
        className={cn(
          "hidden lg:block fixed right-0 top-16 bottom-0 z-40 w-80 xl:w-96",
          "border-l border-border bg-background shadow-lg",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-brand-primary" />
            <span className="text-sm font-semibold text-charcoal">
              Smart Suggestions
            </span>
            <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">
              {gaps.length}
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-full p-1 text-stone hover:bg-sand"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Description */}
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs text-stone">
            We noticed some opportunities to enhance your itinerary. Add meals,
            optimize transport, or discover more experiences.
          </p>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-120px)] overflow-y-auto p-4">
          <div className="flex flex-col gap-3">
            {gaps.map((gap) => (
              <SmartPromptCard
                key={gap.id}
                gap={gap}
                onAccept={onAccept}
                onSkip={onSkip}
                isLoading={loadingGapId === gap.id}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Hook to manage smart prompts state.
 */
export function useSmartPrompts(initialGaps: DetectedGap[]) {
  const [gaps, setGaps] = useState<DetectedGap[]>(initialGaps);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());

  const visibleGaps = gaps.filter(
    (gap) => !skippedIds.has(gap.id) && !acceptedIds.has(gap.id)
  );

  const handleAccept = useCallback((gap: DetectedGap) => {
    setAcceptedIds((prev) => new Set([...prev, gap.id]));
  }, []);

  const handleSkip = useCallback((gap: DetectedGap) => {
    setSkippedIds((prev) => new Set([...prev, gap.id]));
  }, []);

  const handleDismissAll = useCallback(() => {
    const allIds = gaps.map((g) => g.id);
    setSkippedIds(new Set(allIds));
  }, [gaps]);

  const resetPrompts = useCallback((newGaps: DetectedGap[]) => {
    setGaps(newGaps);
    setSkippedIds(new Set());
    setAcceptedIds(new Set());
  }, []);

  return {
    gaps: visibleGaps,
    allGaps: gaps,
    skippedIds,
    acceptedIds,
    handleAccept,
    handleSkip,
    handleDismissAll,
    resetPrompts,
  };
}
