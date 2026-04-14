"use client";

import { useState } from "react";
import type { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";
import { StarIcon } from "./activityIcons";
import { numberFormatter } from "./activityUtils";
import { ActivityConflictIndicator } from "./ConflictBadge";
import { PracticalBadges } from "@/components/ui/PracticalBadges";

// Roughly 2 lines of 40-char mobile text; anything longer gets clamped and
// deserves a "Read more" affordance.
const SUMMARY_EXPAND_THRESHOLD = 80;

type PlaceActivityHeaderProps = {
  activity: Extract<ItineraryActivity, { kind: "place" }>;
  placeLocation: Location;
  rating: number | null;
  reviewCount: number | null;
  durationLabel: string | null;
  summary?: string | null;
  availabilityStatus: {
    status: string;
    message?: string;
    reservationRequired?: boolean;
  } | null;
  schedule: Extract<ItineraryActivity, { kind: "place" }>["schedule"];
  isOutOfHours: boolean;
  waitLabel: string | null;
  conflicts?: ItineraryConflict[];
  tipCount?: number;
};

export function PlaceActivityHeader({
  activity,
  placeLocation,
  rating,
  reviewCount,
  durationLabel,
  summary,
  availabilityStatus,
  schedule,
  isOutOfHours,
  waitLabel,
  conflicts,
  tipCount,
}: PlaceActivityHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = !!summary && summary.length > SUMMARY_EXPAND_THRESHOLD;
  return (
    <>
      {/* Title */}
      <h3 className="text-base font-semibold leading-snug text-foreground">
        {placeLocation.name}
      </h3>

      {/* Meta line: city + rating */}
      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="text-xs text-foreground-secondary">
          {placeLocation.city}
          {placeLocation.city && placeLocation.region && placeLocation.city !== placeLocation.region ? `, ${placeLocation.region}` : ""}
        </span>
        {rating ? (
          <div className="flex items-center gap-0.5 font-mono text-[11px] font-medium text-foreground">
            <StarIcon />
            <span>{rating.toFixed(1)}</span>
            {reviewCount ? (
              <span className="font-normal text-stone">
                ({numberFormatter.format(reviewCount)})
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Tags + Status + Practical badges */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {placeLocation.category ? (
          <span className="inline-block rounded-md bg-sand/50 px-2 py-0.5 text-[11px] font-medium text-foreground-secondary capitalize">
            {placeLocation.category}
          </span>
        ) : null}
        {activity.tags?.includes("content-pick") ? (
          <span className="inline-block rounded-md bg-brand-primary/10 px-2 py-0.5 text-[11px] font-medium text-brand-primary">
            Recommended
          </span>
        ) : null}
        {durationLabel ? (
          <span className="inline-block rounded-full bg-sage/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-sage">
            {durationLabel.replace("~", "")}
          </span>
        ) : null}
        <PracticalBadges location={placeLocation} showOpenStatus={false} max={3} showStation={false} />
        {availabilityStatus && availabilityStatus.status === "closed" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
            Closed
          </span>
        )}
        {availabilityStatus && availabilityStatus.status === "busy" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
            Busy
          </span>
        )}
        {(availabilityStatus?.status === "requires_reservation" || availabilityStatus?.reservationRequired) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
            Reservation recommended
          </span>
        )}
        {(schedule?.operatingWindow?.status === "outside" || isOutOfHours) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
            Outside hours
          </span>
        )}
        {waitLabel && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
            {waitLabel}
          </span>
        )}
        {conflicts && conflicts.length > 0 && (
          <ActivityConflictIndicator conflicts={conflicts} />
        )}
        {tipCount != null && tipCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-sage">
            {"💡"} {tipCount} {tipCount === 1 ? "tip" : "tips"}
          </span>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="mt-1.5">
          <p
            className={`text-xs leading-relaxed text-stone ${expanded ? "" : "line-clamp-2"}`}
          >
            {summary}
          </p>
          {canExpand && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="mt-0.5 inline-flex min-h-7 items-center text-[11px] font-medium text-foreground-secondary underline-offset-2 transition-colors hover:text-foreground hover:underline"
              aria-expanded={expanded}
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}
    </>
  );
}
