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

/* ── Combined day guide card (collapsed by default) ── */

type DayGuideCardProps = {
  segments: GuideSegment[];
  className?: string;
};

export function DayGuideCard({ segments, className = "" }: DayGuideCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (segments.length === 0) return null;

  // Use the day_intro content as the preview, fall back to first segment
  const intro = segments.find((s) => s.type === "day_intro") ?? segments[0]!;
  const rest = segments.filter((s) => s !== intro);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-[var(--card)]",
        className,
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors duration-200 hover:bg-[var(--surface)]"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-sm">
          {intro.icon ?? DEFAULT_ICONS[intro.type]}
        </span>
        <p
          className={cn("min-w-0 flex-1 text-sm", !isOpen && "truncate")}
          style={{ color: "var(--muted-foreground)" }}
        >
          {intro.content}
        </p>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          style={{ color: "var(--muted-foreground)" }}
        />
      </button>

      {isOpen && rest.length > 0 && (
        <div className="space-y-3 px-4 pb-4">
          {rest.map((seg) => (
            <div key={seg.id} className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-xs">
                {seg.icon ?? DEFAULT_ICONS[seg.type]}
              </span>
              <div className="min-w-0 flex-1">
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {LABEL_MAP[seg.type]}
                </span>
                <p
                  className="mt-0.5 text-sm leading-relaxed"
                  style={{ color: "var(--foreground-body)" }}
                >
                  {seg.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Individual guide segment card ── */

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
            className="text-xs font-semibold uppercase tracking-[0.2em]"
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
