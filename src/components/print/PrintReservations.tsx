import type { StoredTrip } from "@/services/trip/types";
import type { PrintEnrichmentMap } from "@/app/api/locations/print-enrichment/route";
import { typography } from "@/lib/typography-system";
import { buildDayLabel } from "@/lib/itinerary/dayLabel";

type PrintReservationsProps = {
  trip: StoredTrip;
  enrichment: PrintEnrichmentMap;
};

type ReservationEntry = {
  title: string;
  dayLabel: string;
  level: "required" | "recommended";
};

/**
 * Reservation checklist page. Only renders if any activities
 * have reservationInfo set. Returns null otherwise.
 */
export function PrintReservations({ trip, enrichment }: PrintReservationsProps) {
  const { itinerary, builderData } = trip;
  const tripStartDate = builderData.dates?.start;

  const entries: ReservationEntry[] = [];

  itinerary.days.forEach((day, i) => {
    const dayLabel = buildDayLabel(i, { tripStartDate, cityId: day.cityId });
    for (const activity of day.activities) {
      if (activity.kind !== "place" || !activity.locationId) continue;
      const loc = enrichment[activity.locationId];
      if (!loc?.reservationInfo) continue;
      entries.push({
        title: activity.title,
        dayLabel,
        level: loc.reservationInfo,
      });
    }
  });

  if (entries.length === 0) return null;

  // Sort required before recommended
  const sorted = entries.sort((a, b) => {
    if (a.level === "required" && b.level !== "required") return -1;
    if (a.level !== "required" && b.level === "required") return 1;
    return 0;
  });

  return (
    <article className="print-page">
      <div className="print-page-inner">
        <header className="mb-10">
          <p className="eyebrow-mono mb-3">Reservations</p>
          <h2 className={typography({ intent: "editorial-h1" })}>
            Book ahead
          </h2>
        </header>

        <div className="flex-1">
          <ul className="space-y-3">
            {sorted.map((entry, i) => (
              <li key={i} className="print-avoid-break flex items-baseline gap-3">
                <span className="font-mono text-[7.5pt] uppercase tracking-[0.15em] text-foreground-secondary w-24 shrink-0">
                  {entry.dayLabel}
                </span>
                <div className="flex-1">
                  <span className="font-serif text-[10pt] leading-snug text-foreground">
                    {entry.title}
                  </span>
                  <span className={`ml-2 font-mono text-[7pt] uppercase tracking-[0.15em] ${
                    entry.level === "required" ? "text-error" : "text-warning"
                  }`}>
                    {entry.level}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="print-folio">Reservations</div>
    </article>
  );
}
