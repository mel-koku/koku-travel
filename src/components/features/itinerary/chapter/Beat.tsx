"use client";

import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography-system";
import type { Location } from "@/types/location";

export type BeatChip = {
  id: string;
  label: string;
  tone: "neutral" | "warn";
  /**
   * When true and the parent indicates day-of mode, this chip renders as an
   * inline bold line below the body instead of in the chip row. Task 31 wires
   * the behavior; Beat itself treats this as a render hint only.
   */
  promoteInline?: boolean;
};

export type BeatProps = {
  time: string; // "08:00"
  partOfDay: "Morning" | "Midday" | "Afternoon" | "Evening" | "Night";
  location: Location;
  body: string;
  isPast: boolean;
  chips: BeatChip[];
  hasMore?: boolean;
  onExpand: () => void;
};

const formatDuration = (raw: number | string | null | undefined): string => {
  const minutes = typeof raw === "string" ? parseInt(raw, 10) : raw;
  if (!minutes || minutes <= 0 || isNaN(minutes)) return "";
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `~${h}h ${m}m` : `~${h}h`;
  }
  return `~${minutes}m`;
};

export function Beat({
  time,
  partOfDay,
  location,
  body,
  isPast,
  chips,
  hasMore = false,
  onExpand,
}: BeatProps) {
  const duration = formatDuration(
    (location as unknown as { estimatedDuration?: number | string }).estimatedDuration,
  );

  return (
    <li
      data-beat="place"
      data-beat-state={isPast ? "past" : "future"}
      className="relative pb-8"
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-[-24px] top-[8px] h-[13px] w-[13px] rounded-full border-2 border-foreground",
          isPast ? "bg-foreground" : "bg-background",
        )}
      />
      <div className="eyebrow-editorial mb-1">
        {time} · {partOfDay}
      </div>
      <h3 className={cn(typography({ intent: "editorial-h3" }), "mb-1")}>
        {location.name}
      </h3>
      <div className="text-xs text-foreground-secondary mb-2">
        {location.category}
        {duration ? ` · ${duration}` : ""}
      </div>
      <p className="text-sm text-foreground-body leading-relaxed max-w-[52ch]">
        {body}
      </p>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className={cn(
                "text-[11px] px-2.5 py-0.5 rounded-full border",
                chip.tone === "warn"
                  ? "text-warning border-warning/40"
                  : "text-foreground-secondary border-border",
              )}
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}
      {hasMore && (
        <button
          type="button"
          onClick={onExpand}
          className="mt-3 text-xs text-accent underline underline-offset-2"
        >
          More ↓
        </button>
      )}
    </li>
  );
}
