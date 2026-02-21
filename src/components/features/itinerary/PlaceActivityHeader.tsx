import type { MouseEvent } from "react";
import type { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";
import { StarIcon } from "./activityIcons";
import { numberFormatter } from "./activityUtils";
import { ActivityConflictIndicator } from "./ConflictBadge";
import { PracticalBadges } from "@/components/ui/PracticalBadges";

type PlaceActivityHeaderProps = {
  activity: Extract<ItineraryActivity, { kind: "place" }>;
  placeLocation: Location;
  rating: number | null;
  reviewCount: number | null;
  durationLabel: string | null;
  summary: string | null;
  isExpanded: boolean;
  onToggleExpand: (event: MouseEvent<HTMLButtonElement>) => void;
  availabilityStatus: {
    status: string;
    message?: string;
    reservationRequired?: boolean;
  } | null;
  schedule: Extract<ItineraryActivity, { kind: "place" }>["schedule"];
  isOutOfHours: boolean;
  waitLabel: string | null;
  conflicts?: ItineraryConflict[];
};

/**
 * Title, location info, tags, status badges, and description
 * for a place activity card.
 */
export function PlaceActivityHeader({
  activity,
  placeLocation,
  rating,
  reviewCount,
  durationLabel,
  summary,
  isExpanded,
  onToggleExpand,
  availabilityStatus,
  schedule,
  isOutOfHours,
  waitLabel,
  conflicts,
}: PlaceActivityHeaderProps) {
  return (
    <>
      {/* Title Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-tight text-foreground sm:text-lg">
            {placeLocation.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
        </div>
      </div>

      {/* Tags Row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {placeLocation.category ? (
          <span className="inline-block rounded-xl bg-sand/50 px-2 py-0.5 text-[11px] font-medium text-foreground-secondary capitalize">
            {placeLocation.category}
          </span>
        ) : null}
        {activity.tags?.includes("content-pick") ? (
          <span className="inline-block rounded-xl bg-brand-primary/10 px-2 py-0.5 text-[11px] font-medium text-brand-primary">
            Recommended
          </span>
        ) : null}
        {durationLabel ? (
          <span className="inline-block rounded-full bg-sage/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-sage">
            {durationLabel.replace("~", "")}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onToggleExpand}
          className="inline-flex items-center gap-1 rounded-full border border-sage/30 bg-background px-2 py-0.5 text-[11px] font-semibold text-sage shadow-sm transition hover:bg-sage/10"
        >
          <svg className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {isExpanded ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          {isExpanded ? "Less info" : "More info"}
        </button>
      </div>

      {/* Practical Intel Badges */}
      <div className="mt-1.5">
        <PracticalBadges location={placeLocation} showOpenStatus={false} max={3} />
      </div>

      {/* Status Badges */}
      {(availabilityStatus || (schedule?.operatingWindow?.status === "outside") || isOutOfHours || waitLabel || (conflicts && conflicts.length > 0)) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
        </div>
      )}

      {/* Description */}
      {summary && (
        <p className={`mt-3 text-xs leading-relaxed text-foreground-secondary ${isExpanded ? "" : "line-clamp-2"}`}>{summary}</p>
      )}
    </>
  );
}
