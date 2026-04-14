"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Itinerary } from "@/types/itinerary";
import type { ItineraryConflict, ItineraryConflictsResult } from "@/lib/validation/itineraryConflicts";
import type { Location } from "@/types/location";
import type { TripBuilderData } from "@/types/trip";
import type { GeneratedBriefings } from "@/types/llmConstraints";
import { vibesToInterests } from "@/data/vibes";
import type { DetectedGap } from "@/lib/smartPrompts/detectors/types";
import { PackingChecklistCard } from "@/components/features/trip-builder/PackingChecklistCard";

import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/utils";
import {
  calculateTripHealth,
  formatItineraryForExport,
  formatItineraryForCSV,
  analyzeAccessibility,
  type ChecklistItem,
} from "@/lib/itinerary/tripHealth";
import { easeReveal, durationBase } from "@/lib/motion";
import { parseLocalDate, formatLocalDateISO } from "@/lib/utils/dateUtils";
import { DayTripSection } from "./DayTripSection";
import { DayTips } from "./DayTips";
import { buildDayLabel, formatCityName } from "@/lib/itinerary/dayLabel";
import { getTripLevelTips, type TripLevelTip } from "@/lib/tips/tripLevelTips";
import { RailPassSection } from "./RailPassSection";

type TripConfidenceDashboardProps = {
  itinerary: Itinerary;
  conflicts: ItineraryConflict[];
  conflictsResult?: ItineraryConflictsResult;
  tripStartDate?: string;
  tripCities?: string[];
  onClose: () => void;
  onSelectDay?: (dayIndex: number) => void;
  locationMap?: Map<string, Location>;
  mobilityNeeds?: boolean;
  tripBuilderData?: TripBuilderData;
  dayTripSuggestions?: import("@/types/dayTrips").DayTripSuggestion[];
  onAcceptDayTrip?: (suggestion: import("@/types/dayTrips").DayTripSuggestion, dayIndex: number) => void;
  isAcceptingDayTrip?: boolean;
  /** Smart prompt suggestions -- used to suppress duplicate tips */
  suggestions?: DetectedGap[];
  /** LLM-generated daily briefings (Pass 4) */
  dailyBriefings?: GeneratedBriefings;
};

export const TripConfidenceDashboard = memo(function TripConfidenceDashboard({
  itinerary,
  conflicts,
  conflictsResult: _conflictsResult,
  tripStartDate,
  tripCities,
  onClose,
  onSelectDay,
  locationMap,
  mobilityNeeds,
  tripBuilderData,
  dayTripSuggestions,
  onAcceptDayTrip,
  isAcceptingDayTrip,
  suggestions,
  dailyBriefings,
}: TripConfidenceDashboardProps) {
  // IDs of DB tips already promoted to smart prompts -- suppress from DayTips
  const surfacedGuidanceIds = useMemo(() => {
    if (!suggestions) return new Set<string>();
    return new Set(
      suggestions
        .filter((g) => g.type === "guidance" && g.action.type === "acknowledge_guidance")
        .map((g) => (g.action as { guidanceId: string }).guidanceId),
    );
  }, [suggestions]);

  // Days that have a luggage smart prompt active
  const luggagePromptDays = useMemo(() => {
    if (!suggestions) return new Set<number>();
    return new Set(
      suggestions.filter((g) => g.type === "luggage_needs").map((g) => g.dayIndex),
    );
  }, [suggestions]);

  const health = useMemo(
    () => calculateTripHealth(itinerary, conflicts),
    [itinerary, conflicts],
  );

  const tripLevelTips = useMemo(
    () => getTripLevelTips(itinerary, tripStartDate),
    [itinerary, tripStartDate],
  );

  const accessibility = useMemo(() => {
    if (!mobilityNeeds || !locationMap) return null;
    return analyzeAccessibility(itinerary, locationMap);
  }, [mobilityNeeds, locationMap, itinerary]);

  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    () => loadChecklist(),
  );
  const [copiedToast, setCopiedToast] = useState(false);

  const toggleChecked = useCallback((id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveChecklist(next);
      return next;
    });
  }, []);

  const handleCopy = useCallback(() => {
    const text = formatItineraryForExport(itinerary, tripStartDate);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }).catch(() => {
      // Clipboard API can fail in insecure contexts or when denied by permissions
    });
  }, [itinerary, tripStartDate]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCSV = useCallback(() => {
    const csv = formatItineraryForCSV(itinerary, tripStartDate);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const cities = tripCities?.join("-") ?? "trip";
    const date = tripStartDate ?? formatLocalDateISO(new Date());
    a.href = url;
    a.download = `yuku-trip-${cities}-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [itinerary, tripStartDate, tripCities]);


  return (
    <>
    <motion.div
      data-confidence-dashboard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: durationBase, ease: easeReveal }}
      className="space-y-6 pb-8"
    >
      {/* Pre-trip Checklist */}
      {health.checklist.length > 0 && (
        <div className="space-y-2">
          <h3 className="eyebrow-editorial">
            Before You Go
          </h3>
          <div className="rounded-lg border border-border bg-surface/30 divide-y divide-border/50">
            {health.checklist.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                checked={checkedItems.has(item.id)}
                onToggle={() => toggleChecked(item.id)}
                dayLabel={buildDayLabel(item.dayIndex, {
                  tripStartDate,
                  cityId: itinerary.days[item.dayIndex]?.cityId,
                })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Packing Checklist */}
      <PackingChecklistCard
        duration={tripBuilderData?.duration ?? itinerary.days.length}
        cities={tripBuilderData?.cities}
        month={
          tripStartDate
            ? parseLocalDate(tripStartDate)!.getMonth() + 1
            : undefined
        }
        groupType={tripBuilderData?.group?.type}
        interests={tripBuilderData?.vibes?.length ? vibesToInterests(tripBuilderData.vibes) : undefined}
      />

      {/* Route Summary */}
      <RouteSummary itinerary={itinerary} tripStartDate={tripStartDate} onSelectDay={onSelectDay} onClose={onClose} />

      {/* Rail Pass Calculator */}
      <RailPassSection itinerary={itinerary} tripStartDate={tripStartDate} />

      {/* Travel Essentials — trip-level tips shown once */}
      {tripLevelTips.length > 0 && (
        <TravelEssentialsAccordion tips={tripLevelTips} />
      )}

      {/* Travel Tips — per-day tips moved from timeline */}
      <TravelTipsSection itinerary={itinerary} tripStartDate={tripStartDate} surfacedGuidanceIds={surfacedGuidanceIds} luggagePromptDays={luggagePromptDays} dailyBriefings={dailyBriefings} />

      {/* Day Trip Suggestions */}
      {dayTripSuggestions && dayTripSuggestions.length > 0 && onAcceptDayTrip && (
        <DayTripSection
          suggestions={dayTripSuggestions}
          days={itinerary.days}
          onAcceptDayTrip={onAcceptDayTrip}
          isAccepting={isAcceptingDayTrip ?? false}
        />
      )}

      {/* Accessibility — only when traveler has mobility needs */}
      {accessibility && (
        <div className="space-y-2">
          <h3 className="eyebrow-editorial">
            Accessibility
          </h3>
          <div className="rounded-lg border border-border bg-surface/30 p-3 space-y-2">
            <p className="text-sm text-foreground">
              {accessibility.accessibleCount} of {accessibility.totalActivities} activities
              have confirmed wheelchair access
            </p>
            {accessibility.unknownCount > 0 && (
              <p className="text-xs text-stone">
                {accessibility.unknownCount} unconfirmed. Check before you go.
              </p>
            )}
            {accessibility.issues.length > 0 && (
              <div className="mt-2 space-y-1">
                {accessibility.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                    <span className="text-stone">{issue.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {accessibility.checklist.length > 0 && (
            <div className="rounded-lg border border-border bg-surface/30 divide-y divide-border/50">
              {accessibility.checklist.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  checked={checkedItems.has(item.id)}
                  onToggle={() => toggleChecked(item.id)}
                  dayLabel={buildDayLabel(item.dayIndex, {
                    tripStartDate,
                    cityId: itinerary.days[item.dayIndex]?.cityId,
                  })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Export Actions */}
      <div className="space-y-2">
        <h3 className="eyebrow-editorial">
          Export
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface transition"
          >
            {copiedToast ? (
              <>
                <svg className="h-4 w-4 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="8" y="8" width="12" height="12" rx="2" />
                  <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
                </svg>
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleCSV}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>
    </motion.div>
    </>
  );
});


/**
 * Visual route summary showing city sequence with day counts.
 * Each city is a clickable pill that jumps to that day in the timeline.
 */
function RouteSummary({
  itinerary,
  tripStartDate: _tripStartDate,
  onSelectDay,
  onClose,
}: {
  itinerary: Itinerary;
  tripStartDate?: string;
  onSelectDay?: (dayIndex: number) => void;
  onClose: () => void;
}) {
  // Group consecutive days by city
  const segments = useMemo(() => {
    const result: { city: string; dayCount: number; startIndex: number }[] = [];
    for (let i = 0; i < itinerary.days.length; i++) {
      const cityId = itinerary.days[i]?.cityId;
      const city = cityId ? formatCityName(cityId) : `Day ${i + 1}`;
      const prev = result[result.length - 1];
      if (prev && prev.city === city) {
        prev.dayCount++;
      } else {
        result.push({ city, dayCount: 1, startIndex: i });
      }
    }
    return result;
  }, [itinerary.days]);

  if (segments.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="eyebrow-editorial">Your Route</h3>
      <div className="flex flex-wrap items-center gap-1.5">
        {segments.map((seg, i) => (
          <div key={`${seg.city}-${seg.startIndex}`} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg className="h-3 w-3 shrink-0 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            <button
              type="button"
              onClick={() => {
                onSelectDay?.(seg.startIndex);
                onClose();
              }}
              className="flex min-h-11 items-baseline gap-1.5 rounded-lg border border-border bg-surface/40 px-3 py-2 text-left transition hover:bg-surface/70 hover:border-brand-primary/30"
            >
              <span className="text-sm font-medium text-foreground">{seg.city}</span>
              <span className="font-mono text-[10px] text-stone">
                {seg.dayCount}d
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChecklistRow({
  item,
  checked,
  onToggle,
  dayLabel,
}: {
  item: ChecklistItem;
  checked: boolean;
  onToggle: () => void;
  dayLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <label className="flex flex-1 items-center gap-3 cursor-pointer min-w-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 rounded border-border text-brand-primary focus:ring-brand-primary/20 accent-brand-primary"
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${checked ? "text-stone line-through" : "text-foreground"}`}>
            {item.label}
          </p>
          <p className="text-[10px] text-stone font-mono mt-0.5">
            {dayLabel}
            {item.category === "reservation" && item.locationId && (
              <span className="font-sans font-normal tracking-normal">
                {" · "}
                <a
                  href={`/places/${item.locationId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center font-medium text-brand-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View contact details
                </a>
              </span>
            )}
          </p>
        </div>
      </label>
      <CategoryIcon category={item.category} />
    </div>
  );
}


function CategoryIcon({ category }: { category: ChecklistItem["category"] }) {
  const cls = "h-3.5 w-3.5 text-stone";
  switch (category) {
    case "reservation":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 2v4M16 2v4" strokeLinecap="round" />
        </svg>
      );
    case "cash":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v10M9 9h4.5a1.5 1.5 0 010 3H9.5a1.5 1.5 0 000 3H15" strokeLinecap="round" />
        </svg>
      );
    case "accessibility":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="4.5" r="1.5" />
          <path d="M7 8h10M12 8v4m-3 4a3 3 0 006 0M9 12l-2 4m6-4l2 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

/** Collapsible card for trip-level tips (IC card, rail pass, etiquette, etc.) */
function TravelEssentialsAccordion({ tips }: { tips: TripLevelTip[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-2">
      <h3 className="eyebrow-editorial">Travel Essentials</h3>
      <div className="rounded-lg border border-border bg-surface/30">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-surface/50 transition"
        >
          <span className="flex-1 min-w-0 text-sm text-foreground">
            {tips.length} tips for your trip
          </span>
          <svg
            className={cn("h-3.5 w-3.5 text-stone transition-transform shrink-0", isOpen && "rotate-180")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="divide-y divide-border/50 border-t border-border/50">
            {tips.map((tip) => (
              <div key={tip.id} className="flex items-start gap-3 px-4 py-3">
                <span className="text-base mt-0.5 shrink-0">{tip.icon}</span>
                <div className="min-w-0">
                  <p className={typography({ intent: "utility-label" })}>{tip.title}</p>
                  <p className={cn(typography({ intent: "utility-body-muted" }), "mt-0.5")}>
                    {tip.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Aggregated travel tips from all days, shown as per-day accordions.
 * Replaces the per-day insights accordion that was in the timeline.
 */
function TravelTipsSection({
  itinerary,
  tripStartDate,
  surfacedGuidanceIds,
  luggagePromptDays,
  dailyBriefings,
}: {
  itinerary: Itinerary;
  tripStartDate?: string;
  surfacedGuidanceIds?: Set<string>;
  luggagePromptDays?: Set<number>;
  dailyBriefings?: GeneratedBriefings;
}) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [tipCounts, setTipCounts] = useState<Map<number, number>>(new Map());
  const [emittedTipIds, setEmittedTipIds] = useState<Map<number, string[]>>(new Map());

  const handleTipCount = useCallback((dayIndex: number, count: number) => {
    setTipCounts((prev) => {
      if (prev.get(dayIndex) === count) return prev;
      const next = new Map(prev);
      next.set(dayIndex, count);
      return next;
    });
  }, []);

  const handleTipsEmitted = useCallback((dayIndex: number, tipIds: string[]) => {
    setEmittedTipIds((prev) => {
      const existing = prev.get(dayIndex);
      if (existing && existing.length === tipIds.length && existing.every((id, i) => id === tipIds[i])) {
        return prev;
      }
      const next = new Map(prev);
      next.set(dayIndex, tipIds);
      return next;
    });
  }, []);

  /** Pre-computed sets of tip IDs shown on days before each dayIndex */
  const previousTipIdsByDay = useMemo(() => {
    const result = new Map<number, Set<string>>();
    const dayCount = itinerary.days.length;
    const accumulated = new Set<string>();
    for (let i = 0; i < dayCount; i++) {
      result.set(i, new Set(accumulated));
      const dayTips = emittedTipIds.get(i);
      if (dayTips) dayTips.forEach((id) => accumulated.add(id));
    }
    return result;
  }, [emittedTipIds, itinerary.days.length]);

  const totalTips = useMemo(() => {
    let sum = 0;
    for (const c of tipCounts.values()) sum += c;
    return sum;
  }, [tipCounts]);

  // Build a map of dayId -> briefing for quick lookup
  const briefingMap = useMemo(() => {
    if (!dailyBriefings) return null;
    const map = new Map<string, string>();
    for (const b of dailyBriefings.days) {
      map.set(b.dayId, b.briefing);
    }
    return map;
  }, [dailyBriefings]);

  // Section title: "Daily Briefings" when any day has LLM prose, else "Travel Tips"
  const hasBriefings = briefingMap && briefingMap.size > 0;

  return (
    <div className="space-y-2">
      <h3 className="eyebrow-editorial">
        {hasBriefings ? "Daily Briefings" : <>Travel Tips{totalTips > 0 && <span className="ml-1.5 text-stone">{totalTips}</span>}</>}
      </h3>
      <div className="rounded-lg border border-border bg-surface/30 divide-y divide-border/50">
        {itinerary.days.map((day, i) => {
          const isExpanded = expandedDay === i;
          const label = buildDayLabel(i, { tripStartDate, cityId: day.cityId });
          const briefing = briefingMap?.get(day.id);

          if (briefing) {
            // This specific day has LLM briefing prose
            return (
              <div key={day.id ?? i}>
                <button
                  type="button"
                  onClick={() => setExpandedDay(isExpanded ? null : i)}
                  className="flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-surface/50 transition"
                >
                  <span className="font-mono text-[10px] text-stone w-4 text-right shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0 text-sm text-foreground truncate">
                    {label}
                  </span>
                  <svg
                    className={`h-3.5 w-3.5 text-stone transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3">
                    <p className={cn(typography({ intent: "utility-body" }), "text-foreground-body leading-relaxed")}>
                      {briefing}
                    </p>
                  </div>
                )}
              </div>
            );
          }

          // Fallback: rule-based tips for this day (no briefing available)
          const count = tipCounts.get(i) ?? 0;
          return (
            <div key={day.id ?? i}>
              <button
                type="button"
                onClick={() => setExpandedDay(isExpanded ? null : i)}
                className="flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-surface/50 transition"
              >
                <span className="font-mono text-[10px] text-stone w-4 text-right shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0 text-sm text-foreground truncate">
                  {label}
                </span>
                {count > 0 && (
                  <span className="rounded-full bg-sage/10 px-1.5 py-0.5 text-[10px] font-medium text-sage">
                    {count}
                  </span>
                )}
                <svg
                  className={`h-3.5 w-3.5 text-stone transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3">
                  <DayTips
                    day={day}
                    dayIndex={i}
                    tripStartDate={tripStartDate}
                    embedded
                    onTipCount={handleTipCount}
                    hasLuggagePrompt={luggagePromptDays?.has(i) ?? false}
                    surfacedGuidanceIds={surfacedGuidanceIds}
                    previousDaysTipIds={previousTipIdsByDay.get(i)}
                    onTipsEmitted={handleTipsEmitted}
                  />
                </div>
              )}

              {/* Count-only instance to populate badge when collapsed */}
              {!isExpanded && (
                <DayTips
                  day={day}
                  dayIndex={i}
                  tripStartDate={tripStartDate}
                  countOnly
                  onTipCount={handleTipCount}
                  hasLuggagePrompt={luggagePromptDays?.has(i) ?? false}
                  surfacedGuidanceIds={surfacedGuidanceIds}
                  previousDaysTipIds={previousTipIdsByDay.get(i)}
                  onTipsEmitted={handleTipsEmitted}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Persist checklist to localStorage
import { CONFIDENCE_CHECKLIST_STORAGE_KEY } from "@/lib/constants/storage";
import { getLocal, setLocal } from "@/lib/storageHelpers";

function loadChecklist(): Set<string> {
  const stored = getLocal<string[]>(CONFIDENCE_CHECKLIST_STORAGE_KEY);
  return stored ? new Set(stored) : new Set();
}

function saveChecklist(checked: Set<string>) {
  setLocal(CONFIDENCE_CHECKLIST_STORAGE_KEY, [...checked]);
}

