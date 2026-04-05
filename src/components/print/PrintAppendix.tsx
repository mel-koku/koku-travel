import type { StoredTrip } from "@/services/trip/types";
import { typography } from "@/lib/typography-system";
import { buildDayLabel } from "@/lib/itinerary/dayLabel";

type PrintAppendixProps = {
  trip: StoredTrip;
};

/**
 * Back-matter reference page. Lists every named place in the trip with
 * its day reference, so the traveler can locate it across the book
 * without flipping through day chapters.
 */
export function PrintAppendix({ trip }: PrintAppendixProps) {
  const { itinerary, builderData } = trip;
  const tripStartDate = builderData.dates?.start;

  const entries: Array<{ day: string; title: string; neighborhood?: string }> = [];
  itinerary.days.forEach((day, i) => {
    const dayLabel = buildDayLabel(i, { tripStartDate, cityId: day.cityId });
    for (const activity of day.activities) {
      if (activity.kind !== "place") continue;
      if (activity.isAnchor) continue;
      entries.push({
        day: dayLabel,
        title: activity.title,
        neighborhood: activity.neighborhood ?? undefined,
      });
    }
  });

  return (
    <article className="print-page">
      <div className="print-page-inner">
        <header className="mb-10">
          <p className="eyebrow-mono mb-3">Appendix</p>
          <h2 className={typography({ intent: "editorial-h1" })}>
            Every place, by day
          </h2>
        </header>

        <div>
          <ul className="space-y-2">
            {entries.map((entry, i) => (
              <li key={i} className="print-avoid-break flex items-baseline gap-3">
                <span className="font-mono text-[7.5pt] uppercase tracking-[0.15em] text-foreground-secondary w-24 shrink-0">
                  {entry.day}
                </span>
                <span className="font-serif text-[10pt] leading-snug text-foreground">
                  {entry.title}
                  {entry.neighborhood && (
                    <span className="font-sans text-[8pt] text-foreground-secondary ml-2">
                      {entry.neighborhood}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="print-folio">Appendix</div>
    </article>
  );
}
