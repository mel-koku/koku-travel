"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronDown,
  Copy,
  Check,
  Download,
  Printer,
  ChevronRight,
} from "lucide-react";
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
import { useActivityLocations } from "@/hooks/useActivityLocations";
import { cn } from "@/lib/cn";
import { getActivityCoordinates } from "@/lib/itineraryCoordinates";
import { RouteOverviewB } from "./RouteOverviewB";
import { estimateTripCost, formatCostRange, formatYen } from "@/lib/itinerary/costEstimator";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type TripConfidenceDashboardBProps = {
  itinerary: Itinerary;
  conflicts: ItineraryConflict[];
  tripStartDate?: string;
  tripCities?: string[];
  onClose: () => void;
  onSelectDay?: (dayIndex: number) => void;
  selectedDay?: number;
  onDayExpand?: (dayIndex: number | null) => void;
  locationMap?: Map<string, Location>;
  mobilityNeeds?: boolean;
  budgetTotal?: number;
};

export const TripConfidenceDashboardB = memo(function TripConfidenceDashboardB({
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
  budgetTotal,
}: TripConfidenceDashboardBProps) {
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

  useEffect(() => {
    if (selectedDay != null) {
      setExpandedDay(selectedDay);
    }
  }, [selectedDay]);

  const handleToggleDay = useCallback(
    (dayIndex: number) => {
      const next = expandedDay === dayIndex ? null : dayIndex;
      setExpandedDay(next);
      if (next != null) onDayExpand?.(next);
    },
    [expandedDay, onDayExpand],
  );

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
  const { getLocation, locationsMap } = useActivityLocations(allPlaceActivities);

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

  const tripBudget = useMemo(
    () => estimateTripCost(itinerary.days, locationsMap),
    [itinerary.days, locationsMap],
  );

  const budgetStatus = useMemo(() => {
    if (!tripBudget || !budgetTotal) return null;
    const midEstimate = (tripBudget.min + tripBudget.max) / 2;
    return midEstimate <= budgetTotal ? "within" : "over";
  }, [tripBudget, budgetTotal]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.5, ease: bEase }}
      className="space-y-5 pb-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-bold tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          Trip Health
        </h2>
        <button
          onClick={onClose}
          className="rounded-xl p-1.5 transition-colors duration-200 hover:bg-[var(--surface)]"
          style={{ color: "var(--muted-foreground)" }}
          aria-label="Close overview"
          title="Close overview"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Overall Score Card */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: "var(--card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center gap-4">
          <HealthIndicator level={level} size="lg" />
          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {level === "good"
                ? "Trip looks solid"
                : level === "fair"
                  ? "A few things to check"
                  : "Some issues to fix"}
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {health.totalIssues === 0
                ? "No issues detected across all days."
                : `${health.totalIssues} issue${health.totalIssues === 1 ? "" : "s"} across ${itinerary.days.length} days`}
            </p>
          </div>
          <div
            className="text-3xl font-bold tabular-nums"
            style={{ color: "var(--foreground)" }}
          >
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
                className="group flex-1"
                title={`Day ${day.dayIndex + 1}: ${day.score}/100`}
              >
                <div
                  className="h-2 rounded-full transition-all duration-200 group-hover:h-3"
                  style={{
                    backgroundColor:
                      dayLevel === "good"
                        ? "var(--success)"
                        : dayLevel === "fair"
                          ? "var(--warning)"
                          : "var(--error)",
                  }}
                />
                <p
                  className="mt-1 text-center text-[9px] tabular-nums"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {day.dayIndex + 1}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pre-trip Checklist */}
      {health.checklist.length > 0 && (
        <div className="space-y-2">
          <h3
            className="text-xs font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Before You Go
          </h3>
          <div
            className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {health.checklist.map((item) => (
              <ChecklistRowB
                key={item.id}
                item={item}
                checked={checkedItems.has(item.id)}
                onToggle={() => toggleChecked(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Estimated Cost */}
      {tripBudget && (
        <div className="space-y-2">
          <h3
            className="text-xs font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Estimated Cost
          </h3>
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow-card)" }}
          >
            <p className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
              {formatCostRange(tripBudget)}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
              Activity & transit costs · excluding accommodation
            </p>
            {budgetTotal != null && budgetStatus && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: budgetStatus === "within" ? "var(--success)" : "var(--warning)" }}>
                    {budgetStatus === "within" ? "Within budget" : "Over budget"}
                  </span>
                  <span style={{ color: "var(--muted-foreground)" }}>Budget: {formatYen(budgetTotal)}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--border)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, ((tripBudget.min + tripBudget.max) / 2 / budgetTotal) * 100)}%`,
                      backgroundColor: budgetStatus === "within" ? "var(--success)" : "var(--warning)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Days */}
      <div className="space-y-2">
        <h3
          className="text-xs font-semibold uppercase tracking-[0.15em]"
          style={{ color: "var(--muted-foreground)" }}
        >
          Days
        </h3>
        <div className="space-y-2">
          {health.days.map((day) => (
            <DayOverviewCardB
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
            />
          ))}
        </div>
      </div>

      {/* Accessibility */}
      {accessibility && (
        <div className="space-y-2">
          <h3
            className="text-xs font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Accessibility
          </h3>
          <div
            className="rounded-2xl p-4 space-y-2"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--foreground)" }}>
              {accessibility.accessibleCount} of {accessibility.totalActivities} activities
              have confirmed wheelchair access
            </p>
            {accessibility.unknownCount > 0 && (
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {accessibility.unknownCount} unconfirmed — check before you go.
              </p>
            )}
            {accessibility.issues.length > 0 && (
              <div className="mt-2 space-y-1">
                {accessibility.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span
                      className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: "var(--warning)" }}
                    />
                    <span style={{ color: "var(--muted-foreground)" }}>{issue.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Actions */}
      <div className="space-y-2">
        <h3
          className="text-xs font-semibold uppercase tracking-[0.15em]"
          style={{ color: "var(--muted-foreground)" }}
        >
          Export
        </h3>
        <div className="flex flex-wrap gap-2">
          <ExportButton onClick={handleCopy}>
            {copiedToast ? (
              <>
                <Check className="h-4 w-4" style={{ color: "var(--success)" }} />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </ExportButton>
          <ExportButton onClick={handleCSV}>
            <Download className="h-4 w-4" />
            CSV
          </ExportButton>
          <ExportButton onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </ExportButton>
        </div>
      </div>
    </motion.div>
  );
});

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ExportButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-[var(--surface)] active:scale-[0.98]"
      style={{
        borderColor: "var(--border)",
        color: "var(--foreground)",
      }}
    >
      {children}
    </button>
  );
}

function HealthIndicator({
  level,
  size = "sm",
}: {
  level: "good" | "fair" | "poor";
  size?: "sm" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-4 w-4" : "h-2.5 w-2.5";
  const color =
    level === "good"
      ? "var(--success)"
      : level === "fair"
        ? "var(--warning)"
        : "var(--error)";

  return (
    <span
      className={`${sizeClass} rounded-full shrink-0`}
      style={{ backgroundColor: color }}
    />
  );
}

function formatCityName(cityId: string): string {
  for (const region of REGIONS) {
    const city = region.cities.find((c) => c.id === cityId);
    if (city) return city.name;
  }
  return cityId.charAt(0).toUpperCase() + cityId.slice(1);
}

function formatDayDate(
  tripStartDate: string | undefined,
  dayIndex: number,
): string | undefined {
  if (!tripStartDate) return undefined;
  try {
    const parts = tripStartDate.split("-").map(Number);
    const y = parts[0],
      m = parts[1],
      d = parts[2];
    if (y == null || m == null || d == null) return undefined;
    const date = new Date(y, m - 1, d + dayIndex);
    if (isNaN(date.getTime())) return undefined;
    const monthDay = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(date);
    const weekday = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
    }).format(date);
    return `${monthDay}, ${weekday}`;
  } catch {
    return undefined;
  }
}

function DayOverviewCardB({
  day,
  itineraryDay,
  tripStartDate,
  isExpanded,
  onToggle,
  onGoToDay,
  getLocation,
}: {
  day: DayHealth;
  itineraryDay?: ItineraryDay;
  tripStartDate?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onGoToDay: () => void;
  getLocation?: (activityId: string) => Location | null;
}) {
  const level = getHealthLevel(day.score);
  const issueCount = day.issues.length;
  const dateStr = formatDayDate(tripStartDate, day.dayIndex);
  const cityName = itineraryDay?.cityId
    ? formatCityName(itineraryDay.cityId)
    : undefined;
  const placeActivities = useMemo(
    () =>
      (itineraryDay?.activities ?? []).filter(
        (a): a is Extract<ItineraryActivity, { kind: "place" }> =>
          a.kind === "place",
      ),
    [itineraryDay?.activities],
  );

  // Build lookup maps for RouteOverviewB
  const { pointLookup, travelSegmentLookup, placeIndexLookup } = useMemo(() => {
    const points = new Map<string, { id: string; lat: number; lng: number }>();
    const travel = new Map<string, {
      id: string;
      from: Extract<ItineraryActivity, { kind: "place" }>;
      to: Extract<ItineraryActivity, { kind: "place" }>;
      mode: string;
      durationMinutes?: number;
      distanceMeters?: number;
      isFallback?: boolean;
    }>();
    const indices = new Map<string, number>();

    placeActivities.forEach((activity, i) => {
      indices.set(activity.id, i + 1);
      const coords = getActivityCoordinates(activity);
      if (coords) {
        points.set(activity.id, { id: activity.id, ...coords });
      }
      if (i > 0 && activity.travelFromPrevious) {
        const prev = placeActivities[i - 1];
        if (prev) {
          travel.set(activity.id, {
            id: `${prev.id}-${activity.id}`,
            from: prev,
            to: activity,
            mode: activity.travelFromPrevious.mode,
            durationMinutes: activity.travelFromPrevious.durationMinutes,
            distanceMeters: activity.travelFromPrevious.distanceMeters,
            isFallback: activity.travelFromPrevious.isEstimated,
          });
        }
      }
    });

    return { pointLookup: points, travelSegmentLookup: travel, placeIndexLookup: indices };
  }, [placeActivities]);

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors duration-200 hover:bg-[var(--surface)]"
      >
        <HealthIndicator level={level} size="sm" />
        <div className="min-w-0 flex-1 flex items-baseline gap-1.5 whitespace-nowrap">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            {dateStr || `Day ${day.dayIndex + 1}`}
          </span>
          {cityName && (
            <span
              className="truncate text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {cityName}
            </span>
          )}
        </div>
        {placeActivities.length > 0 && (
          <span
            className="shrink-0 text-[11px] tabular-nums"
            style={{ color: "var(--muted-foreground)" }}
          >
            {placeActivities.length} {placeActivities.length === 1 ? "place" : "places"}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            isExpanded && "rotate-180",
          )}
          style={{ color: "var(--muted-foreground)" }}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: bEase }}
            className="overflow-hidden"
          >
            <div
              className="border-t px-4 py-3 space-y-2"
              style={{ borderColor: "var(--border)" }}
            >
              {/* Activity list */}
              {placeActivities.length > 0 && (
                <div className="space-y-0.5">
                  {placeActivities.map((activity, i) => {
                    const hasLocation = !!getLocation?.(activity.id);
                    return (
                      <div
                        key={activity.id}
                        className={cn(
                          "flex items-center gap-2 rounded-lg py-1 px-1 text-xs",
                          hasLocation && "cursor-pointer hover:bg-[var(--surface)]",
                        )}
                      >
                        <span
                          className="w-4 shrink-0 text-right text-[10px] tabular-nums"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {i + 1}
                        </span>
                        <span
                          className="truncate"
                          style={{
                            color: hasLocation
                              ? "var(--foreground)"
                              : "var(--muted-foreground)",
                          }}
                        >
                          {activity.title}
                        </span>
                        {activity.kind === "place" && activity.mealType && (
                          <span
                            className="shrink-0 text-[10px] capitalize"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {activity.mealType}
                          </span>
                        )}
                        {hasLocation && (
                          <ChevronRight
                            className="ml-auto h-3 w-3 shrink-0"
                            style={{ color: "var(--muted-foreground)" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Route Overview */}
              {placeActivities.length > 1 && (
                <RouteOverviewB
                  placeActivities={placeActivities}
                  pointLookup={pointLookup}
                  travelSegmentLookup={travelSegmentLookup}
                  placeIndexLookup={placeIndexLookup}
                />
              )}

              {/* Issues */}
              {issueCount > 0 && (
                <div className="space-y-1">
                  {day.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span
                        className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            issue.severity === "error"
                              ? "var(--error)"
                              : issue.severity === "warning"
                                ? "var(--warning)"
                                : "var(--muted-foreground)",
                        }}
                      />
                      <div>
                        {issue.activityTitle && (
                          <span
                            className="font-medium"
                            style={{ color: "var(--foreground)" }}
                          >
                            {issue.activityTitle}:{" "}
                          </span>
                        )}
                        <span style={{ color: "var(--muted-foreground)" }}>
                          {issue.message}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={onGoToDay}
                className="text-[11px] font-medium transition-colors duration-200 hover:underline hover:text-[var(--foreground)]"
                style={{ color: "var(--primary)" }}
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

function ChecklistRowB({
  item,
  checked,
  onToggle,
}: {
  item: ChecklistItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-200 hover:bg-[var(--surface)]"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded"
        style={{ accentColor: "var(--primary)" }}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn("text-sm", checked && "line-through")}
          style={{
            color: checked ? "var(--muted-foreground)" : "var(--foreground)",
          }}
        >
          {item.label}
        </p>
        <p
          className="text-[10px] tabular-nums"
          style={{ color: "var(--muted-foreground)" }}
        >
          Day {item.dayIndex + 1}
        </p>
      </div>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Persistence helpers                                                */
/* ------------------------------------------------------------------ */

import { CONFIDENCE_CHECKLIST_STORAGE_KEY } from "@/lib/constants/storage";
import { getLocal, setLocal } from "@/lib/storageHelpers";

function loadChecklist(): Set<string> {
  const stored = getLocal<string[]>(CONFIDENCE_CHECKLIST_STORAGE_KEY);
  return stored ? new Set(stored) : new Set();
}

function saveChecklist(checked: Set<string>) {
  setLocal(CONFIDENCE_CHECKLIST_STORAGE_KEY, [...checked]);
}
