import { memo } from "react";
import type { ItineraryDay } from "@/types/itinerary";
import { formatCityName } from "@/lib/itinerary/dayLabel";

type TimelineCityTransitionProps = {
  cityTransition: NonNullable<ItineraryDay["cityTransition"]>;
};

export const TimelineCityTransition = memo(function TimelineCityTransition({
  cityTransition,
}: TimelineCityTransitionProps) {
  return (
    <div className="rounded-lg border-2 border-dashed border-sage/30 bg-sage/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-sage"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground">
            Traveling from {formatCityName(cityTransition.fromCityId)} to{" "}
            {formatCityName(cityTransition.toCityId)}
          </h4>
          <div className="mt-1 space-y-1 text-sm text-foreground-secondary">
            <div className="flex items-center gap-2">
              <span className="font-medium">Mode:</span>
              <span className="capitalize">{cityTransition.mode}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Duration:</span>
              <span className="font-mono">
                {cityTransition.durationMinutes} minute
                {cityTransition.durationMinutes !== 1 ? "s" : ""}
              </span>
            </div>
            {cityTransition.departureTime && cityTransition.arrivalTime && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Time:</span>
                <span className="font-mono">
                  {cityTransition.departureTime} → {cityTransition.arrivalTime}
                </span>
              </div>
            )}
            {cityTransition.notes && (
              <p className="text-xs text-sage">{cityTransition.notes}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
