import type { StoredTrip } from "@/services/trip/types";
import { typography } from "@/lib/typography-system";
import { formatCityName } from "@/lib/itinerary/dayLabel";

type PrintPrologueProps = {
  trip: StoredTrip;
};

/**
 * Full-page editorial essay using Pass 3 guide prose (tripOverview).
 * Falls back to a templated overview when guideProse is unavailable
 * (guest trips, template-only generation, or older trips).
 */
export function PrintPrologue({ trip }: PrintPrologueProps) {
  const { guideProse, builderData, itinerary } = trip;
  const overview = guideProse?.tripOverview ?? buildFallbackOverview(trip);
  const cityCount = (builderData.cities ?? []).length;
  const dayCount = itinerary.days.length;
  const firstCity = builderData.cities?.[0]
    ? formatCityName(builderData.cities[0])
    : "Japan";

  // Split overview into paragraphs on double newlines.
  const paragraphs = overview
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article className="print-page">
      <div className="print-page-inner">
        <header className="mb-10">
          <p className="eyebrow-mono mb-3">Prologue</p>
          <h2 className={typography({ intent: "editorial-h1" })}>
            Before the first train
          </h2>
        </header>

        <div className="flex-1 space-y-5 overflow-hidden">
          {paragraphs.map((paragraph, i) => (
            <p
              key={i}
              className="font-serif text-[11pt] leading-[1.65] text-foreground-body"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <footer className="mt-8 flex items-center gap-3">
          <hr className="print-rule-vermilion" />
          <p className="font-mono text-[8pt] uppercase tracking-[0.18em] text-foreground-secondary">
            {`${dayCount} ${dayCount === 1 ? "day" : "days"} \u00B7 ${cityCount} ${cityCount === 1 ? "city" : "cities"} \u00B7 beginning in ${firstCity}`}
          </p>
        </footer>
      </div>
      <div className="print-folio">iv</div>
    </article>
  );
}

function buildFallbackOverview(trip: StoredTrip): string {
  const { builderData, itinerary } = trip;
  const cities = (builderData.cities ?? []).map((id) => formatCityName(id));
  const cityList =
    cities.length === 0
      ? "Japan"
      : cities.length === 1
        ? cities[0]
        : cities.length === 2
          ? `${cities[0]} and ${cities[1]}`
          : `${cities.slice(0, -1).join(", ")}, and ${cities[cities.length - 1]}`;

  const days = itinerary.days.length;
  const dayWord = days === 1 ? "day" : "days";

  return [
    `This is a ${days}-${dayWord.slice(0, -1)} passage through ${cityList}. The sequence was built around your pace, the rhythm of each city, and the small windows that make the difference between a good visit and one you carry home.`,
    `Read the day chapters the night before. Trust the times. When something moves you, stay longer. When something doesn't, skip it. The map is not the territory.`,
  ].join("\n\n");
}
