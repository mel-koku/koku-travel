import type { StoredTrip } from "@/services/trip/types";
import { formatDateRange } from "./printUtils";
import { formatCityName } from "@/lib/itinerary/dayLabel";

type PrintCoverProps = {
  trip: StoredTrip;
};

/**
 * Strip trailing date fragments from auto-generated trip names
 * (e.g. "Fukuoka & Matsue Trip · Apr 6 – Apr 18" → "Fukuoka & Matsue Trip").
 * The date range is already displayed in the footer, so we don't want it twice.
 */
function stripTrailingDate(name: string): string {
  return name
    .replace(/\s*[·\-–]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b.*$/i, "")
    .trim();
}

export function PrintCover({ trip }: PrintCoverProps) {
  const { name, builderData } = trip;
  const displayName = stripTrailingDate(name);
  const dateRange = formatDateRange(builderData.dates?.start, builderData.dates?.end);
  const cities = (builderData.cities ?? [])
    .slice(0, 3)
    .map((id) => formatCityName(id));

  return (
    <article className="print-page print-page-fixed">
      <div className="print-page-inner justify-between">
        <header className="flex items-center justify-between">
          <span className="font-mono text-[8pt] uppercase tracking-[0.2em] text-foreground-secondary">
            Koku Travel
          </span>
          <span className="font-mono text-[8pt] uppercase tracking-[0.2em] text-foreground-secondary">
            Field Guide
          </span>
        </header>

        <div className="flex-1 flex flex-col justify-center">
          <p className="eyebrow-mono mb-6">A private itinerary for</p>
          <h1 className="font-serif text-[32pt] font-semibold leading-[1.08] tracking-[-0.01em] text-foreground text-balance">
            {displayName}
          </h1>
          {cities.length > 0 && (
            <p className="font-serif text-[14pt] italic leading-snug text-foreground-secondary text-balance mt-6">
              {cities.join("\u00A0\u00B7\u00A0")}
            </p>
          )}
        </div>

        <footer>
          <hr className="print-rule-vermilion" />
          {dateRange && (
            <p className="mt-5 font-mono text-[9pt] uppercase tracking-[0.18em] text-foreground-secondary">
              {dateRange}
            </p>
          )}
          <p className="mt-2 font-mono text-[8pt] uppercase tracking-[0.18em] text-foreground-secondary">
            Japan
          </p>
        </footer>
      </div>
    </article>
  );
}
