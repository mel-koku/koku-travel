"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lightbulb, X, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { SmartPromptCardB } from "./SmartPromptCardB";
import { SmartPromptGroupCardB } from "./SmartPromptGroupCardB";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export type SmartPromptsDrawerBProps = {
  gaps: DetectedGap[];
  onAccept: (gap: DetectedGap) => void;
  onSkip: (gap: DetectedGap) => void;
  onDismissAll: () => void;
  loadingGapId?: string | null;
  className?: string;
};

export function SmartPromptsDrawerB({
  gaps,
  onAccept,
  onSkip,
  onDismissAll,
  loadingGapId,
  className,
}: SmartPromptsDrawerBProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(gaps.length > 0);

  useEffect(() => {
    if (gaps.length > 0) setIsVisible(true);
  }, [gaps.length]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismissAll();
  }, [onDismissAll]);

  // Group meal gaps by mealType across days
  const { groupedMeals, individualGaps, displayCount } = useMemo(() => {
    const mealMap = new Map<
      string,
      { restaurant: DetectedGap[]; konbini: DetectedGap[] }
    >();
    const nonMeal: DetectedGap[] = [];

    for (const gap of gaps) {
      if (
        gap.action.type === "add_meal" ||
        gap.action.type === "quick_meal"
      ) {
        const key = gap.action.mealType;
        if (!mealMap.has(key)) {
          mealMap.set(key, { restaurant: [], konbini: [] });
        }
        const group = mealMap.get(key)!;
        if (gap.action.type === "add_meal") {
          group.restaurant.push(gap);
        } else {
          group.konbini.push(gap);
        }
      } else {
        nonMeal.push(gap);
      }
    }

    // Split into multi-day groups vs single-day individuals
    const grouped: {
      mealType: "breakfast" | "lunch" | "dinner";
      restaurant: DetectedGap[];
      konbini: DetectedGap[];
    }[] = [];
    const singleDayMeals: DetectedGap[] = [];

    const mealOrder: ("breakfast" | "lunch" | "dinner")[] = [
      "breakfast",
      "lunch",
      "dinner",
    ];
    for (const mt of mealOrder) {
      const entry = mealMap.get(mt);
      if (!entry) continue;
      const dayCount = Math.max(entry.restaurant.length, entry.konbini.length);
      if (dayCount >= 2) {
        grouped.push({
          mealType: mt,
          restaurant: entry.restaurant,
          konbini: entry.konbini,
        });
      } else {
        singleDayMeals.push(...entry.restaurant, ...entry.konbini);
      }
    }

    const individual = [...singleDayMeals, ...nonMeal];
    const count = grouped.length + individual.length;

    return { groupedMeals: grouped, individualGaps: individual, displayCount: count };
  }, [gaps]);

  if (!isVisible || gaps.length === 0) return null;

  const renderCards = () => (
    <>
      {groupedMeals.map((group) => (
        <SmartPromptGroupCardB
          key={`group-${group.mealType}`}
          mealType={group.mealType}
          restaurantGaps={group.restaurant}
          konbiniGaps={group.konbini}
          onAccept={onAccept}
          onSkip={onSkip}
          loadingGapId={loadingGapId}
        />
      ))}
      {individualGaps.map((gap) => (
        <SmartPromptCardB
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
          className="rounded-t-2xl border-t border-x pb-[env(safe-area-inset-bottom)]"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
            boxShadow: "var(--shadow-elevated)",
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
            className="flex w-full cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--surface)]"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" style={{ color: "var(--primary)" }} />
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {displayCount} suggestion{displayCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[var(--surface)]"
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
              <div className="flex flex-col gap-3">
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
          transition={{ duration: 0.3, ease: bEase }}
          className={`fixed right-0 top-[var(--header-h)] bottom-0 z-40 hidden w-80 border-l lg:block xl:w-96 ${className ?? ""}`}
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
            boxShadow: "var(--shadow-elevated)",
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
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Smart Suggestions
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  color: "var(--primary)",
                }}
              >
                {displayCount}
              </span>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[var(--surface)]"
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
              We noticed some opportunities to enhance your itinerary. Add meals,
              optimize transport, or discover more experiences.
            </p>
          </div>

          {/* Content */}
          <div data-lenis-prevent className="h-[calc(100%-120px)] overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
              {renderCards()}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
