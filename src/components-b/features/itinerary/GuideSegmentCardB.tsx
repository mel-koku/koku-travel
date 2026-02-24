"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { GuideContentType, GuideSegment } from "@/types/itineraryGuide";
import { cn } from "@/lib/cn";

type GuideSegmentCardBProps = {
  segment: GuideSegment;
  className?: string;
};

const LABEL_MAP: Record<GuideContentType, string> = {
  trip_overview: "Trip Overview",
  day_intro: "Today's Plan",
  activity_context: "Up Next",
  cultural_moment: "Cultural Insight",
  practical_tip: "Pro Tip",
  day_summary: "Day Wrap-Up",
};

const DEFAULT_ICONS: Record<GuideContentType, string> = {
  trip_overview: "\u{1f5fe}",
  day_intro: "\u2600\ufe0f",
  activity_context: "\u2192",
  cultural_moment: "\u{1f3ee}",
  practical_tip: "\u{1f4a1}",
  day_summary: "\u{1f319}",
};

export function GuideSegmentCardB({
  segment,
  className = "",
}: GuideSegmentCardBProps) {
  const defaultCollapsed =
    segment.type === "cultural_moment" || segment.type === "practical_tip";
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const label = LABEL_MAP[segment.type];
  const icon = segment.icon ?? DEFAULT_ICONS[segment.type];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border-l-[3px] bg-[var(--card)] transition-shadow duration-300",
        className,
      )}
      style={{
        borderLeftColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Header / Toggle */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors duration-200 hover:bg-[var(--surface)]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm">
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: "var(--primary)" }}
          >
            {label}
          </span>
          {isCollapsed && (
            <p
              className="mt-0.5 truncate text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {segment.content}
            </p>
          )}
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            !isCollapsed && "rotate-180",
          )}
          style={{ color: "var(--muted-foreground)" }}
        />
      </button>

      {/* Body */}
      {!isCollapsed && (
        <div className="px-4 pb-4 pt-0">
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--foreground-body)" }}
          >
            {segment.content}
          </p>
        </div>
      )}
    </div>
  );
}
