import type { StoredTrip } from "@/services/trip/types";
import { typography } from "@/lib/typography-system";
import { formatLongDate, formatMonthYear } from "./printUtils";

type PrintColophonProps = {
  trip: StoredTrip;
};

const GROUP_LABELS: Record<string, string> = {
  solo: "Solo traveler",
  couple: "For two",
  family: "For a family",
  friends: "With friends",
  business: "Business travel",
};

export function PrintColophon({ trip }: PrintColophonProps) {
  const { builderData, createdAt } = trip;
  const preparedOn = formatLongDate(createdAt?.slice(0, 10));
  const travelMonth = formatMonthYear(builderData.dates?.start);
  const groupLabel = builderData.group?.type
    ? GROUP_LABELS[builderData.group.type]
    : null;
  const partySize = builderData.group?.size;
  const duration = builderData.duration;

  const facts: Array<{ label: string; value: string }> = [];
  if (travelMonth) facts.push({ label: "Traveling", value: travelMonth });
  if (duration) facts.push({ label: "Duration", value: `${duration} ${duration === 1 ? "day" : "days"}` });
  if (groupLabel) facts.push({ label: "Party", value: groupLabel });
  if (partySize && partySize > 1) facts.push({ label: "Travelers", value: String(partySize) });
  if (preparedOn) facts.push({ label: "Prepared", value: preparedOn });

  return (
    <article className="print-page print-page-fixed">
      <div className="print-page-inner justify-center">
        <div className="max-w-[90mm] mx-auto w-full space-y-8">
          <p className="eyebrow-mono">Colophon</p>
          <p className={typography({ intent: "editorial-quote" })}>
            A field guide prepared for the curious and the deliberate. Read
            slowly. Skip what doesn&apos;t call to you. Trust the sequence.
          </p>

          <dl className="space-y-3">
            {facts.map((fact) => (
              <div key={fact.label} className="print-avoid-break flex items-baseline gap-4">
                <dt className="font-mono text-[8pt] uppercase tracking-[0.18em] text-foreground-secondary w-24 shrink-0">
                  {fact.label}
                </dt>
                <dd className="font-sans text-[10pt] text-foreground">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="print-folio">Koku</div>
    </article>
  );
}
