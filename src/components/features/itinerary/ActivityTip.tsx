"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { ActivityTip } from "@/lib/tips/tipGenerator";

export type ActivityTipBadgeProps = {
  tip: ActivityTip;
  className?: string;
};

/**
 * Small badge showing a single tip.
 * Used inline on activity rows.
 */
export function ActivityTipBadge({ tip, className }: ActivityTipBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  const typeStyles: Record<string, { bg: string; text: string }> = {
    travel: { bg: "bg-blue-50", text: "text-blue-700" },
    reservation: { bg: "bg-amber-50", text: "text-amber-700" },
    payment: { bg: "bg-emerald-50", text: "text-emerald-700" },
    crowd: { bg: "bg-orange-50", text: "text-orange-700" },
    photo: { bg: "bg-purple-50", text: "text-purple-700" },
    weather: { bg: "bg-sky-50", text: "text-sky-700" },
    timing: { bg: "bg-rose-50", text: "text-rose-700" },
    accessibility: { bg: "bg-teal-50", text: "text-teal-700" },
    budget: { bg: "bg-lime-50", text: "text-lime-700" },
    general: { bg: "bg-gray-50", text: "text-gray-700" },
    etiquette: { bg: "bg-indigo-50", text: "text-indigo-700" },
  };

  const defaultStyles = { bg: "bg-gray-50", text: "text-gray-700" };
  const styles = typeStyles[tip.type] ?? defaultStyles;

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition",
          styles.bg,
          styles.text,
          tip.isImportant && "ring-1 ring-current/30"
        )}
      >
        {tip.icon && <span className="text-xs">{tip.icon}</span>}
        <span className="truncate max-w-[120px]">{tip.title}</span>
      </button>

      {expanded && (
        <div
          className={cn(
            "absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-background p-2 shadow-lg",
            styles.bg
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-2">
            {tip.icon && <span className="text-sm">{tip.icon}</span>}
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-semibold", styles.text)}>
                {tip.title}
              </p>
              <p className="mt-0.5 text-xs text-warm-gray leading-relaxed">
                {tip.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type ActivityTipsListProps = {
  tips: ActivityTip[];
  className?: string;
  maxVisible?: number;
};

/**
 * Display multiple tips as badges.
 */
export function ActivityTipsList({
  tips,
  className,
  maxVisible = 2,
}: ActivityTipsListProps) {
  const [showAll, setShowAll] = useState(false);

  if (tips.length === 0) {
    return null;
  }

  const visibleTips = showAll ? tips : tips.slice(0, maxVisible);
  const hiddenCount = tips.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visibleTips.map((tip, index) => (
        <ActivityTipBadge key={`${tip.type}-${index}`} tip={tip} />
      ))}
      {hiddenCount > 0 && !showAll && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowAll(true);
          }}
          className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-stone hover:bg-sand transition"
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  );
}

export type CompactTipProps = {
  tip: ActivityTip;
  className?: string;
};

/**
 * Very compact tip display for tight spaces.
 * Shows just icon and short title.
 */
export function CompactTip({ tip, className }: CompactTipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] text-warm-gray",
        tip.isImportant && "font-medium text-charcoal",
        className
      )}
      title={`${tip.title}: ${tip.message}`}
    >
      {tip.icon && <span>{tip.icon}</span>}
      <span className="truncate max-w-[100px]">{tip.title}</span>
    </span>
  );
}
