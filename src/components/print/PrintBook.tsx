import type { StoredTrip } from "@/services/trip/types";
import { PrintCover } from "./PrintCover";
import { PrintColophon } from "./PrintColophon";
import { PrintTOC } from "./PrintTOC";
import { PrintPrologue } from "./PrintPrologue";
import { PrintRouteMap } from "./PrintRouteMap";
import { PrintBeforeYouGo } from "./PrintBeforeYouGo";
import { PrintDayChapter } from "./PrintDayChapter";
import { PrintAppendix } from "./PrintAppendix";
import { PrintBackCover } from "./PrintBackCover";

type PrintBookProps = {
  trip: StoredTrip;
};

/**
 * Top-level editorial book layout. Pages are stacked vertically in the DOM;
 * @page rules in print.css convert each .print-page to a physical page.
 *
 * Page order follows a traditional travel book structure:
 *   i    Cover
 *   ii   Colophon
 *   iii  Table of Contents
 *   iv   Prologue (LLM guide prose)
 *   v    The Route (line map + city sequence)
 *   vi+  Before You Go (checklist, essentials)
 *   day chapters (2pp each: opener + timeline)
 *   appendix
 *   back cover
 */
export function PrintBook({ trip }: PrintBookProps) {
  const { itinerary, builderData, guideProse, dailyBriefings } = trip;

  return (
    <div className="print-book">
      <PrintCover trip={trip} />
      <PrintColophon trip={trip} />
      <PrintTOC trip={trip} />
      <PrintPrologue trip={trip} />
      <PrintRouteMap trip={trip} />
      <PrintBeforeYouGo trip={trip} />
      {itinerary.days.map((day, index) => (
        <PrintDayChapter
          key={day.id}
          day={day}
          dayIndex={index}
          totalDays={itinerary.days.length}
          tripStartDate={builderData.dates?.start}
          dayGuide={guideProse?.days.find((g) => g.dayId === day.id)}
          dayBriefing={dailyBriefings?.days.find((b) => b.dayId === day.id)}
        />
      ))}
      <PrintAppendix trip={trip} />
      <PrintBackCover />
    </div>
  );
}
