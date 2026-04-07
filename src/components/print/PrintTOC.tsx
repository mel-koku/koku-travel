import type { StoredTrip } from "@/services/trip/types";
import type { PrintEnrichmentMap } from "@/app/api/locations/print-enrichment/route";
import { typography } from "@/lib/typography-system";
import { buildDayLabel } from "@/lib/itinerary/dayLabel";

type PrintTOCProps = {
  trip: StoredTrip;
  enrichment: PrintEnrichmentMap;
};

export function PrintTOC({ trip, enrichment }: PrintTOCProps) {
  const { itinerary, builderData } = trip;
  const tripStartDate = builderData.dates?.start;

  const frontMatter = [
    { label: "Prologue", folio: "iv" },
    { label: "The Route", folio: "v" },
    { label: "Five Things to Carry", folio: "vi" },
    { label: "Before You Go", folio: "vii" },
    { label: "Essential Phrases", folio: "viii" },
    { label: "Numbers to Keep", folio: "ix" },
  ];

  // Check if any activities have reservations
  const hasReservations = itinerary.days.some((day) =>
    day.activities.some(
      (a) =>
        a.kind === "place" &&
        a.locationId &&
        enrichment[a.locationId]?.reservationInfo,
    ),
  );

  return (
    <article className="print-page">
      <div className="print-page-inner">
        <header className="mb-10">
          <p className="eyebrow-mono mb-3">Contents</p>
          <h2 className={typography({ intent: "editorial-h1" })}>
            What awaits
          </h2>
        </header>

        <div className="flex-1 space-y-1">
          {frontMatter.map((item) => (
            <TOCRow key={item.label} label={item.label} folio={item.folio} />
          ))}

          <div className="py-3" />
          <p className="eyebrow-mono pt-2">The Days</p>
          <div className="pt-2" />

          {itinerary.days.map((day, index) => {
            const label = buildDayLabel(index, {
              tripStartDate,
              cityId: day.cityId,
            });
            const dayNumber = `Day ${String(index + 1).padStart(2, "0")}`;
            return (
              <TOCRow
                key={day.id}
                label={label}
                meta={dayNumber}
                emphasis
              />
            );
          })}

          <div className="py-3" />
          <p className="eyebrow-mono pt-2">Back Matter</p>
          <div className="pt-2" />
          {hasReservations && <TOCRow label="Book ahead" />}
          <TOCRow label="Every place, by day" />
        </div>
      </div>
      <div className="print-folio">iii</div>
    </article>
  );
}

function TOCRow({
  label,
  folio,
  meta,
  emphasis,
}: {
  label: string;
  folio?: string;
  meta?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="print-avoid-break flex items-baseline gap-3 py-1">
      {meta && (
        <span className="font-mono text-[8pt] uppercase tracking-[0.18em] text-foreground-secondary w-14 flex-shrink-0">
          {meta}
        </span>
      )}
      <span
        className={
          emphasis
            ? "font-serif text-[12pt] leading-snug text-foreground"
            : "font-sans text-[10pt] text-foreground"
        }
      >
        {label}
      </span>
      <span
        aria-hidden
        className="flex-1 border-b border-dotted border-border translate-y-[-2px]"
      />
      {folio && (
        <span className="font-mono text-[8pt] uppercase tracking-[0.18em] text-foreground-secondary">
          {folio}
        </span>
      )}
    </div>
  );
}
