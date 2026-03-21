"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lightbulb, X, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cEase } from "@c/ui/motionC";
import { SmartPromptCardC } from "./SmartPromptCardC";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";

export type SmartPromptsDrawerCProps = {
  gaps: DetectedGap[];
  onAccept: (gap: DetectedGap) => void;
  onSkip: (gap: DetectedGap) => void;
  onDismissAll: () => void;
  loadingGapId?: string | null;
  className?: string;
};

export function SmartPromptsDrawerC({
  gaps,
  onAccept,
  onSkip,
  onDismissAll,
  loadingGapId,
  className,
}: SmartPromptsDrawerCProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(gaps.length > 0);

  // Meal gaps are handled by day-level suggestions, so exclude them here
  const nonMealGaps = useMemo(
    () => gaps.filter((gap) => gap.action.type !== "add_meal" && gap.action.type !== "quick_meal"),
    [gaps]
  );

  useEffect(() => {
    if (nonMealGaps.length > 0) setIsVisible(true);
  }, [nonMealGaps.length]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismissAll();
  }, [onDismissAll]);

  if (!isVisible || nonMealGaps.length === 0) return null;

  const renderCards = () => (
    <>
      {nonMealGaps.map((gap) => (
        <SmartPromptCardC
          key={gap.id}
          gap={gap}
          onAccept={onAccept}
          onSkip={onSkip}
          isLoading={loadingGapId === gap.id}
        />
      ))}
    </>
  );

  return (
    <>
      {/* Mobile: Bottom Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 lg:hidden ${className ?? ""}`}
        style={{
          transform: isExpanded ? "translateY(0)" : "translateY(calc(100% - 56px))",
          transition: "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
      >
        <div
          className="border-t pb-[env(safe-area-inset-bottom)] px-[env(safe-area-inset-left,0px)]"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
          }}
        >
          {/* Handle */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsExpanded(!isExpanded)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsExpanded(!isExpanded);
              }
            }}
            className="flex w-full cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" style={{ color: "var(--primary)" }} />
              <span
                className="text-[11px] font-bold uppercase tracking-[0.15em]"
                style={{ color: "var(--foreground)" }}
              >
                {nonMealGaps.length} suggestion{nonMealGaps.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss();
                }}
                className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
                style={{ color: "var(--muted-foreground)" }}
              >
                <X className="h-4 w-4" />
              </button>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5" style={{ color: "var(--muted-foreground)" }} />
              ) : (
                <ChevronUp className="h-5 w-5" style={{ color: "var(--muted-foreground)" }} />
              )}
            </div>
          </div>

          {isExpanded && (
            <div data-lenis-prevent className="max-h-[60vh] overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="flex flex-col gap-0">
                {renderCards()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: Side Panel */}
      <AnimatePresence>
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.3, ease: cEase }}
          className={`fixed right-0 top-[var(--header-h)] bottom-0 z-40 hidden w-80 border-l lg:block xl:w-96 ${className ?? ""}`}
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" style={{ color: "var(--primary)" }} />
              <span
                className="text-[11px] font-bold uppercase tracking-[0.15em]"
                style={{ color: "var(--foreground)" }}
              >
                Smart Suggestions
              </span>
              <span
                className="border px-2 py-0.5 text-[10px] font-bold"
                style={{
                  borderColor: "var(--primary)",
                  color: "var(--primary)",
                }}
              >
                {nonMealGaps.length}
              </span>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
              style={{ color: "var(--muted-foreground)" }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Description */}
          <div
            className="border-b px-4 py-3"
            style={{ borderColor: "var(--border)" }}
          >
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Opportunities to enhance your itinerary. Optimize transport, discover more experiences, and more.
            </p>
          </div>

          {/* Content */}
          <div data-lenis-prevent className="h-[calc(100%-120px)] overflow-y-auto p-4">
            <div className="flex flex-col gap-0">
              {renderCards()}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
