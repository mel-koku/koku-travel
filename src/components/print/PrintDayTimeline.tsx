import type { ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { GeneratedDayGuide } from "@/types/llmConstraints";
import type { PrintEnrichmentMap } from "@/app/api/locations/print-enrichment/route";
import { typography } from "@/lib/typography-system";
import { formatDuration, formatClock } from "./printUtils";
import { PrintTransitSteps } from "./PrintTransitSteps";

type PrintDayTimelineProps = {
  day: ItineraryDay;
  dayIndex: number;
  totalDays: number;
  dayGuide?: GeneratedDayGuide;
  enrichment: PrintEnrichmentMap;
};

export function PrintDayTimeline({
  day,
  dayIndex,
  dayGuide,
  enrichment,
}: PrintDayTimelineProps) {
  const activities = day.activities;
  const practicalTip = dayGuide?.practicalTip;

  return (
    <article className="print-page">
      <div className="print-page-inner">
        <header className="mb-6">
          <p className="eyebrow-mono mb-2">The Day</p>
          <h3 className={typography({ intent: "editorial-h2" })}>
            Hour by hour
          </h3>
        </header>

        <ol className="space-y-5">
          {activities.map((activity, i) => (
            <TimelineEntry
              key={activity.id}
              activity={activity}
              isLast={i === activities.length - 1}
              enrichment={enrichment}
            />
          ))}
        </ol>

        {practicalTip && (
          <footer className="mt-6 pt-5 border-t border-border">
            <p className="eyebrow-mono mb-2">Practical</p>
            <p className="font-sans text-[9.5pt] leading-[1.55] text-foreground-body">
              {practicalTip}
            </p>
          </footer>
        )}
      </div>
      <div className="print-folio">Day {dayIndex + 1}</div>
    </article>
  );
}

function TimelineEntry({
  activity,
  enrichment,
}: {
  activity: ItineraryActivity;
  isLast: boolean;
  enrichment: PrintEnrichmentMap;
}) {
  if (activity.kind === "note") {
    return (
      <li className="print-avoid-break">
        <p className="font-serif italic text-[10pt] leading-[1.5] text-foreground-secondary">
          {activity.notes}
        </p>
      </li>
    );
  }

  const arrival =
    activity.schedule?.arrivalTime ?? activity.manualStartTime;
  const arrivalClock = formatClock(arrival);
  const durationLabel = formatDuration(activity.durationMin);

  // Travel segment leading into this activity
  const travel = activity.travelFromPrevious;
  const travelDuration = travel ? formatDuration(travel.durationMinutes) : null;
  const travelMode = travel?.mode;
  const transitSteps = travel?.transitSteps;

  // Enrichment data from the DB
  const loc = activity.locationId ? enrichment[activity.locationId] : undefined;

  return (
    <li className="print-avoid-break">
      {travelDuration && (
        <div className="flex items-center gap-3 mb-2 pl-0">
          <div className="w-8 border-t border-dotted border-border" />
          <span className="font-mono text-[7.5pt] uppercase tracking-[0.15em] text-foreground-secondary">
            {travelMode ? `${travelMode} ` : ""}{travelDuration}
          </span>
          <div className="flex-1 border-t border-dotted border-border" />
        </div>
      )}

      {/* Inline transit steps (when available) */}
      {transitSteps && transitSteps.length > 0 && (
        <PrintTransitSteps steps={transitSteps} />
      )}

      <div className="flex gap-3">
        <div className="w-[16mm] shrink-0 pt-[1pt]">
          {arrivalClock ? (
            <p className="font-mono text-[8pt] uppercase tracking-[0.12em] text-foreground-secondary">
              {arrivalClock}
            </p>
          ) : (
            <p className="font-mono text-[8pt] uppercase tracking-[0.12em] text-foreground-secondary">
              {labelForTimeOfDay(activity.timeOfDay)}
            </p>
          )}
          {durationLabel && (
            <p className="font-mono text-[7pt] uppercase tracking-[0.1em] text-foreground-secondary mt-[2pt]">
              {durationLabel}
            </p>
          )}
        </div>

        <div className="flex-1">
          <h4 className="font-serif text-[11.5pt] font-semibold leading-[1.25] text-foreground">
            {activity.title}
          </h4>
          {/* Japanese name for showing to locals */}
          {loc?.nameJapanese && (
            <p className="font-sans text-[9pt] text-foreground-secondary mt-[1pt]">
              {loc.nameJapanese}
            </p>
          )}
          {/* Nearest station + cash-only */}
          {(loc?.nearestStation || loc?.cashOnly) && (
            <p className="font-mono text-[7.5pt] text-foreground-secondary mt-[1pt]">
              {[
                loc.nearestStation ? `Stn: ${loc.nearestStation}` : null,
                loc.cashOnly ? "Cash only" : null,
              ]
                .filter(Boolean)
                .join(" \u00B7 ")}
            </p>
          )}
          {activity.neighborhood && !loc?.nearestStation && (
            <p className="font-sans text-[8pt] text-foreground-secondary mt-[1pt]">
              {activity.neighborhood}
            </p>
          )}
          {activity.description && (
            <p className="font-serif text-[9.5pt] leading-[1.5] text-foreground-body mt-[3pt]">
              {activity.description}
            </p>
          )}
          {activity.notes && (
            <p className="font-serif italic text-[9pt] leading-[1.5] text-foreground-secondary mt-[3pt]">
              {activity.notes}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function labelForTimeOfDay(t: "morning" | "afternoon" | "evening"): string {
  switch (t) {
    case "morning":
      return "Morning";
    case "afternoon":
      return "Afternoon";
    case "evening":
      return "Evening";
  }
}
