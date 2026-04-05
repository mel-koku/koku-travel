import type { StoredTrip } from "@/services/trip/types";
import { typography } from "@/lib/typography-system";

type PrintBeforeYouGoProps = {
  trip: StoredTrip;
};

/**
 * Practical essentials page. Curated, not exhaustive — a few things
 * worth knowing before the trip begins. Not a substitute for the
 * in-app checklist (which handles reservations, passport, etc.);
 * this is the condensed paper version.
 */
export function PrintBeforeYouGo({ trip }: PrintBeforeYouGoProps) {
  const { builderData } = trip;
  const hasDietary =
    (builderData.accessibility?.dietary?.length ?? 0) > 0 ||
    Boolean(builderData.accessibility?.dietaryOther);
  const hasMobility = builderData.accessibility?.mobility === true;

  const essentials: Array<{ title: string; body: string }> = [
    {
      title: "Cash and cards",
      body:
        "Japan is cashless-friendly in cities but still rewards having yen. Konbini ATMs (7-Eleven, Lawson) accept foreign cards and stay open overnight. Smaller restaurants, taxis, and shrines often refuse cards.",
    },
    {
      title: "The IC card",
      body:
        "Load a Suica or Pasmo at any train station the day you arrive. It pays for trains, buses, vending machines, and most konbini. One tap, no fumbling. This is the single best quality-of-life purchase of the trip.",
    },
    {
      title: "Quiet in transit",
      body:
        "Phone calls on trains are not done. Voices stay low. Eating is for shinkansen and long-distance lines, not commuter trains. Escalators: stand left in Tokyo, stand right in Osaka.",
    },
    {
      title: "Shoes come off",
      body:
        "Temples, ryokan, some restaurants, and all homes. When you see a step up from a lower entry floor (genkan), shoes off. Slippers are provided; tatami rooms are stockinged feet only.",
    },
  ];

  if (hasDietary) {
    essentials.push({
      title: "Dietary notes",
      body:
        "Show your restrictions written in Japanese at the start of each meal. Dashi (bonito broth) appears in most 'vegetarian' dishes — ask specifically. Strict preferences narrow the field significantly; plan your larger meals rather than improvising.",
    });
  }

  if (hasMobility) {
    essentials.push({
      title: "Accessibility",
      body:
        "Major JR stations have elevators and accessible toilets. Older neighborhoods, many temples, and most ryokan involve stairs and stone paths. Call ahead when the activity matters.",
    });
  }

  return (
    <article className="print-page">
      <div className="print-page-inner">
        <header className="mb-10">
          <p className="eyebrow-mono mb-3">Before You Go</p>
          <h2 className={typography({ intent: "editorial-h1" })}>
            Things worth knowing
          </h2>
        </header>

        <div className="flex-1 space-y-6">
          {essentials.map((item) => (
            <div key={item.title}>
              <h3 className="font-serif text-[12pt] font-semibold leading-tight text-foreground mb-2">
                {item.title}
              </h3>
              <p className="font-sans text-[9.5pt] leading-[1.6] text-foreground-body">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="print-folio">vi</div>
    </article>
  );
}
