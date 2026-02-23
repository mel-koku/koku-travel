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
  // summary removed — "More info" link replaces inline description
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

      {/* Tags + Status Row */}
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

      {/* Practical Intel Badges */}
      <div className="mt-1.5">
        <PracticalBadges location={placeLocation} showOpenStatus={false} max={3} />
      </div>

      {/* More info link */}
      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-sage">
        More info
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </>
  );
}
