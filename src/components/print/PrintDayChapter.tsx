import type { ItineraryDay } from "@/types/itinerary";
import type { GeneratedDayGuide, DayBriefing } from "@/types/llmConstraints";
import { PrintDayOpener } from "./PrintDayOpener";
import { PrintDayTimeline } from "./PrintDayTimeline";

type PrintDayChapterProps = {
  day: ItineraryDay;
  dayIndex: number;
  totalDays: number;
  tripStartDate?: string;
  dayGuide?: GeneratedDayGuide;
  dayBriefing?: DayBriefing;
};

/**
 * One day = one spread (2 pages).
 *   Left page: opener — full-width editorial intro using LLM day prose
 *   Right page: timeline — chronological activity list
 *
 * For very full days (6+ activities) the timeline may overflow onto
 * a third page automatically; .print-page has hard height so any
 * overflow is clipped in screen preview. Real print media honors
 * @page break rules and paginates naturally.
 */
export function PrintDayChapter({
  day,
  dayIndex,
  totalDays,
  tripStartDate,
  dayGuide,
  dayBriefing,
}: PrintDayChapterProps) {
  return (
    <div className="print-spread">
      <PrintDayOpener
        day={day}
        dayIndex={dayIndex}
        totalDays={totalDays}
        tripStartDate={tripStartDate}
        dayGuide={dayGuide}
        dayBriefing={dayBriefing}
      />
      <PrintDayTimeline
        day={day}
        dayIndex={dayIndex}
        totalDays={totalDays}
        dayGuide={dayGuide}
      />
    </div>
  );
}
