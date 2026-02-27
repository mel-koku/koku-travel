"use client";

import type { ItineraryActivity, ItineraryTravelMode } from "@/types/itinerary";
import { formatDuration, formatDistance, formatModeLabel } from "@/components/features/itinerary/mapUtils";

const TIME_OF_DAY_LABEL: Record<ItineraryActivity["timeOfDay"], string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

type MapPoint = {
  id: string;
  lat: number;
  lng: number;
};

type TravelSegment = {
  id: string;
  from: Extract<ItineraryActivity, { kind: "place" }>;
  to: Extract<ItineraryActivity, { kind: "place" }>;
  mode: string;
  durationMinutes?: number;
  distanceMeters?: number;
  isFallback?: boolean;
};

type RouteOverviewBProps = {
  placeActivities: Extract<ItineraryActivity, { kind: "place" }>[];
  pointLookup: Map<string, MapPoint>;
  travelSegmentLookup: Map<string, TravelSegment>;
  placeIndexLookup: Map<string, number>;
};

export function RouteOverviewB({
  placeActivities,
  pointLookup,
  travelSegmentLookup,
  placeIndexLookup,
}: RouteOverviewBProps) {
  if (placeActivities.length === 0) {
    return (
      <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
        Add another stop to see door-to-door travel time estimates.
      </p>
    );
  }

  return (
    <ol className="mt-2 space-y-3">
      {placeActivities.map((activity, index) => {
        const placeNumber = placeIndexLookup.get(activity.id) ?? index + 1;
        const point = pointLookup.get(activity.id);
        const travelSegment = travelSegmentLookup.get(activity.id);
        const previousActivity = placeActivities[index - 1];
        const travelDurationLabel = formatDuration(travelSegment?.durationMinutes);
        const travelDistanceLabel = formatDistance(travelSegment?.distanceMeters);
        const previousNumber = previousActivity
          ? placeIndexLookup.get(previousActivity.id) ?? index
          : null;

        return (
          <li
            key={activity.id}
            className="rounded-2xl p-3 text-sm"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow-card)",
              color: "var(--foreground)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {placeNumber}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold" style={{ color: "var(--foreground)" }}>
                  {activity.title}
                </p>
                <div
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <span>{TIME_OF_DAY_LABEL[activity.timeOfDay]}</span>
                  {activity.schedule?.arrivalTime && (
                    <span>
                      Arrive {activity.schedule.arrivalTime}
                      {activity.schedule?.departureTime
                        ? ` · Depart ${activity.schedule.departureTime}`
                        : ""}
                    </span>
                  )}
                  {activity.durationMin && <span>{activity.durationMin} min planned</span>}
                </div>
                {activity.notes && (
                  <p
                    className="line-clamp-2 text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {activity.notes}
                  </p>
                )}
                {activity.tags && activity.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                    {activity.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full px-2 py-0.5 font-semibold"
                        style={{
                          backgroundColor: "var(--surface)",
                          color: "var(--primary)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {activity.tags.length > 3 && (
                      <span
                        className="rounded-full px-2 py-0.5 font-medium"
                        style={{
                          backgroundColor: "var(--surface)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        +{activity.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                {index === 0 && (
                  <p className="text-xs font-medium" style={{ color: "var(--primary)" }}>
                    Day kickoff
                  </p>
                )}
              </div>
              <div className="mt-0.5 shrink-0">
                {point ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--success) 10%, transparent)",
                      color: "var(--success)",
                    }}
                  >
                    On map
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--warning) 10%, transparent)",
                      color: "var(--warning)",
                    }}
                  >
                    Location unknown
                  </span>
                )}
              </div>
            </div>
            {index > 0 && (
              <div
                className="mt-3 rounded-xl p-3 text-xs"
                style={{
                  backgroundColor: "var(--surface)",
                  color: "var(--muted-foreground)",
                }}
              >
                <p className="font-semibold" style={{ color: "var(--foreground)" }}>
                  Travel from Stop {previousNumber} ·{" "}
                  {previousActivity?.title ?? "Previous stop"}
                </p>
                {travelSegment ? (
                  <>
                    <p className="mt-0.5">
                      {[travelDurationLabel, travelDistanceLabel]
                        .filter(Boolean)
                        .join(" · ") || "Travel details unavailable"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor:
                            "color-mix(in srgb, var(--primary) 10%, transparent)",
                          color: "var(--primary)",
                        }}
                      >
                        {formatModeLabel(travelSegment.mode as ItineraryTravelMode)}
                      </span>
                      {travelSegment.isFallback && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            backgroundColor:
                              "color-mix(in srgb, var(--warning) 10%, transparent)",
                            color: "var(--warning)",
                          }}
                        >
                          Estimated
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    Travel estimate unavailable for this leg. We&apos;ll keep your
                    place on the map once we can locate it.
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
