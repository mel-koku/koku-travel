"use client";

import { useState, useCallback } from "react";
import type { GuideContentType, GuideSegment } from "@/types/itineraryGuide";

const DISMISSED_GUIDE_KEY = "yuku-dismissed-guide-segments";

function getDismissedSegments(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_GUIDE_KEY);
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissedSegment(id: string) {
  try {
    const current = getDismissedSegments();
    current.add(id);
    localStorage.setItem(DISMISSED_GUIDE_KEY, JSON.stringify([...current]));
  } catch {
    // Silently fail
  }
}

type GuideSegmentCardProps = {
  segment: GuideSegment;
  className?: string;
};

const STYLE_MAP: Record<
  GuideContentType,
  { label: string; dismissible: boolean }
> = {
  trip_overview: { label: "Trip Overview", dismissible: false },
  day_intro: { label: "Today's Plan", dismissible: false },
  activity_context: { label: "Up Next", dismissible: false },
  cultural_moment: { label: "Cultural Insight", dismissible: true },
  practical_tip: { label: "Pro Tip", dismissible: true },
  day_summary: { label: "Day Wrap-Up", dismissible: false },
  neighborhood_narrative: { label: "Neighborhood", dismissible: true },
  neighborhood_walk: { label: "Neighborhood Walk", dismissible: true },
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
  const [isDismissed, setIsDismissed] = useState(() => getDismissedSegments().has(segment.id));
  const style = STYLE_MAP[segment.type];
  const icon = segment.icon ?? DEFAULT_ICONS[segment.type];

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    persistDismissedSegment(segment.id);
  }, [segment.id]);

  if (isDismissed) return null;

  return (
    <div
      className={`rounded-md bg-surface transition-all ${className}`}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        {/* Expand/collapse toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <span className="mt-0.5 shrink-0 text-xs">{icon}</span>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone">
              {style.label}
            </span>
            <p className={`mt-0.5 text-xs leading-relaxed ${isCollapsed ? "truncate text-foreground-secondary" : "text-foreground-secondary"}`}>
              {segment.content}
            </p>
          </div>
          <svg
            className={`mt-1 h-3 w-3 shrink-0 text-stone/40 transition-transform ${
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

        {/* Dismiss button */}
        {style.dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className="mt-0.5 shrink-0 rounded p-0.5 text-stone/40 transition-colors hover:text-foreground"
            aria-label={`Dismiss ${style.label}`}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
