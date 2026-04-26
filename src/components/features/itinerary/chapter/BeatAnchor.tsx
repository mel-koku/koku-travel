"use client";

import { Home, PlaneLanding } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EntryPoint } from "@/types/trip";

export type BeatAnchorRole = "start" | "end";

export type BeatAnchorProps = {
  role: BeatAnchorRole;
  point: EntryPoint;
  /**
   * When true, the anchor represents the trip arrival airport on Day 1.
   * Drives the icon and copy ("Arrived at …").
   */
  isArrivalAirport?: boolean;
};

/**
 * Lightweight Tier-2 anchor item that opens or closes a day's spine.
 *
 * Anchors are render-only — they never enter `day.activities` and do not
 * participate in transit calc, scoring, or map markers (those are driven by
 * the day's start/end EntryPoints, which already exist on the model). This
 * component is a sibling of `<Beat>` and lives inside the same `<Spine>` so
 * the rail line connects through them.
 */
export function BeatAnchor({ role, point, isArrivalAirport = false }: BeatAnchorProps) {
  const Icon = isArrivalAirport ? PlaneLanding : Home;

  const eyebrow = role === "start"
    ? isArrivalAirport ? "Arrival" : "Start"
    : "End of day";

  // Copy: arrival shows "Arrived at <Airport> (<IATA>)"; lodging shows the
  // accommodation name verbatim. Subtle, no exclamation.
  const title = isArrivalAirport && point.iataCode
    ? `Arrived at ${point.name} (${point.iataCode})`
    : point.name;

  return (
    <li
      data-beat="anchor"
      data-anchor-role={role}
      className={cn("relative pb-4")}
    >
      {/* Rail dot — geometry matches Beat.tsx (left:-24, w:13, h:13) so the
          icon disc centers on Spine's 1px rail at x=12. */}
      <span
        aria-hidden
        className={cn(
          "absolute left-[-24px] top-[10px] flex h-[13px] w-[13px] items-center justify-center rounded-full bg-canvas text-foreground-secondary ring-1 ring-border",
        )}
      >
        <Icon className="h-2 w-2" aria-hidden />
      </span>
      <div className="text-foreground-secondary">
        <div className="eyebrow-editorial mb-0.5">{eyebrow}</div>
        <div className="text-sm font-medium text-foreground/85">{title}</div>
      </div>
    </li>
  );
}
