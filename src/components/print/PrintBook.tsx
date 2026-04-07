import type { StoredTrip } from "@/services/trip/types";
import type { PrintEnrichmentMap } from "@/app/api/locations/print-enrichment/route";
import { PrintCover } from "./PrintCover";
import { PrintColophon } from "./PrintColophon";
import { PrintTOC } from "./PrintTOC";
import { PrintPrologue } from "./PrintPrologue";
import { PrintRouteMap } from "./PrintRouteMap";
import { PrintCulturalPillars } from "./PrintCulturalPillars";
import { PrintBeforeYouGo } from "./PrintBeforeYouGo";
import { PrintPhrases } from "./PrintPhrases";
import { PrintEmergency } from "./PrintEmergency";
import { PrintDayChapter } from "./PrintDayChapter";
import { PrintReservations } from "./PrintReservations";
import { PrintAppendix } from "./PrintAppendix";
import { PrintBackCover } from "./PrintBackCover";

type PrintBookProps = {
  trip: StoredTrip;
  enrichment: PrintEnrichmentMap;
};

/**
 * Top-level editorial book layout.
 *
 * Page order:
 *   i      Cover
 *   ii     Colophon
 *   iii    Table of Contents
 *   iv     Prologue
 *   v      The Route
 *   vi     Cultural Pillars
 *   vii    Before You Go
 *   viii   Phrases
 *   ix     Emergency
 *   day chapters (2pp each: opener + timeline)
 *   reservations (conditional)
 *   appendix
 *   back cover
 */
export function PrintBook({ trip, enrichment }: PrintBookProps) {
  const { itinerary, builderData, guideProse, dailyBriefings } = trip;

  return (
    <div className="print-book">
      <PrintCover trip={trip} />
      <PrintColophon trip={trip} />
      <PrintTOC trip={trip} enrichment={enrichment} />
      <PrintPrologue trip={trip} />
      <PrintRouteMap trip={trip} />
      <PrintCulturalPillars />
      <PrintBeforeYouGo trip={trip} />
      <PrintPhrases />
      <PrintEmergency />
      {itinerary.days.map((day, index) => (
        <PrintDayChapter
          key={day.id}
          day={day}
          dayIndex={index}
          totalDays={itinerary.days.length}
          tripStartDate={builderData.dates?.start}
          dayGuide={guideProse?.days.find((g) => g.dayId === day.id)}
          dayBriefing={dailyBriefings?.days.find((b) => b.dayId === day.id)}
          enrichment={enrichment}
        />
      ))}
      <PrintReservations trip={trip} enrichment={enrichment} />
      <PrintAppendix trip={trip} />
      <PrintBackCover />
    </div>
  );
}
