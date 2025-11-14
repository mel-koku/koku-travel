import type { ItineraryActivity } from "@/types/itinerary";
import { formatDuration, formatDistance, formatModeLabel } from "./mapUtils";

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

type RouteOverviewProps = {
  placeActivities: Extract<ItineraryActivity, { kind: "place" }>[];
  pointLookup: Map<string, MapPoint>;
  travelSegmentLookup: Map<string, TravelSegment>;
  placeIndexLookup: Map<string, number>;
};

export function RouteOverview({
  placeActivities,
  pointLookup,
  travelSegmentLookup,
  placeIndexLookup,
}: RouteOverviewProps) {
  if (placeActivities.length === 0) {
    return (
      <p className="mt-2 text-sm text-gray-500">
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
            className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-indigo-900"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                {placeNumber}
              </div>
              <div className="flex-1 space-y-1 text-indigo-900">
                <p className="font-semibold">{activity.title}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-indigo-700">
                  <span>{TIME_OF_DAY_LABEL[activity.timeOfDay]}</span>
                  {activity.schedule?.arrivalTime ? (
                    <span>
                      Arrive {activity.schedule.arrivalTime}
                      {activity.schedule?.departureTime
                        ? ` · Depart ${activity.schedule.departureTime}`
                        : ""}
                    </span>
                  ) : null}
                  {activity.durationMin ? (
                    <span>{activity.durationMin} min planned</span>
                  ) : null}
                </div>
                {activity.notes ? (
                  <p className="text-xs text-indigo-600 line-clamp-2">{activity.notes}</p>
                ) : null}
                {activity.tags && activity.tags.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                    {activity.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/60 px-2 py-0.5 font-semibold text-indigo-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {activity.tags.length > 3 ? (
                      <span className="rounded-full bg-white/60 px-2 py-0.5 font-medium text-indigo-700">
                        +{activity.tags.length - 3} more
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {index === 0 ? (
                  <p className="text-xs font-medium text-indigo-700">Day kickoff</p>
                ) : null}
              </div>
              <div className="mt-0.5 shrink-0">
                {point ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                    On map
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                    Location unknown
                  </span>
                )}
              </div>
            </div>
            {index > 0 ? (
              <div className="mt-3 rounded-lg border border-indigo-100 bg-white/70 p-3 text-xs text-indigo-800">
                <p className="font-semibold">
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
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        {formatModeLabel(travelSegment.mode as any)}
                      </span>
                      {travelSegment.isFallback ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          Estimated
                        </span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="mt-0.5 text-indigo-700">
                    Travel estimate unavailable for this leg. We&apos;ll keep your place on
                    the map once we can locate it.
                  </p>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

