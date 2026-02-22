"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Itinerary, ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";
import type { Location } from "@/types/location";
import { REGIONS } from "@/data/regions";
import {
  calculateTripHealth,
  getHealthLevel,
  formatItineraryForExport,
  formatItineraryForCSV,
  analyzeAccessibility,
  type DayHealth,
  type ChecklistItem,
} from "@/lib/itinerary/tripHealth";
import { easeReveal, durationFast, durationBase } from "@/lib/motion";
import { useActivityLocations } from "@/hooks/useActivityLocations";
import { LocationExpanded } from "@/components/features/places/LocationExpanded";

type TripConfidenceDashboardProps = {
  itinerary: Itinerary;
  conflicts: ItineraryConflict[];
  tripStartDate?: string;
  tripCities?: string[];
  onClose: () => void;
  onSelectDay?: (dayIndex: number) => void;
  /** Currently selected day from the DaySelector */
  selectedDay?: number;
  /** Called when a day is expanded/collapsed in the overview (syncs DaySelector) */
  onDayExpand?: (dayIndex: number | null) => void;
  /** Map of location ID → Location for accessibility analysis */
  locationMap?: Map<string, Location>;
  /** Whether traveler has mobility needs */
  mobilityNeeds?: boolean;
};

export const TripConfidenceDashboard = memo(function TripConfidenceDashboard({
  itinerary,
  conflicts,
  tripStartDate,
  tripCities,
  onClose,
  onSelectDay,
  selectedDay,
  onDayExpand,
  locationMap,
  mobilityNeeds,
}: TripConfidenceDashboardProps) {
  const health = useMemo(
    () => calculateTripHealth(itinerary, conflicts),
    [itinerary, conflicts],
  );

  const accessibility = useMemo(() => {
    if (!mobilityNeeds || !locationMap) return null;
    return analyzeAccessibility(itinerary, locationMap);
  }, [mobilityNeeds, locationMap, itinerary]);

  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    () => loadChecklist(),
  );
  const [expandedDay, setExpandedDay] = useState<number | null>(selectedDay ?? null);
  const [copiedToast, setCopiedToast] = useState(false);

  // Sync expandedDay when DaySelector changes
  useEffect(() => {
    if (selectedDay != null) {
      setExpandedDay(selectedDay);
    }
  }, [selectedDay]);

  const handleToggleDay = useCallback((dayIndex: number) => {
    const next = expandedDay === dayIndex ? null : dayIndex;
    setExpandedDay(next);
    if (next != null) {
      onDayExpand?.(next);
    }
  }, [expandedDay, onDayExpand]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Batch-fetch all place activity locations for click-to-expand
  const allPlaceActivities = useMemo(
    () =>
      itinerary.days.flatMap((day) =>
        day.activities.filter(
          (a): a is Extract<ItineraryActivity, { kind: "place" }> =>
            a.kind === "place",
        ),
      ),
    [itinerary],
  );
  const { getLocation } = useActivityLocations(allPlaceActivities);

  const handleActivityClick = useCallback(
    (activityId: string) => {
      const location = getLocation(activityId);
      if (location) setSelectedLocation(location);
    },
    [getLocation],
  );

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
    const date = tripStartDate ?? new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `koku-trip-${cities}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [itinerary, tripStartDate, tripCities]);

  const level = getHealthLevel(health.overall);

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: durationBase, ease: easeReveal }}
      className="space-y-6 pb-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif italic text-xl text-foreground">Trip Overview</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-stone hover:text-foreground hover:bg-surface transition"
          aria-label="Close overview"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Pre-trip Checklist */}
      {health.checklist.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone">
            Before You Go
          </h3>
          <div className="rounded-xl border border-border bg-surface/30 divide-y divide-border/50">
            {health.checklist.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                checked={checkedItems.has(item.id)}
                onToggle={() => toggleChecked(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Overall Health */}
      <div className="rounded-xl border border-border bg-surface/40 p-4">
        <div className="flex items-center gap-3">
          <HealthDot level={level} size="lg" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {level === "good"
                ? "Trip looks solid"
                : level === "fair"
                  ? "A few things to check"
                  : "Some issues to fix"}
            </p>
            <p className="text-xs text-stone">
              {health.totalIssues === 0
                ? "No issues detected across all days."
                : `${health.totalIssues} issue${health.totalIssues === 1 ? "" : "s"} across ${itinerary.days.length} days`}
            </p>
          </div>
          <div className="ml-auto font-mono text-2xl font-bold text-foreground">
            {health.overall}
          </div>
        </div>

        {/* Per-day mini bars */}
        <div className="mt-4 flex gap-1">
          {health.days.map((day) => {
            const dayLevel = getHealthLevel(day.score);
            return (
              <button
                key={day.dayId}
                onClick={() => handleToggleDay(day.dayIndex)}
                className="flex-1 group"
                title={`Day ${day.dayIndex + 1}: ${day.score}/100`}
              >
                <div
                  className={`h-2 rounded-full transition-all group-hover:h-3 ${
                    dayLevel === "good"
                      ? "bg-sage"
                      : dayLevel === "fair"
                        ? "bg-warning"
                        : "bg-error"
                  }`}
                />
                <p className="mt-1 text-[9px] text-stone text-center font-mono">
                  {day.dayIndex + 1}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Days */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone">
          Days
        </h3>
        {health.days.map((day) => (
          <DayOverviewCard
            key={day.dayId}
            day={day}
            itineraryDay={itinerary.days[day.dayIndex]}
            tripStartDate={tripStartDate}
            isExpanded={expandedDay === day.dayIndex}
            onToggle={() => handleToggleDay(day.dayIndex)}
            onGoToDay={() => {
              onSelectDay?.(day.dayIndex);
              onClose();
            }}
            getLocation={getLocation}
            onActivityClick={handleActivityClick}
          />
        ))}
      </div>

      {/* Accessibility — only when traveler has mobility needs */}
      {accessibility && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone">
            Accessibility
          </h3>
          <div className="rounded-xl border border-border bg-surface/30 p-3 space-y-2">
            <p className="text-sm text-foreground">
              {accessibility.accessibleCount} of {accessibility.totalActivities} activities
              have confirmed wheelchair access
            </p>
            {accessibility.unknownCount > 0 && (
              <p className="text-xs text-stone">
                {accessibility.unknownCount} unconfirmed — check before you go.
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
            <div className="rounded-xl border border-border bg-surface/30 divide-y divide-border/50">
              {accessibility.checklist.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  checked={checkedItems.has(item.id)}
                  onToggle={() => toggleChecked(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Export Actions */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone">
          Export
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface/50 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface transition"
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
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface/50 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface/50 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>
    </motion.div>

    {/* Location detail slide-in */}
    <AnimatePresence>
      {selectedLocation && (
        <LocationExpanded
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
        />
      )}
    </AnimatePresence>
    </>
  );
});

function formatCityName(cityId: string): string {
  for (const region of REGIONS) {
    const city = region.cities.find((c) => c.id === cityId);
    if (city) return city.name;
  }
  return cityId.charAt(0).toUpperCase() + cityId.slice(1);
}

function formatDayDate(tripStartDate: string | undefined, dayIndex: number): string | undefined {
  if (!tripStartDate) return undefined;
  try {
    const parts = tripStartDate.split("-").map(Number);
    const y = parts[0], m = parts[1], d = parts[2];
    if (y == null || m == null || d == null) return undefined;
    const date = new Date(y, m - 1, d + dayIndex);
    if (isNaN(date.getTime())) return undefined;
    const monthDay = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
    return `${monthDay}, ${weekday}`;
  } catch {
    return undefined;
  }
}

function DayOverviewCard({
  day,
  itineraryDay,
  tripStartDate,
  isExpanded,
  onToggle,
  onGoToDay,
  getLocation,
  onActivityClick,
}: {
  day: DayHealth;
  itineraryDay?: ItineraryDay;
  tripStartDate?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onGoToDay: () => void;
  getLocation?: (activityId: string) => Location | null;
  onActivityClick?: (activityId: string) => void;
}) {
  const level = getHealthLevel(day.score);
  const errorCount = day.issues.filter((i) => i.severity === "error").length;
  const warningCount = day.issues.filter((i) => i.severity === "warning").length;
  const infoCount = day.issues.filter((i) => i.severity === "info").length;
  const issueCount = errorCount + warningCount + infoCount;

  const dateStr = formatDayDate(tripStartDate, day.dayIndex);
  const cityName = itineraryDay?.cityId ? formatCityName(itineraryDay.cityId) : undefined;
  const placeActivities = itineraryDay?.activities.filter((a) => a.kind === "place") ?? [];

  // Calculate total hours at locations
  const totalMinutes = placeActivities.reduce((sum, a) => {
    if (a.kind === "place" && a.schedule) {
      const [ah, am] = a.schedule.arrivalTime.split(":").map(Number);
      const [dh, dm] = a.schedule.departureTime.split(":").map(Number);
      return sum + (dh * 60 + dm) - (ah * 60 + am);
    }
    if (a.kind === "place" && a.durationMin) {
      return sum + a.durationMin;
    }
    return sum;
  }, 0);
  const totalHours = totalMinutes / 60;
  const hoursDisplay = totalHours >= 1
    ? `${totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}h`
    : totalMinutes > 0
      ? `${totalMinutes}m`
      : null;

  return (
    <div className="rounded-xl border border-border bg-surface/30 overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface/50 transition"
      >
        <HealthDot level={level} size="sm" />
        <div className="flex-1 min-w-0 flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-sm font-medium text-foreground shrink-0">
            {dateStr || `Day ${day.dayIndex + 1}`}
          </span>
          {cityName && (
            <span className="text-xs text-stone truncate">
              {cityName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0 whitespace-nowrap">
          {placeActivities.length > 0 && (
            <span className="text-foreground-secondary">
              {placeActivities.length} {placeActivities.length === 1 ? "place" : "places"}
            </span>
          )}
          {hoursDisplay && (
            <>
              <span className="text-stone">·</span>
              <span className="text-stone">{hoursDisplay}</span>
            </>
          )}
        </div>
        <svg
          className={`h-3.5 w-3.5 text-stone transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: durationFast, ease: easeReveal }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 px-3 py-2 space-y-2">
              {/* Activity list */}
              {placeActivities.length > 0 && (
                <div className="space-y-0.5">
                  {placeActivities.map((activity, i) => {
                    const hasLocation = !!getLocation?.(activity.id);
                    return (
                      <button
                        key={activity.id}
                        onClick={(e) => {
                          if (!hasLocation) return;
                          e.stopPropagation();
                          onActivityClick?.(activity.id);
                        }}
                        disabled={!hasLocation}
                        className={`group/row flex items-center gap-2 text-xs w-full text-left rounded-lg py-0.5 -mx-1 px-1 transition ${
                          hasLocation
                            ? "cursor-pointer hover:bg-surface/60 active:bg-surface/80"
                            : "cursor-default"
                        }`}
                      >
                        <span className="font-mono text-[10px] text-stone w-4 text-right shrink-0">
                          {i + 1}
                        </span>
                        <span className={`truncate transition-colors ${hasLocation ? "text-foreground group-hover/row:text-brand-primary" : "text-stone"}`}>
                          {activity.title}
                        </span>
                        {activity.kind === "place" && activity.mealType && (
                          <span className="text-[10px] text-stone capitalize shrink-0">
                            {activity.mealType}
                          </span>
                        )}
                        {hasLocation && (
                          <svg className="h-3 w-3 text-stone group-hover/row:text-foreground-secondary shrink-0 ml-auto transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Issues */}
              {issueCount > 0 && (
                <div className="space-y-1">
                  {day.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span
                        className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          issue.severity === "error"
                            ? "bg-error"
                            : issue.severity === "warning"
                              ? "bg-warning"
                              : "bg-stone"
                        }`}
                      />
                      <div>
                        {issue.activityTitle && (
                          <span className="font-medium text-foreground-secondary">
                            {issue.activityTitle}:{" "}
                          </span>
                        )}
                        <span className="text-stone">{issue.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={onGoToDay}
                className="text-[11px] font-medium text-brand-primary hover:underline"
              >
                Go to Day {day.dayIndex + 1}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChecklistRow({
  item,
  checked,
  onToggle,
}: {
  item: ChecklistItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface/30 transition">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary/20 accent-brand-primary"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${checked ? "text-stone line-through" : "text-foreground"}`}>
          {item.label}
        </p>
        <p className="text-[10px] text-stone font-mono">
          Day {item.dayIndex + 1}
        </p>
      </div>
      <CategoryIcon category={item.category} />
    </label>
  );
}

function HealthDot({
  level,
  size = "sm",
}: {
  level: "good" | "fair" | "poor";
  size?: "sm" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-4 w-4" : "h-2.5 w-2.5";
  const colorClass =
    level === "good"
      ? "bg-sage"
      : level === "fair"
        ? "bg-warning"
        : "bg-error";

  return <span className={`${sizeClass} ${colorClass} rounded-full shrink-0`} />;
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
