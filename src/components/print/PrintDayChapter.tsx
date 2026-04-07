import type { ItineraryDay } from "@/types/itinerary";
import type { GeneratedDayGuide, DayBriefing } from "@/types/llmConstraints";
import type { PrintEnrichmentMap } from "@/app/api/locations/print-enrichment/route";
import { PrintDayOpener } from "./PrintDayOpener";
import { PrintDayTimeline } from "./PrintDayTimeline";

type PrintDayChapterProps = {
  day: ItineraryDay;
  dayIndex: number;
  totalDays: number;
  tripStartDate?: string;
  dayGuide?: GeneratedDayGuide;
  dayBriefing?: DayBriefing;
  enrichment: PrintEnrichmentMap;
};

export function PrintDayChapter({
  day,
  dayIndex,
  totalDays,
  tripStartDate,
  dayGuide,
  dayBriefing,
  enrichment,
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
        enrichment={enrichment}
      />
    </div>
  );
}
