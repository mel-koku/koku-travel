import { ItineraryActivity } from "@/types/itinerary";

type MapPanelPlaceholderProps = {
  day: number;
  activities?: ItineraryActivity[];
};

export const MapPanelPlaceholder = ({
  day,
  activities = [],
}: MapPanelPlaceholderProps) => {
  return (
    <aside className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Map coming soon</h2>
        <p className="text-sm text-gray-500">
          We&apos;re preparing an interactive map for Day {day + 1}. Until then,
          here are your planned stops.
        </p>
      </header>
      <div
        id="map"
        className="flex-1 rounded-xl border border-dashed border-gray-300 bg-gray-50"
        aria-hidden="true"
      >
        {/* Reserved for future Google Maps integration */}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Activities
        </h3>
        {activities.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
              >
                {activity.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            No activities listed for this day yet.
          </p>
        )}
      </div>
    </aside>
  );
};


