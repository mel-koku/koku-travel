import type { ItineraryDay } from "@/types/itinerary";
import type { GeneratedDayGuide, DayBriefing } from "@/types/llmConstraints";
import { typography } from "@/lib/typography-system";
import { buildDayLabel, formatCityName } from "@/lib/itinerary/dayLabel";

type PrintDayOpenerProps = {
  day: ItineraryDay;
  dayIndex: number;
  totalDays: number;
  tripStartDate?: string;
  dayGuide?: GeneratedDayGuide;
  dayBriefing?: DayBriefing;
};

export function PrintDayOpener({
  day,
  dayIndex,
  totalDays,
  tripStartDate,
  dayGuide,
  dayBriefing,
}: PrintDayOpenerProps) {
  const dayNumber = `Day ${String(dayIndex + 1).padStart(2, "0")} of ${String(totalDays).padStart(2, "0")}`;
  const label = buildDayLabel(dayIndex, { tripStartDate, cityId: day.cityId });
  const cityName = day.cityId ? formatCityName(day.cityId) : null;

  // Primary prose: Pass 3 day intro. Falls back to daily briefing prose if
  // guide prose is missing. Both can coexist — intro is longer, briefing
  // is the tighter "today in one paragraph" distillation.
  const intro = dayGuide?.intro;
  const briefing = dayBriefing?.briefing;
  const culturalMoment = dayGuide?.culturalMoment;

  return (
    <article className="print-page">
      <div className="print-page-inner">
        <header className="mb-8">
          <p className="font-mono text-[8pt] uppercase tracking-[0.18em] text-foreground-secondary">
            {dayNumber}
          </p>
          {cityName && (
            <p className="font-mono text-[8pt] uppercase tracking-[0.18em] text-foreground-secondary mt-1">
              {label}
            </p>
          )}
          <h2 className={`${typography({ intent: "editorial-h1" })} mt-6`}>
            {cityName ?? `Day ${dayIndex + 1}`}
          </h2>
          {day.isDayTrip && day.baseCityId && (
            <p className="font-sans italic text-[10pt] text-foreground-secondary mt-2">
              A day trip from {formatCityName(day.baseCityId)}
            </p>
          )}
        </header>

        <div className="flex-1 space-y-5 overflow-hidden">
          {intro && (
            <p className="font-serif text-[11pt] leading-[1.65] text-foreground-body">
              {intro}
            </p>
          )}
          {briefing && intro !== briefing && (
            <p className="font-serif text-[10.5pt] leading-[1.6] text-foreground-body italic">
              {briefing}
            </p>
          )}
          {!intro && !briefing && (
            <p className="font-serif text-[11pt] leading-[1.65] text-foreground-body">
              {fallbackDayIntro(day, cityName)}
            </p>
          )}
        </div>

        {culturalMoment && (
          <footer className="mt-6 pt-5 border-t border-border">
            <p className="eyebrow-mono mb-2">A moment to notice</p>
            <p className="font-serif italic text-[10pt] leading-[1.55] text-foreground-secondary">
              {culturalMoment}
            </p>
          </footer>
        )}
      </div>
    </article>
  );
}

function fallbackDayIntro(day: ItineraryDay, cityName: string | null): string {
  const count = day.activities.filter((a) => a.kind === "place").length;
  const city = cityName ?? "the city";
  if (count === 0) {
    return `A quiet day in ${city}. Use the hours however suits you — nothing on the page is fixed.`;
  }
  if (count <= 3) {
    return `A measured day in ${city}. Three moments, generous spacing between them. Take your time.`;
  }
  return `A full day in ${city}. The sequence moves with the hours — morning energy, afternoon depth, evening quiet.`;
}
