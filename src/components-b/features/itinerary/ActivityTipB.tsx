"use client";

import { useState } from "react";
import type { ActivityTip } from "@/lib/tips/tipGenerator";

export type ActivityTipBadgeBProps = {
  tip: ActivityTip;
  className?: string;
};

const typeColorMap: Record<string, string> = {
  travel: "var(--primary)",
  reservation: "var(--warning)",
  payment: "var(--success)",
  crowd: "var(--warning)",
  photo: "var(--muted-foreground)",
  weather: "var(--primary)",
  timing: "var(--error)",
  accessibility: "var(--success)",
  budget: "var(--warning)",
  general: "var(--muted-foreground)",
  etiquette: "var(--primary)",
};

export function ActivityTipBadgeB({ tip, className }: ActivityTipBadgeBProps) {
  const [expanded, setExpanded] = useState(false);
  const color = typeColorMap[tip.type] ?? "var(--muted-foreground)";

  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors"
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
          color,
          boxShadow: tip.isImportant
            ? `inset 0 0 0 1px color-mix(in srgb, ${color} 30%, transparent)`
            : undefined,
        }}
      >
        {tip.icon && <span className="text-xs">{tip.icon}</span>}
        <span className="max-w-[120px] truncate">{tip.title}</span>
      </button>

      {expanded && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border p-2"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
            boxShadow: "var(--shadow-elevated)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-2">
            {tip.icon && <span className="text-sm">{tip.icon}</span>}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold" style={{ color }}>
                {tip.title}
              </p>
              <p
                className="mt-0.5 text-xs leading-relaxed"
                style={{ color: "var(--muted-foreground)" }}
              >
                {tip.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type ActivityTipsListBProps = {
  tips: ActivityTip[];
  className?: string;
  maxVisible?: number;
};

export function ActivityTipsListB({
  tips,
  className,
  maxVisible = 2,
}: ActivityTipsListBProps) {
  const [showAll, setShowAll] = useState(false);

  if (tips.length === 0) return null;

  const visibleTips = showAll ? tips : tips.slice(0, maxVisible);
  const hiddenCount = tips.length - maxVisible;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      {visibleTips.map((tip, index) => (
        <ActivityTipBadgeB key={`${tip.type}-${index}`} tip={tip} />
      ))}
      {hiddenCount > 0 && !showAll && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowAll(true);
          }}
          className="rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors"
          style={{
            backgroundColor: "var(--surface)",
            color: "var(--muted-foreground)",
          }}
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  );
}
