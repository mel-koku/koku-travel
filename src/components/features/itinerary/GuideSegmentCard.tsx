"use client";

import { useState } from "react";
import type { GuideContentType, GuideSegment } from "@/types/itineraryGuide";

type GuideSegmentCardProps = {
  segment: GuideSegment;
  className?: string;
};

const STYLE_MAP: Record<
  GuideContentType,
  { bg: string; border: string; iconBg: string; label: string }
> = {
  trip_overview: {
    bg: "bg-brand-primary/5",
    border: "border-brand-primary/20",
    iconBg: "bg-brand-primary/10",
    label: "Trip Overview",
  },
  day_intro: {
    bg: "bg-sage/5",
    border: "border-sage/20",
    iconBg: "bg-sage/10",
    label: "Today's Plan",
  },
  activity_context: {
    bg: "bg-stone/5",
    border: "border-stone/15",
    iconBg: "bg-stone/10",
    label: "Up Next",
  },
  cultural_moment: {
    bg: "bg-brand-primary/5",
    border: "border-brand-primary/20",
    iconBg: "bg-brand-primary/10",
    label: "Cultural Insight",
  },
  practical_tip: {
    bg: "bg-brand-secondary/5",
    border: "border-brand-secondary/20",
    iconBg: "bg-brand-secondary/10",
    label: "Pro Tip",
  },
  day_summary: {
    bg: "bg-sage/5",
    border: "border-sage/20",
    iconBg: "bg-sage/10",
    label: "Day Wrap-Up",
  },
  neighborhood_narrative: {
    bg: "bg-sage/5",
    border: "border-sage/15",
    iconBg: "bg-sage/10",
    label: "Neighborhood",
  },
  neighborhood_walk: {
    bg: "bg-sage/5",
    border: "border-sage/20",
    iconBg: "bg-sage/10",
    label: "Neighborhood Walk",
  },
};

const DEFAULT_ICONS: Record<GuideContentType, string> = {
  trip_overview: "🗾",
  day_intro: "☀️",
  activity_context: "→",
  cultural_moment: "🏮",
  practical_tip: "💡",
  day_summary: "🌙",
  neighborhood_narrative: "🏘️",
  neighborhood_walk: "🚶",
};

export function GuideSegmentCard({ segment, className = "" }: GuideSegmentCardProps) {
  const defaultCollapsed = segment.type === "cultural_moment" || segment.type === "practical_tip";
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const style = STYLE_MAP[segment.type];
  const icon = segment.icon ?? DEFAULT_ICONS[segment.type];

  return (
    <div
      className={`rounded-xl border ${style.border} ${style.bg} transition-all ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${style.iconBg} text-sm`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-stone">
            {style.label}
          </span>
          {isCollapsed && (
            <p className="mt-0.5 truncate text-xs text-stone/70">
              {segment.content}
            </p>
          )}
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-stone/50 transition-transform ${
            isCollapsed ? "" : "rotate-180"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!isCollapsed && (
        <div className="px-3 pb-3 pt-0">
          <p className="text-sm leading-relaxed text-foreground-secondary">
            {segment.content}
          </p>
        </div>
      )}
    </div>
  );
}
