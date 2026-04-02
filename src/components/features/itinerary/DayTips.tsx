"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { ItineraryDay } from "@/types/itinerary";
import { useDayTipsCore } from "@/hooks/useDayTipsCore";

const DISMISSED_TIPS_KEY = "koku-dismissed-tips";

function getDismissedTips(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_TIPS_KEY);
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissedTips(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_TIPS_KEY, JSON.stringify([...ids]));
  } catch {
    // Silently fail
  }
}

type DayTipsProps = {
  day: ItineraryDay;
  tripStartDate?: string;
  dayIndex: number;
  className?: string;
  /** When true, renders just the tip items without the accordion wrapper */
  embedded?: boolean;
  /** Callback fired when tip count changes (for parent badge) */
  onTipCount?: (count: number) => void;
  /** Whether this is the traveler's first time visiting Japan */
  isFirstTimeVisitor?: boolean;
  /** When true, luggage smart prompt is active — suppress the "Send luggage ahead" pro tip */
  hasLuggagePrompt?: boolean;
  /** DB tip IDs already surfaced as smart prompts — suppress from day tips */
  surfacedGuidanceIds?: Set<string>;
  /** Tip IDs already shown on prior days — used for cross-day dedup */
  previousDaysTipIds?: Set<string>;
  /** Callback fired with emitted tip IDs (for cross-day dedup tracking) */
  onTipsEmitted?: (dayIndex: number, tipIds: string[]) => void;
  /** When true, runs fetch logic and fires onTipCount but renders nothing */
  countOnly?: boolean;
};


export function DayTips({ day, tripStartDate, dayIndex, className, embedded, onTipCount, isFirstTimeVisitor, hasLuggagePrompt, surfacedGuidanceIds, previousDaysTipIds, onTipsEmitted, countOnly }: DayTipsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTipId, setExpandedTipId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => getDismissedTips());

  const handleDismiss = useCallback((tipId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(tipId);
      persistDismissedTips(next);
      return next;
    });
  }, []);

  const { allTips: coreTips, isLoading } = useDayTipsCore(day, tripStartDate, dayIndex, {
    isFirstTimeVisitor,
    hasLuggagePrompt,
    surfacedGuidanceIds,
    previousDaysTipIds,
  });

  const allTips = useMemo(
    () => coreTips.filter((tip) => !dismissedIds.has(tip.id)),
    [coreTips, dismissedIds],
  );

  // Report tip count to parent
  useEffect(() => {
    onTipCount?.(allTips.length);
  }, [allTips.length, onTipCount]);

  // Report emitted tip IDs for cross-day dedup
  useEffect(() => {
    if (onTipsEmitted && allTips.length > 0) {
      onTipsEmitted(dayIndex, allTips.map((t) => t.id));
    }
  }, [allTips, dayIndex, onTipsEmitted]);

  // Count-only mode: run fetch + report count, but render nothing
  if (countOnly) {
    return null;
  }

  // Don't render if no tips
  if (!isLoading && allTips.length === 0) {
    return null;
  }

  const renderTipItems = () => {
    if (isLoading) {
      return (
        <div className="py-2 text-center text-xs text-stone">
          Loading tips...
        </div>
      );
    }
    return allTips.map((tip) => {
      const isTipExpanded = expandedTipId === tip.id;
      return (
        <div
          key={tip.id}
          className="flex items-start gap-2 rounded-lg bg-background/70 p-2 text-left"
        >
          <span className="shrink-0 text-base">
            {tip.icon}
          </span>
          <div
            className={`min-w-0 flex-1${tip.content ? " cursor-pointer" : ""}`}
            {...(tip.content ? {
              role: "button",
              tabIndex: 0,
              "aria-expanded": isTipExpanded,
              onClick: () => setExpandedTipId(isTipExpanded ? null : tip.id),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setExpandedTipId(isTipExpanded ? null : tip.id);
                }
              },
            } : {})}
          >
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-foreground">
                {tip.title}
              </p>
              {tip.content && (
                <svg
                  className={`h-3 w-3 shrink-0 text-foreground-secondary/50 transition-transform ${isTipExpanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
              {tip.summary}
            </p>
            {tip.content && isTipExpanded && (
              <p className="mt-1.5 border-t border-border/50 pt-1.5 text-xs leading-relaxed text-foreground-secondary/80">
                {tip.content}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleDismiss(tip.id)}
            className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground-secondary transition-colors hover:bg-surface hover:text-foreground"
          >
            Got it
          </button>
        </div>
      );
    });
  };

  // Embedded mode: just render the items without wrapper
  if (embedded) {
    return <>{renderTipItems()}</>;
  }

  return (
    <div className={`rounded-lg border border-brand-primary/20 bg-brand-primary/5 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{"\uD83C\uDDEF\uD83C\uDDF5"}</span>
          <span className="text-sm font-semibold text-foreground">
            Travel Tips for Today
          </span>
          {!isLoading && (
            <span className="rounded-full bg-brand-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-brand-primary">
              {allTips.length}
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-brand-primary transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-brand-primary/10 px-3 pb-3">
          <div className="mt-2 space-y-2">
            {renderTipItems()}
          </div>
        </div>
      )}
    </div>
  );
}
