import type { StoredTrip } from "@/services/trip/types";
import { typography } from "@/lib/typography-system";
import { formatCityName } from "@/lib/itinerary/dayLabel";
import { formatDuration } from "./printUtils";

type PrintRouteMapProps = {
  trip: StoredTrip;
};

/**
 * Minimalist route visualization. Instead of a geographic map (which requires
 * tile rendering and breaks in headless browsers), we render an editorial
 * vertical timeline of cities with transit durations between them.
 *
 * The visual metaphor: a single vertical line, nodes at each city, hairline
 * rules marking travel. Nothing fancy, but it reads as intentional and
 * survives any rendering environment.
 */
export function PrintRouteMap({ trip }: PrintRouteMapProps) {
  const { itinerary } = trip;

  // Collapse sequential days in the same city into a single node.
  const cityNodes: Array<{
    cityId: string;
    nights: number;
    transitToNext?: { minutes: number };
  }> = [];

  for (const day of itinerary.days) {
    if (!day.cityId) continue;
    const last = cityNodes[cityNodes.length - 1];
    if (last && last.cityId === day.cityId) {
      last.nights += 1;
    } else {
      if (last && day.cityTransition) {
        last.transitToNext = { minutes: day.cityTransition.durationMinutes };
      }
      cityNodes.push({ cityId: day.cityId, nights: 1 });
    }
  }

  return (
    <article className="print-page">
      <div className="print-page-inner">
        <header className="mb-10">
          <p className="eyebrow-mono mb-3">The Route</p>
          <h2 className={typography({ intent: "editorial-h1" })}>
            City by city
          </h2>
        </header>

        <div className="flex-1 flex flex-col">
          <ol className="space-y-6 relative">
            {cityNodes.map((node, i) => {
              const isLast = i === cityNodes.length - 1;
              const transit = node.transitToNext
                ? formatDuration(node.transitToNext.minutes)
                : null;

              return (
                <li key={`${node.cityId}-${i}`} className="flex gap-4 relative">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-brand-primary" />
                    {!isLast && (
                      <div className="w-px flex-1 bg-border my-1 min-h-[28pt]" />
                    )}
                  </div>

                  <div className="flex-1 pb-2">
                    <h3 className="font-serif text-[16pt] font-semibold leading-tight text-foreground">
                      {formatCityName(node.cityId)}
                    </h3>
                    <p className="font-mono text-[8pt] uppercase tracking-[0.18em] text-foreground-secondary mt-1">
                      {node.nights} {node.nights === 1 ? "day" : "days"}
                    </p>
                    {transit && !isLast && (
                      <p className="font-mono text-[8pt] uppercase tracking-[0.18em] text-foreground-secondary mt-4 pl-0">
                        {`\u2193 ${transit} onward`}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <div className="print-folio">v</div>
    </article>
  );
}
